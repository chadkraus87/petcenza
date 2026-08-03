-- ============================================================================
-- Vet-share links: read-only access to one pet for someone with NO account.
--
-- Deliberately does NOT weaken RLS. The `anon` role gets no new grants and no
-- policy on this table — an unauthenticated visitor can never query Postgres
-- directly. Instead the `vet-share` edge function validates the token with the
-- service role and returns a fixed, curated snapshot. The blast radius of a
-- leaked token is therefore exactly "read this one pet's clinical summary",
-- with no ability to enumerate, write, or reach any other pet.
--
-- Tokens are revocable and expiring; access is logged for the owner to review.
-- ============================================================================

create table public.pet_share_links (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  label text,                                   -- e.g. 'Dr. Vasquez — dental consult'
  created_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  revoked_at timestamptz,
  last_viewed_at timestamptz,
  view_count int not null default 0,
  created_at timestamptz not null default now()
);
create index pet_share_links_pet_idx on public.pet_share_links (pet_id);

alter table public.pet_share_links enable row level security;
alter table public.pet_share_links force row level security;

-- Only the pet owner mints or revokes these. No anon policy by design.
create policy pet_share_links_select on public.pet_share_links for select to authenticated
  using (public.is_pet_owner(pet_id));
create policy pet_share_links_insert on public.pet_share_links for insert to authenticated
  with check (public.is_pet_owner(pet_id) and created_by = (select auth.uid()));
create policy pet_share_links_update on public.pet_share_links for update to authenticated
  using (public.is_pet_owner(pet_id)) with check (public.is_pet_owner(pet_id));
create policy pet_share_links_delete on public.pet_share_links for delete to authenticated
  using (public.is_pet_owner(pet_id));

-- ============================================================================
-- Snapshot builder. Called ONLY by the edge function using the service role;
-- EXECUTE is revoked from anon and authenticated so it can't be reached over
-- PostgREST. Returns a single JSON document — no table access is exposed.
-- ============================================================================
create or replace function public.vet_share_snapshot(p_token uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  lnk public.pet_share_links%rowtype;
  result jsonb;
begin
  select * into lnk from public.pet_share_links where token = p_token;
  if not found then return jsonb_build_object('error','invalid'); end if;
  if lnk.revoked_at is not null then return jsonb_build_object('error','revoked'); end if;
  if lnk.expires_at <= now() then return jsonb_build_object('error','expired'); end if;

  select jsonb_build_object(
    'pet', (
      select jsonb_build_object(
        'name', p.name, 'species', p.species, 'breed', p.breed,
        'sex', p.sex, 'birth_date', p.birth_date, 'color', p.color,
        'microchip_no', p.microchip_no
      ) from public.pets p where p.id = lnk.pet_id
    ),
    'allergies', coalesce((
      select jsonb_agg(jsonb_build_object(
        'allergen', a.allergen, 'type', a.allergy_type, 'severity', a.severity,
        'symptoms', a.symptoms, 'emergency_treatment', a.emergency_treatment)
        order by a.severity desc)
      from public.allergies a where a.pet_id = lnk.pet_id
    ), '[]'::jsonb),
    'medications', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', m.name, 'dosage', m.dosage, 'frequency', m.frequency,
        'starts_on', m.starts_on, 'ends_on', m.ends_on, 'instructions', m.instructions)
        order by m.starts_on desc)
      from public.medications m
      where m.pet_id = lnk.pet_id and (m.ends_on is null or m.ends_on >= current_date)
    ), '[]'::jsonb),
    'vaccinations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'vaccine', v.vaccine, 'administered_on', v.administered_on, 'next_due_on', v.next_due_on)
        order by v.next_due_on nulls last)
      from public.vaccinations v where v.pet_id = lnk.pet_id
    ), '[]'::jsonb),
    'weights', coalesce((
      select jsonb_agg(jsonb_build_object(
        'measured_on', w.measured_on, 'weight_kg', w.weight_kg, 'body_condition', w.body_condition)
        order by w.measured_on desc)
      from (select * from public.weight_entries
             where pet_id = lnk.pet_id order by measured_on desc limit 20) w
    ), '[]'::jsonb),
    'visits', coalesce((
      select jsonb_agg(jsonb_build_object(
        'visit_at', vv.visit_at, 'reason', vv.reason, 'diagnosis', vv.diagnosis,
        'treatment', vv.treatment, 'followup', vv.followup)
        order by vv.visit_at desc)
      from (select * from public.vet_visits
             where pet_id = lnk.pet_id order by visit_at desc limit 20) vv
    ), '[]'::jsonb),
    'expires_at', lnk.expires_at
  ) into result;

  update public.pet_share_links
     set last_viewed_at = now(), view_count = view_count + 1
   where id = lnk.id;

  return result;
end $$;

revoke execute on function public.vet_share_snapshot(uuid) from public, anon, authenticated;
