-- ============================================================================
-- Dose logs: "was this dose given?", shared by everyone who cares for the pet.
--
-- Medication rounds knew what was due but not what had been done, so the most anxious daily
-- question in a multi-person household ("did you give Biscuit her pill?") had no answer in the
-- app. One row per medication, time slot and day.
--
-- Deliberate choices:
--   * (medication_id, pet_id) references medications(id, pet_id), so the database itself rejects a
--     dose logged against a medication belonging to a different pet.
--   * unique (medication_id, slot, given_on): two people tapping "Given" at once can't double-log.
--   * given_by is ON DELETE SET NULL and there is no authorship user_id, so a pet's dose history
--     survives a household member closing their account, and delete_my_account() needs no change.
-- ============================================================================

alter table public.medications add constraint medications_id_pet_unique unique (id, pet_id);

create table public.dose_logs (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  medication_id uuid not null,
  slot text not null check (slot in ('morning', 'midday', 'evening', 'night')),
  given_on date not null,
  given_by uuid references public.profiles(id) on delete set null,
  given_at timestamptz not null default now(),
  foreign key (medication_id, pet_id) references public.medications(id, pet_id) on delete cascade,
  unique (medication_id, slot, given_on)
);
create index dose_logs_pet_day_idx on public.dose_logs (pet_id, given_on);

alter table public.dose_logs enable row level security;
alter table public.dose_logs force row level security;

create policy dose_logs_select on public.dose_logs for select to authenticated
  using (public.can_access_pet(pet_id, 'viewer'));
create policy dose_logs_insert on public.dose_logs for insert to authenticated
  with check (public.can_access_pet(pet_id, 'editor') and given_by = (select auth.uid()));
create policy dose_logs_delete on public.dose_logs for delete to authenticated
  using (public.can_access_pet(pet_id, 'editor'));

-- Safe by construction rather than only by the absence of an anon policy.
revoke all on public.dose_logs from anon;

-- Keep "export everything" true.
create or replace function public.export_my_account()
returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'exported_at',       now(),
    'format_version',    1,
    'profile',           (select to_jsonb(p) from public.profiles p where p.id = (select auth.uid())),
    'pets',              (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.pets t),
    'vaccinations',      (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.vaccinations t),
    'medications',       (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.medications t),
    'vet_visits',        (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.vet_visits t),
    'weight_entries',    (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.weight_entries t),
    'allergies',         (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.allergies t),
    'medical_records',   (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.medical_records t),
    'nutrition_plans',   (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.nutrition_plans t),
    'feeding_schedules', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.feeding_schedules t),
    'grooming_logs',     (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.grooming_logs t),
    'behavior_notes',    (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.behavior_notes t),
    'notes',             (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.notes t),
    'reminders',         (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.reminders t),
    'veterinarians',     (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.veterinarians t),
    'emergency_contacts',(select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.emergency_contacts t),
    'tags',              (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.tags t),
    'pet_tags',          (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.pet_tags t),
    -- Files live in Storage, not Postgres. These rows carry the paths so the client can fetch
    -- each one and bundle it alongside the JSON.
    'photos',            (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.pet_photos t),
    'documents',         (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.documents t),
    'dose_logs',         (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.dose_logs t)
  );
$$;

revoke execute on function public.export_my_account() from public, anon;
grant execute on function public.export_my_account() to authenticated;
