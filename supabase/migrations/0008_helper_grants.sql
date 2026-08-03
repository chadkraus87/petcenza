-- Lock the sharing helpers down to signed-in users only.
--
-- 0007 tried `revoke ... from anon`, which is a no-op: Postgres grants EXECUTE on new functions
-- to PUBLIC by default, and `anon` inherited it that way. Revoking from PUBLIC is what actually
-- removes it; EXECUTE is then granted back to `authenticated` explicitly.
--
-- `authenticated` MUST keep EXECUTE: RLS policy expressions are evaluated as the calling role,
-- so revoking it would break every pet-scoped policy. The residual advisor warning
-- (0029_authenticated_security_definer_function_executable) is therefore expected and accepted —
-- both functions are read-only, take a pet id the caller already holds, and return only a
-- boolean, so the worst case is confirming access to an unguessable v4 UUID.
revoke execute on function public.is_pet_owner(uuid) from public, anon;
revoke execute on function public.can_access_pet(uuid, public.share_role) from public, anon;

grant execute on function public.is_pet_owner(uuid) to authenticated;
grant execute on function public.can_access_pet(uuid, public.share_role) to authenticated;
