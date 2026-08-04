-- ============================================================================
-- Smart auto-reminders.
--
-- Medications carry refill_due_on and vaccinations carry next_due_on, but until
-- now nothing turned those dates into anything that would actually surface. A
-- missed booster is a real clinical consequence, so this generates reminders in
-- the database rather than the client — a trigger can't be skipped by a client
-- that forgets to call it, and it works for collaborators too.
--
-- Reminders are keyed to their source by (source_table, source_id) and upserted,
-- so editing a refill date moves the existing reminder instead of piling up
-- duplicates. Clearing the date, or deleting the source row, removes any
-- still-pending reminder — but never a completed one, which is history.
--
-- Times are resolved in the OWNER's profile timezone (profiles.timezone), so a
-- 9am reminder means 9am where they are, not 9am UTC.
-- ============================================================================

-- One auto-reminder per source row. Partial, so manually created reminders
-- (source_table null) are unaffected.
create unique index if not exists reminders_source_uniq
  on public.reminders (source_table, source_id)
  where source_table is not null and source_id is not null;

create or replace function public.sync_auto_reminder(
  p_user_id uuid, p_pet_id uuid, p_table text, p_source_id uuid,
  p_kind public.reminder_kind, p_title text, p_on date, p_lead_days int default 0
) returns void
language plpgsql security definer set search_path = public as $$
declare tz text; target timestamptz;
begin
  -- No date any more: drop a still-pending reminder, keep completed history.
  if p_on is null then
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
  -- Don't resurrect or move something the user already ticked off.
  where public.reminders.completed_at is null;
end $$;

revoke execute on function public.sync_auto_reminder(uuid, uuid, text, uuid, public.reminder_kind, text, date, int)
  from public, anon, authenticated;

-- ------------------------------------------------------------ medications
create or replace function public.medication_refill_reminder()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.sync_auto_reminder(
    new.user_id, new.pet_id, 'medications', new.id, 'medication',
    'Refill ' || new.name, new.refill_due_on, 0
  );
  return new;
end $$;

create trigger medications_auto_reminder
  after insert or update of refill_due_on, name, pet_id on public.medications
  for each row execute function public.medication_refill_reminder();

-- ----------------------------------------------------------- vaccinations
-- Boosters need booking, so remind a week ahead of the due date.
create or replace function public.vaccination_due_reminder()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.sync_auto_reminder(
    new.user_id, new.pet_id, 'vaccinations', new.id, 'vaccination',
    new.vaccine || ' booster due', new.next_due_on, 7
  );
  return new;
end $$;

create trigger vaccinations_auto_reminder
  after insert or update of next_due_on, vaccine, pet_id on public.vaccinations
  for each row execute function public.vaccination_due_reminder();

-- ------------------------------------------------- clean up on source delete
create or replace function public.drop_auto_reminder()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.reminders
   where source_table = tg_argv[0] and source_id = old.id and completed_at is null;
  return old;
end $$;

create trigger medications_drop_reminder
  after delete on public.medications
  for each row execute function public.drop_auto_reminder('medications');

create trigger vaccinations_drop_reminder
  after delete on public.vaccinations
  for each row execute function public.drop_auto_reminder('vaccinations');
