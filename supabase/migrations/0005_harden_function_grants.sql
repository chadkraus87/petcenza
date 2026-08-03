-- Security hardening (from Supabase advisors 0028/0029): these SECURITY DEFINER functions are
-- trigger-only. Triggers fire regardless of EXECUTE privilege, so revoking direct EXECUTE keeps
-- them working via their triggers while removing them from the PostgREST RPC surface, so no
-- anon/authenticated caller can invoke them directly at /rest/v1/rpc/<fn>.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.regenerate_recurring_reminder() from public, anon, authenticated;
