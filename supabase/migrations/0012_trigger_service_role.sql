-- Let trusted server-side contexts through the pet-access trigger.
--
-- assert_pet_access() calls can_access_pet(), which resolves the caller from auth.uid(). In a
-- service-role/superuser context (seed scripts, admin tooling, migrations, edge functions using
-- the service key) there is no JWT, so auth.uid() is NULL, can_access_pet() is false, and the
-- trigger rejected every write — including supabase/seed.sql.
--
-- Skipping the check when auth.uid() is NULL is safe: a NULL uid means the request is not an
-- authenticated end user. Anonymous callers are already blocked outright by RLS (no anon policy
-- exists on any of these tables), so the only thing reaching here with a NULL uid is a context
-- that has deliberately been granted RLS bypass. Authenticated users are unaffected and still
-- need editor access.
create or replace function public.assert_pet_access()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if (select auth.uid()) is null then
    return new;  -- trusted server-side context; RLS is intentionally bypassed here
  end if;
  if new.pet_id is not null and not public.can_access_pet(new.pet_id, 'editor') then
    raise exception 'no editor access to pet %', new.pet_id
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;
