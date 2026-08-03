-- Performance (Supabase advisor auth_rls_initplan): rewrite every owner policy so auth.uid() is
-- evaluated once per query via a scalar subselect `(select auth.uid())` instead of once per row.
-- Same security semantics, materially faster on large result sets.
do $$
declare t text;
begin
  foreach t in array array[
    'pets','pet_photos','veterinarians','emergency_contacts','medical_records','vet_visits',
    'medications','allergies','vaccinations','weight_entries','nutrition_plans','feeding_schedules',
    'grooming_logs','behavior_notes','documents','notes','tags','pet_tags','reminders','activity_logs'
  ] loop
    execute format('drop policy if exists %1$s_select on public.%1$I', t);
    execute format('drop policy if exists %1$s_insert on public.%1$I', t);
    execute format('drop policy if exists %1$s_update on public.%1$I', t);
    execute format('drop policy if exists %1$s_delete on public.%1$I', t);
    execute format($p$create policy %1$s_select on public.%1$I for select to authenticated using (user_id = (select auth.uid()))$p$, t);
    execute format($p$create policy %1$s_insert on public.%1$I for insert to authenticated with check (user_id = (select auth.uid()))$p$, t);
    execute format($p$create policy %1$s_update on public.%1$I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))$p$, t);
    execute format($p$create policy %1$s_delete on public.%1$I for delete to authenticated using (user_id = (select auth.uid()))$p$, t);
  end loop;
end $$;

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists notif_select on public.notification_settings;
drop policy if exists notif_update on public.notification_settings;
create policy notif_select on public.notification_settings for select to authenticated using (user_id = (select auth.uid()));
create policy notif_update on public.notification_settings for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Keep activity_logs append-only (recreated select/insert above; drop the write verbs again).
drop policy if exists activity_logs_update on public.activity_logs;
drop policy if exists activity_logs_delete on public.activity_logs;
