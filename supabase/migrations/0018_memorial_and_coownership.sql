-- ============================================================================
-- Memorial state + co-ownership.
--
-- MEMORIAL: a pet passing away is not the same as archiving. Records should be
-- kept (people want them), but the app must stop behaving as if the animal is
-- still under care — a "Refill Carprofen" notification for a pet that died last
-- week is a genuinely distressing bug. Setting deceased_on therefore cancels
-- pending reminders and stops auto-reminders from being generated.
--
-- CO-OWNERSHIP: pet_shares.role already has an 'owner' value that nothing used.
-- Granting it makes someone a co-owner — they can manage sharing, invitations
-- and vet links exactly like the owner. Two capabilities stay with the PRIMARY
-- owner (pets.user_id) alone: deleting the pet, and transferring ownership.
-- Both are irreversible, and a co-owner ejecting the person who created the
-- record is not a failure mode worth allowing.
-- ============================================================================

alter table public.pets add column if not exists deceased_on date;

-- Primary owner only — the narrow check, for irreversible actions.
create or replace function public.is_primary_pet_owner(p_pet_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.pets where id = p_pet_id and user_id = (select auth.uid())
  )
$$;

-- Broad "owner-level" check: primary owner OR co-owner. Everything that used
-- is_pet_owner (share management, invitations, vet links) now includes co-owners.
create or replace function public.is_pet_owner(p_pet_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.pets where id = p_pet_id and user_id = (select auth.uid())
  ) or exists (
    select 1 from public.pet_shares
     where pet_id = p_pet_id and user_id = (select auth.uid())
       and role = 'owner' and (expires_at is null or expires_at > now())
  )
$$;

revoke execute on function public.is_primary_pet_owner(uuid) from public, anon;
grant execute on function public.is_primary_pet_owner(uuid) to authenticated;

-- Only the primary owner may create, change, or remove a co-owner. Without this
-- a co-owner could promote allies or eject their fellow co-owners.
create or replace function public.guard_owner_role()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if (select auth.uid()) is null then return coalesce(new, old); end if;   -- service-role context

  if tg_op = 'DELETE' then
    -- Anyone may remove their own share (leaving); otherwise only the primary
    -- owner may remove a co-owner.
    if old.role = 'owner'
       and old.user_id <> (select auth.uid())
       and not public.is_primary_pet_owner(old.pet_id) then
      raise exception 'only the primary owner can remove a co-owner'
        using errcode = 'insufficient_privilege';
    end if;
    return old;
  end if;

  if new.role = 'owner' and not public.is_primary_pet_owner(new.pet_id) then
    raise exception 'only the primary owner can grant co-ownership'
      using errcode = 'insufficient_privilege';
  end if;
  if tg_op = 'UPDATE' and old.role = 'owner' and not public.is_primary_pet_owner(old.pet_id) then
    raise exception 'only the primary owner can change a co-owner''s role'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;

create trigger pet_shares_owner_guard
  before insert or update or delete on public.pet_shares
  for each row execute function public.guard_owner_role();

-- Transfer stays with the primary owner: swap the broad check for the narrow one.
create or replace function public.transfer_pet_ownership(p_pet_id uuid, p_to_user uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then return 'not_authenticated'; end if;
  if not public.is_primary_pet_owner(p_pet_id) then return 'not_owner'; end if;
  if p_to_user = uid then return 'already_owner'; end if;
  if not exists (
    select 1 from public.pet_shares
     where pet_id = p_pet_id and user_id = p_to_user
       and (expires_at is null or expires_at > now())
  ) then
    return 'not_a_member';
  end if;

  update public.pets set user_id = p_to_user where id = p_pet_id;
  delete from public.pet_shares where pet_id = p_pet_id and user_id = p_to_user;

  insert into public.pet_shares (pet_id, user_id, role, invited_by)
  values (p_pet_id, uid, 'editor', p_to_user)
  on conflict (pet_id, user_id) do update set role = 'editor', expires_at = null;

  insert into public.activity_logs (user_id, action, entity, entity_id, metadata)
  values (uid, 'pet.ownership_transferred', 'pets', p_pet_id,
          jsonb_build_object('to_user', p_to_user));

  return 'ok';
end $$;

-- ============================================================================
-- Memorial handling
-- ============================================================================

-- Stop nagging about a pet that has died.
create or replace function public.clear_reminders_on_passing()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.deceased_on is not null and old.deceased_on is null then
    delete from public.reminders where pet_id = new.id and completed_at is null;
    insert into public.activity_logs (user_id, action, entity, entity_id, metadata)
    values (new.user_id, 'pet.marked_deceased', 'pets', new.id,
            jsonb_build_object('deceased_on', new.deceased_on));
  end if;
  return new;
end $$;

create trigger pets_clear_reminders_on_passing
  after update of deceased_on on public.pets
  for each row execute function public.clear_reminders_on_passing();

-- ...and don't generate new ones from refill/booster dates either.
create or replace function public.sync_auto_reminder(
  p_user_id uuid, p_pet_id uuid, p_table text, p_source_id uuid,
  p_kind public.reminder_kind, p_title text, p_on date, p_lead_days int default 0
) returns void
language plpgsql security definer set search_path = public as $$
declare tz text; target timestamptz; gone date;
begin
  select deceased_on into gone from public.pets where id = p_pet_id;

  if p_on is null or gone is not null then
    delete from public.reminders
     where source_table = p_table and source_id = p_source_id and completed_at is null;
    return;
  end if;

  select coalesce(timezone, 'UTC') into tz from public.profiles where id = p_user_id;
  target := ((p_on - p_lead_days)::text || ' 09:00')::timestamp at time zone coalesce(tz, 'UTC');

  insert into public.reminders (user_id, pet_id, kind, title, due_at, recurrence, source_table, source_id)
  values (p_user_id, p_pet_id, p_kind, p_title, target, 'none', p_table, p_source_id)
  on conflict (source_table, source_id) where source_table is not null and source_id is not null
  do update set title = excluded.title, due_at = excluded.due_at, pet_id = excluded.pet_id
  where public.reminders.completed_at is null;
end $$;

revoke execute on function public.sync_auto_reminder(uuid, uuid, text, uuid, public.reminder_kind, text, date, int)
  from public, anon, authenticated;
revoke execute on function public.clear_reminders_on_passing() from public, anon, authenticated;
revoke execute on function public.guard_owner_role() from public, anon, authenticated;
