-- Row-Level Security: every table locked to owner. Deny-by-default; no anon access anywhere.
-- Least privilege: authenticated role only; user_id must equal auth.uid() on both read and write.

do $$
declare t text;
begin
  foreach t in array array[
    'pets','pet_photos','veterinarians','emergency_contacts','medical_records','vet_visits',
    'medications','allergies','vaccinations','weight_entries','nutrition_plans','feeding_schedules',
    'grooming_logs','behavior_notes','documents','notes','tags','pet_tags','reminders','activity_logs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format($p$create policy %1$s_select on public.%1$I for select to authenticated using (user_id = auth.uid())$p$, t);
    execute format($p$create policy %1$s_insert on public.%1$I for insert to authenticated with check (user_id = auth.uid())$p$, t);
    execute format($p$create policy %1$s_update on public.%1$I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())$p$, t);
    execute format($p$create policy %1$s_delete on public.%1$I for delete to authenticated using (user_id = auth.uid())$p$, t);
  end loop;
end $$;

-- profiles / notification_settings key on id / user_id = auth.uid(); no delete (cascade from auth.users)
alter table public.profiles enable row level security;
alter table public.profiles force row level security;
create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

alter table public.notification_settings enable row level security;
alter table public.notification_settings force row level security;
create policy notif_select on public.notification_settings for select to authenticated using (user_id = auth.uid());
create policy notif_update on public.notification_settings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Cross-row integrity: a child row may only reference a pet the same user owns.
create or replace function public.assert_pet_owner()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.pet_id is not null and not exists (
    select 1 from public.pets p where p.id = new.pet_id and p.user_id = new.user_id
  ) then
    raise exception 'pet does not belong to user';
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
    execute format('create trigger %I_owner_chk before insert or update on public.%I for each row execute function public.assert_pet_owner()', t, t);
  end loop;
end $$;

-- activity_logs are append-only for users
drop policy activity_logs_update on public.activity_logs;
drop policy activity_logs_delete on public.activity_logs;
