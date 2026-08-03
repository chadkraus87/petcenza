-- ============================================================================
-- Pet invitations.
--
-- Link-based rather than email-based: the owner creates an invitation and gets
-- a URL to send however they like. That avoids standing up a mail provider, and
-- the token is the capability.
--
-- The token is NEVER readable by the invitee before acceptance — redemption
-- goes through accept_pet_invitation(), a SECURITY DEFINER function that
-- validates and creates the share in one step. Invitations are single-use and
-- expire.
--
-- If invited_email is set, the accepting account's email must match, so a
-- leaked link can't be redeemed by whoever finds it. Leave it null for an
-- "anyone with the link" invite.
-- ============================================================================

create table public.pet_invitations (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  role public.share_role not null default 'viewer',
  invited_email text,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  -- An invitation can never grant ownership; ownership transfer is a separate concern.
  constraint invitation_role_not_owner check (role <> 'owner')
);
create index pet_invitations_pet_idx on public.pet_invitations (pet_id);

alter table public.pet_invitations enable row level security;
alter table public.pet_invitations force row level security;

-- Only the pet owner can see or manage invitations. Invitees never read this
-- table — they redeem via the RPC below.
create policy pet_invitations_select on public.pet_invitations for select to authenticated
  using (public.is_pet_owner(pet_id));
create policy pet_invitations_insert on public.pet_invitations for insert to authenticated
  with check (public.is_pet_owner(pet_id) and invited_by = (select auth.uid()));
create policy pet_invitations_update on public.pet_invitations for update to authenticated
  using (public.is_pet_owner(pet_id)) with check (public.is_pet_owner(pet_id));
create policy pet_invitations_delete on public.pet_invitations for delete to authenticated
  using (public.is_pet_owner(pet_id));

-- ============================================================================
-- Redemption. SECURITY DEFINER because the invitee has no read access to the
-- invitation row (by design) and no write access to pet_shares for a pet they
-- cannot yet see. Every branch returns a plain text code so the UI can explain
-- what went wrong without leaking whether a token merely exists.
-- ============================================================================
create or replace function public.accept_pet_invitation(p_token uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  inv public.pet_invitations%rowtype;
  uid uuid := (select auth.uid());
  uemail text;
begin
  if uid is null then return 'not_authenticated'; end if;

  select * into inv from public.pet_invitations where token = p_token;
  if not found then return 'invalid'; end if;
  if inv.revoked_at is not null then return 'revoked'; end if;
  if inv.accepted_at is not null then return 'already_used'; end if;
  if inv.expires_at <= now() then return 'expired'; end if;

  -- When the invite is pinned to an address, the redeeming account must match it.
  if inv.invited_email is not null then
    select email into uemail from auth.users where id = uid;
    if lower(coalesce(uemail,'')) <> lower(inv.invited_email) then return 'wrong_account'; end if;
  end if;

  -- The owner accepting their own invite is a no-op, not an error.
  if exists (select 1 from public.pets where id = inv.pet_id and user_id = uid) then
    return 'already_owner';
  end if;

  insert into public.pet_shares (pet_id, user_id, role, invited_by)
  values (inv.pet_id, uid, inv.role, inv.invited_by)
  on conflict (pet_id, user_id) do update set role = excluded.role;

  update public.pet_invitations
     set accepted_at = now(), accepted_by = uid
   where id = inv.id;

  return 'ok';
end $$;

revoke execute on function public.accept_pet_invitation(uuid) from public, anon;
grant execute on function public.accept_pet_invitation(uuid) to authenticated;

-- ============================================================================
-- Member listing. pet_shares stores user ids; the UI needs names/emails, but
-- profiles is readable only by its own owner. This exposes the minimum needed
-- for the sharing screen, and only to people who can already access the pet.
-- ============================================================================
create or replace function public.pet_members(p_pet_id uuid)
returns table (user_id uuid, display_name text, email text, role public.share_role,
               expires_at timestamptz, is_owner boolean)
language sql stable security definer set search_path = public as $$
  select p.user_id,
         pr.display_name,
         u.email::text,
         'owner'::public.share_role,
         null::timestamptz,
         true
    from public.pets p
    join public.profiles pr on pr.id = p.user_id
    join auth.users u on u.id = p.user_id
   where p.id = p_pet_id and public.can_access_pet(p_pet_id, 'viewer')
  union all
  select s.user_id, pr.display_name, u.email::text, s.role, s.expires_at, false
    from public.pet_shares s
    join public.profiles pr on pr.id = s.user_id
    join auth.users u on u.id = s.user_id
   where s.pet_id = p_pet_id and public.can_access_pet(p_pet_id, 'viewer')
$$;

revoke execute on function public.pet_members(uuid) from public, anon;
grant execute on function public.pet_members(uuid) to authenticated;
