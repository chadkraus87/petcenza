-- PawChart schema. All user data keyed to auth.uid() via user_id, enforced by RLS in 0002.
create extension if not exists "pgcrypto";

-- ===== Profiles (mirrors auth.users) =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  timezone text not null default 'America/Chicago',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  insert into public.notification_settings (user_id) values (new.id);
  return new;
end $$;

-- ===== Core enums =====
create type public.species as enum ('dog','cat','bird','rabbit','reptile','fish','horse','other');
create type public.sex as enum ('male','female','male_neutered','female_spayed','unknown');
create type public.activity_level as enum ('low','moderate','high','very_high');
create type public.allergy_type as enum ('food','medication','environmental','other');
create type public.allergy_severity as enum ('mild','moderate','severe','life_threatening');
create type public.record_type as enum ('diagnosis','condition','surgery','hospitalization','dental','lab','bloodwork','imaging_xray','imaging_mri','imaging_ct','imaging_ultrasound','note','followup','other');
create type public.reminder_kind as enum ('feeding','medication','grooming','vaccination','birthday','vet_appointment','custom');
create type public.recurrence as enum ('none','daily','weekly','biweekly','monthly','quarterly','yearly');

-- ===== Pets =====
create table public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  nickname text,
  species public.species not null default 'dog',
  breed text,
  is_mixed_breed boolean not null default false,
  sex public.sex not null default 'unknown',
  birth_date date,
  estimated_age_months int check (estimated_age_months between 0 and 600),
  adoption_date date,
  rescue_org text,
  color text,
  goal_weight_kg numeric(6,2) check (goal_weight_kg > 0),
  height_cm numeric(6,2) check (height_cm > 0),
  activity_level public.activity_level default 'moderate',
  insurance_provider text,
  insurance_policy_no text,
  registration_no text,
  microchip_no text,
  favorite_foods text[],
  favorite_toys text[],
  favorite_activities text[],
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index pets_user_idx on public.pets (user_id) where not archived;

create table public.pet_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  storage_path text not null,
  caption text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index pet_photos_pet_idx on public.pet_photos (pet_id);
create unique index pet_photos_one_primary on public.pet_photos (pet_id) where is_primary;

-- ===== Care team =====
create table public.veterinarians (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  clinic text,
  address text,
  phone text,
  email text,
  is_primary boolean not null default false,
  is_emergency_clinic boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);
create index vets_user_idx on public.veterinarians (user_id);

create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,           -- e.g. 'Pet sitter', 'Poison control'
  name text not null,
  phone text not null,
  notes text,
  sort_order int not null default 0
);
create index emergency_user_idx on public.emergency_contacts (user_id);

-- ===== Medical =====
create table public.medical_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  record_type public.record_type not null,
  title text not null,
  occurred_on date not null default current_date,
  veterinarian_id uuid references public.veterinarians(id) on delete set null,
  details text,
  followup text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index medrec_pet_idx on public.medical_records (pet_id, occurred_on desc);

create table public.vet_visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  veterinarian_id uuid references public.veterinarians(id) on delete set null,
  visit_at timestamptz not null,
  reason text,
  diagnosis text,
  treatment text,
  followup text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index visits_pet_idx on public.vet_visits (pet_id, visit_at desc);
-- Non-partial: a predicate like `where visit_at > now()` is rejected (now() isn't IMMUTABLE).
create index visits_upcoming_idx on public.vet_visits (user_id, visit_at);

create table public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  name text not null,
  dosage text not null,
  frequency text not null,        -- human-readable, e.g. 'Twice daily with food'
  starts_on date not null default current_date,
  ends_on date,
  instructions text,
  prescriber_id uuid references public.veterinarians(id) on delete set null,
  pharmacy text,
  refill_due_on date,
  side_effects text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);
-- "Active" is time-dependent (depends on current_date) so it can't be a STORED generated column
-- or a partial-index predicate — both require IMMUTABLE expressions. It's computed at read time
-- (client-side, and via the dashboard's ends_on filter). Index supports the active-meds query.
create index meds_pet_idx on public.medications (pet_id, ends_on);

create table public.allergies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  allergy_type public.allergy_type not null,
  allergen text not null,
  severity public.allergy_severity not null default 'mild',
  symptoms text,
  emergency_treatment text,
  created_at timestamptz not null default now()
);
create index allergies_pet_idx on public.allergies (pet_id, severity desc);

create table public.vaccinations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  vaccine text not null,
  administered_on date,
  next_due_on date,
  veterinarian_id uuid references public.veterinarians(id) on delete set null,
  lot_no text,
  notes text,
  created_at timestamptz not null default now()
);
create index vax_due_idx on public.vaccinations (user_id, next_due_on);

create table public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  measured_on date not null default current_date,
  weight_kg numeric(6,2) not null check (weight_kg > 0 and weight_kg < 2000),
  body_condition int check (body_condition between 1 and 9),
  notes text,
  unique (pet_id, measured_on)
);
create index weight_pet_idx on public.weight_entries (pet_id, measured_on);

-- ===== Daily care =====
create table public.nutrition_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  food_brand text,
  formula text,
  portion text,
  calories_per_day int check (calories_per_day between 0 and 20000),
  supplements text,
  treats text,
  water_notes text,
  foods_to_avoid text,
  updated_at timestamptz not null default now()
);
create unique index nutrition_one_per_pet on public.nutrition_plans (pet_id);

create table public.feeding_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  label text not null,            -- 'Breakfast'
  feed_time time not null,
  portion text,
  active boolean not null default true
);
create index feeding_pet_idx on public.feeding_schedules (pet_id) where active;

create table public.grooming_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  task text not null,             -- 'Bath', 'Nail trim', 'Teeth', 'Ears', 'Appointment'
  done_on date not null default current_date,
  notes text
);
create index grooming_pet_idx on public.grooming_logs (pet_id, done_on desc);

create table public.behavior_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  category text not null,         -- 'anxiety_trigger','command','milestone','temperament','socialization'
  content text not null,
  noted_on date not null default current_date
);
create index behavior_pet_idx on public.behavior_notes (pet_id, noted_on desc);

-- ===== Documents / notes / tags =====
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete cascade,
  medical_record_id uuid references public.medical_records(id) on delete set null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 26214400), -- 25 MB
  kind text not null default 'other', -- 'report','receipt','insurance','image','other'
  created_at timestamptz not null default now()
);
create index docs_pet_idx on public.documents (pet_id);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete cascade,
  title text,
  body text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  color text not null default '#4A6B5D',
  unique (user_id, name)
);

create table public.pet_tags (
  pet_id uuid not null references public.pets(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (pet_id, tag_id)
);

-- ===== Reminders / notifications / audit =====
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete cascade,
  kind public.reminder_kind not null default 'custom',
  title text not null,
  due_at timestamptz not null,
  recurrence public.recurrence not null default 'none',
  source_table text,              -- provenance when auto-generated ('medications', 'vaccinations', ...)
  source_id uuid,
  completed_at timestamptz,
  snoozed_until timestamptz,
  created_at timestamptz not null default now()
);
create index reminders_due_idx on public.reminders (user_id, due_at) where completed_at is null;

create table public.notification_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  browser_push boolean not null default true,
  feeding boolean not null default true,
  medication boolean not null default true,
  grooming boolean not null default true,
  vaccination boolean not null default true,
  birthdays boolean not null default true,
  vet_appointments boolean not null default true,
  custom boolean not null default true,
  quiet_hours_start time,
  quiet_hours_end time
);

create table public.activity_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,           -- 'auth.sign_in','pet.create','document.upload', ...
  entity text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_user_idx on public.activity_logs (user_id, created_at desc);

-- ===== updated_at maintenance =====
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','pets','medical_records','vet_visits','medications','notes','nutrition_plans']
  loop
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== Global search =====
create or replace function public.global_search(q text)
returns table (entity text, id uuid, pet_id uuid, title text, snippet text)
language sql stable security invoker set search_path = public as $$
  select 'pet', p.id, p.id, p.name, coalesce(p.breed,'') from public.pets p
    where p.user_id = auth.uid() and (p.name ilike '%'||q||'%' or p.nickname ilike '%'||q||'%' or p.breed ilike '%'||q||'%')
  union all
  select 'medical_record', m.id, m.pet_id, m.title, left(coalesce(m.details,''),120) from public.medical_records m
    where m.user_id = auth.uid() and (m.title ilike '%'||q||'%' or m.details ilike '%'||q||'%')
  union all
  select 'medication', md.id, md.pet_id, md.name, md.dosage from public.medications md
    where md.user_id = auth.uid() and md.name ilike '%'||q||'%'
  union all
  select 'vaccination', v.id, v.pet_id, v.vaccine, coalesce(v.notes,'') from public.vaccinations v
    where v.user_id = auth.uid() and v.vaccine ilike '%'||q||'%'
  union all
  select 'note', n.id, n.pet_id, coalesce(n.title,'Note'), left(n.body,120) from public.notes n
    where n.user_id = auth.uid() and (n.title ilike '%'||q||'%' or n.body ilike '%'||q||'%')
  union all
  select 'visit', vv.id, vv.pet_id, coalesce(vv.reason,'Vet visit'), coalesce(vv.diagnosis,'') from public.vet_visits vv
    where vv.user_id = auth.uid() and (vv.reason ilike '%'||q||'%' or vv.diagnosis ilike '%'||q||'%' or vv.notes ilike '%'||q||'%')
  limit 50
$$;
