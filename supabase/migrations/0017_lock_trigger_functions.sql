-- Revoke EXECUTE on the auto-reminder trigger functions.
--
-- 0016 revoked sync_auto_reminder but left the three trigger functions granted to PUBLIC, so
-- `anon` and `authenticated` held EXECUTE on SECURITY DEFINER code (advisors 0028/0029).
--
-- Not exploitable as it stood — PostgREST won't expose a trigger function as an RPC (it 404s
-- with PGRST202 because there's no callable signature), and Postgres refuses direct calls to
-- trigger functions anyway. But an EXECUTE grant on SECURITY DEFINER code should never depend on
-- a client library declining to route to it. Triggers fire regardless of EXECUTE, so revoking
-- costs nothing.
--
-- Same trap as 0008: revoking from `anon` alone is a no-op, because Postgres grants EXECUTE on
-- new functions to PUBLIC and anon inherits it from there.
revoke execute on function public.medication_refill_reminder() from public, anon, authenticated;
revoke execute on function public.vaccination_due_reminder() from public, anon, authenticated;
revoke execute on function public.drop_auto_reminder() from public, anon, authenticated;
