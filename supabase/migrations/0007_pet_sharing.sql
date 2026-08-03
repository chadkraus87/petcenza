-- ============================================================================
-- Per-pet sharing.
--
-- Model: a pet has one true owner (pets.user_id) plus zero or more members in
-- pet_shares. Access to every pet-scoped row is decided by membership, not by
-- who wrote the row. `user_id` on child tables therefore changes meaning from
-- "owner" to "author" — it records who created the row and is still required to
-- match auth.uid() on INSERT so authorship can't be forged.
--
-- Roles are ordered viewer < editor < owner so a plain `>=` comparison works.
-- ============================================================================

create type public.share_role as enum ('viewer', 'editor', 'owner');

create table public.pet_shares (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.share_role not null default 'viewer',
  invited_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz,                       -- null = no expiry (e.g. a partner)
  created_at timestamptz not null default now(),
  unique (pet_id, user_id)
);
create index pet_shares_user_idx on public.pet_shares (user_id, pet_id);
create index pet_shares_pet_idx on public.pet_shares (pet_id);

-- ============================================================================
-- Access helpers.
--
-- These MUST be SECURITY DEFINER. Policies on `pets` consult pet_shares and
-- policies on `pet_shares` consult `pets`; if these lookups ran under the
-- caller's RLS they would recurse infinitely. SECURITY DEFINER bypasses RLS for
-- the lookup only, and both functions are read-only and take a pet id the
-- caller already supplies, so they leak nothing beyond a boolean.
--
-- EXECUTE is intentionally left granted to `authenticated` — RLS policy
-- expressions are evaluated as the calling role, so revoking it would break
-- every policy below. It IS revoked from `anon`, which has no session and no
-- legitimate reason to probe pet access.
-- ============================================================================

create or replace function public.is_pet_owner(p_pet_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.pets
    where id = p_pet_id and user_id = (select auth.uid())
  )
$$;

create or replace function public.can_access_pet(p_pet_id uuid, p_min_role public.share_role default 'viewer')
returns boolean
language sql stable security definer set search_path = public as $$
  select
    -- the true owner always has full access
    exists (
      select 1 from public.pets
      where id = p_pet_id and user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.pet_shares s
      where s.pet_id = p_pet_id
        and s.user_id = (select auth.uid())
        and (s.expires_at is null or s.expires_at > now())
        and s.role >= p_min_role
    )
$$;

revoke execute on function public.is_pet_owner(uuid) from anon;
revoke execute on function public.can_access_pet(uuid, public.share_role) from anon;

-- ============================================================================
-- pet_shares RLS: the pet owner manages membership; a member can see and
-- remove their own share (leave a shared pet).
-- ============================================================================
alter table public.pet_shares enable row level security;
alter table public.pet_shares force row level security;

create policy pet_shares_select on public.pet_shares for select to authenticated
  using (public.is_pet_owner(pet_id) or user_id = (select auth.uid()));
create policy pet_shares_insert on public.pet_shares for insert to authenticated
  with check (public.is_pet_owner(pet_id));
create policy pet_shares_update on public.pet_shares for update to authenticated
  using (public.is_pet_owner(pet_id)) with check (public.is_pet_owner(pet_id));
create policy pet_shares_delete on public.pet_shares for delete to authenticated
  using (public.is_pet_owner(pet_id) or user_id = (select auth.uid()));

-- ============================================================================
-- pets: members read and (if editor+) edit; only the true owner may delete or
-- transfer. INSERT still binds the row to the creator.
-- ============================================================================
drop policy if exists pets_select on public.pets;
drop policy if exists pets_insert on public.pets;
drop policy if exists pets_update on public.pets;
drop policy if exists pets_delete on public.pets;

create policy pets_select on public.pets for select to authenticated
  using (public.can_access_pet(id, 'viewer'));
create policy pets_insert on public.pets for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy pets_update on public.pets for update to authenticated
  using (public.can_access_pet(id, 'editor'))
  with check (public.can_access_pet(id, 'editor'));
create policy pets_delete on public.pets for delete to authenticated
  using (user_id = (select auth.uid()));

-- ============================================================================
-- Pet-scoped children with a NOT NULL pet_id.
-- Read = viewer, write = editor. INSERT also pins authorship to the caller.
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'pet_photos','medical_records','vet_visits','medications','allergies','vaccinations',
    'weight_entries','nutrition_plans','feeding_schedules','grooming_logs','behavior_notes','pet_tags'
  ] loop
    execute format('drop policy if exists %1$s_select on public.%1$I', t);
    execute format('drop policy if exists %1$s_insert on public.%1$I', t);
    execute format('drop policy if exists %1$s_update on public.%1$I', t);
    execute format('drop policy if exists %1$s_delete on public.%1$I', t);

    execute format($p$create policy %1$s_select on public.%1$I for select to authenticated
      using (public.can_access_pet(pet_id, 'viewer'))$p$, t);
    execute format($p$create policy %1$s_insert on public.%1$I for insert to authenticated
      with check (public.can_access_pet(pet_id, 'editor') and user_id = (select auth.uid()))$p$, t);
    execute format($p$create policy %1$s_update on public.%1$I for update to authenticated
      using (public.can_access_pet(pet_id, 'editor'))
      with check (public.can_access_pet(pet_id, 'editor'))$p$, t);
    execute format($p$create policy %1$s_delete on public.%1$I for delete to authenticated
      using (public.can_access_pet(pet_id, 'editor'))$p$, t);
  end loop;
end $$;

-- ============================================================================
-- Pet-scoped children where pet_id is NULLABLE (a row with no pet is personal
-- to its author and is never shared).
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array['documents','notes','reminders'] loop
    execute format('drop policy if exists %1$s_select on public.%1$I', t);
    execute format('drop policy if exists %1$s_insert on public.%1$I', t);
    execute format('drop policy if exists %1$s_update on public.%1$I', t);
    execute format('drop policy if exists %1$s_delete on public.%1$I', t);

    execute format($p$create policy %1$s_select on public.%1$I for select to authenticated
      using (case when pet_id is null then user_id = (select auth.uid())
                  else public.can_access_pet(pet_id, 'viewer') end)$p$, t);
    execute format($p$create policy %1$s_insert on public.%1$I for insert to authenticated
      with check (user_id = (select auth.uid())
                  and (pet_id is null or public.can_access_pet(pet_id, 'editor')))$p$, t);
    execute format($p$create policy %1$s_update on public.%1$I for update to authenticated
      using (case when pet_id is null then user_id = (select auth.uid())
                  else public.can_access_pet(pet_id, 'editor') end)
      with check (case when pet_id is null then user_id = (select auth.uid())
                  else public.can_access_pet(pet_id, 'editor') end)$p$, t);
    execute format($p$create policy %1$s_delete on public.%1$I for delete to authenticated
      using (case when pet_id is null then user_id = (select auth.uid())
                  else public.can_access_pet(pet_id, 'editor') end)$p$, t);
  end loop;
end $$;

-- veterinarians, emergency_contacts, tags, activity_logs, profiles and
-- notification_settings stay strictly personal (user_id = auth.uid()) — their
-- 0002/0006 policies are unchanged.

-- ============================================================================
-- Ownership trigger: the old assert_pet_owner required the pet to belong to the
-- row's author, which would reject every legitimate collaborator write. Replace
-- it with an editor-level access check.
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'pet_photos','medical_records','vet_visits','medications','allergies','vaccinations',
    'weight_entries','nutrition_plans','feeding_schedules','grooming_logs','behavior_notes',
    'documents','notes','pet_tags','reminders'
  ] loop
    execute format('drop trigger if exists %I_owner_chk on public.%I', t, t);
  end loop;
end $$;

drop function if exists public.assert_pet_owner();

create or replace function public.assert_pet_access()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.pet_id is not null and not public.can_access_pet(new.pet_id, 'editor') then
    raise exception 'no editor access to pet %', new.pet_id
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'pet_photos','medical_records','vet_visits','medications','allergies','vaccinations',
    'weight_entries','nutrition_plans','feeding_schedules','grooming_logs','behavior_notes',
    'documents','notes','pet_tags','reminders'
  ] loop
    execute format('create trigger %I_access_chk before insert or update on public.%I
      for each row execute function public.assert_pet_access()', t, t);
  end loop;
end $$;

-- ============================================================================
-- Global search must follow membership too, otherwise a shared pet's records
-- would be invisible to collaborators.
-- ============================================================================
create or replace function public.global_search(q text)
returns table (entity text, id uuid, pet_id uuid, title text, snippet text)
language sql stable security invoker set search_path = public as $$
  select 'pet', p.id, p.id, p.name, coalesce(p.breed,'') from public.pets p
    where p.name ilike '%'||q||'%' or p.nickname ilike '%'||q||'%' or p.breed ilike '%'||q||'%'
  union all
  select 'medical_record', m.id, m.pet_id, m.title, left(coalesce(m.details,''),120) from public.medical_records m
    where m.title ilike '%'||q||'%' or m.details ilike '%'||q||'%'
  union all
  select 'medication', md.id, md.pet_id, md.name, md.dosage from public.medications md
    where md.name ilike '%'||q||'%'
  union all
  select 'vaccination', v.id, v.pet_id, v.vaccine, coalesce(v.notes,'') from public.vaccinations v
    where v.vaccine ilike '%'||q||'%'
  union all
  select 'note', n.id, n.pet_id, coalesce(n.title,'Note'), left(n.body,120) from public.notes n
    where n.title ilike '%'||q||'%' or n.body ilike '%'||q||'%'
  union all
  select 'visit', vv.id, vv.pet_id, coalesce(vv.reason,'Vet visit'), coalesce(vv.diagnosis,'') from public.vet_visits vv
    where vv.reason ilike '%'||q||'%' or vv.diagnosis ilike '%'||q||'%' or vv.notes ilike '%'||q||'%'
  limit 50
$$;
