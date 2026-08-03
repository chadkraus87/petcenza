-- Recurring-reminder regeneration. When a reminder with a recurrence is completed, the next
-- occurrence is created automatically. Implemented as an AFTER UPDATE trigger (transactional and
-- reliable — no network round-trip). security definer so the insert isn't blocked by RLS; the new
-- row is always written with the same user_id, so ownership is preserved.
create or replace function public.regenerate_recurring_reminder()
returns trigger language plpgsql security definer set search_path = public as $$
declare next_due timestamptz;
begin
  if new.completed_at is not null and old.completed_at is null and new.recurrence <> 'none' then
    next_due := case new.recurrence
      when 'daily'     then new.due_at + interval '1 day'
      when 'weekly'    then new.due_at + interval '1 week'
      when 'biweekly'  then new.due_at + interval '2 weeks'
      when 'monthly'   then new.due_at + interval '1 month'
      when 'quarterly' then new.due_at + interval '3 months'
      when 'yearly'    then new.due_at + interval '1 year'
      else null
    end;
    if next_due is not null then
      insert into public.reminders (user_id, pet_id, kind, title, due_at, recurrence, source_table, source_id)
      values (new.user_id, new.pet_id, new.kind, new.title, next_due, new.recurrence, new.source_table, new.source_id);
    end if;
  end if;
  return new;
end $$;

create trigger reminders_recurrence
  after update on public.reminders
  for each row execute function public.regenerate_recurring_reminder();
