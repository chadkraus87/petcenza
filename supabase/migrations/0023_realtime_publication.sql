-- ============================================================================
-- Actually broadcast changes for cross-device sync.
--
-- useRealtimeSync subscribes to postgres_changes on these tables, but the supabase_realtime
-- publication was empty, so no change event was ever sent. "Cross-device sync" only ever happened
-- on refetch or reload. It matters most for dose logs: one person marking a dose given should show
-- up on everyone else's phone.
--
-- Security:
--   * INSERT and UPDATE events are filtered through each subscriber's RLS, so a user only
--     receives changes to rows they can already read.
--   * DELETE events cannot be RLS-checked (the row is gone). With the default replica identity
--     they carry only the primary key, a random UUID with no record data. Do NOT set
--     REPLICA IDENTITY FULL on these tables: that would put whole deleted rows into events that
--     are not access-checked.
-- Keep this list in step with SYNCED_TABLES in src/hooks/useRealtime.ts.
-- ============================================================================

alter publication supabase_realtime add table
  public.pets, public.medications, public.allergies, public.vaccinations, public.weight_entries,
  public.vet_visits, public.reminders, public.feeding_schedules, public.nutrition_plans,
  public.grooming_logs, public.behavior_notes, public.notes, public.documents,
  public.veterinarians, public.emergency_contacts, public.dose_logs;
