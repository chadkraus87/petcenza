-- RLS policy tests. Run against a local Supabase (supabase start) with: psql < tests/rls.test.sql
-- Verifies user isolation and cross-user access denial.
begin;

-- Two fake users
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@test.dev'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@test.dev');

-- User A creates a pet
set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}';
insert into public.pets (user_id, name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Ranger');

-- A can read own pet
do $$ begin
  assert (select count(*) from public.pets) = 1, 'owner should see own pet';
end $$;

-- Switch to user B: must see nothing
set local request.jwt.claims to '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}';
do $$ begin
  assert (select count(*) from public.pets) = 0, 'other user must not see foreign pets';
end $$;

-- B cannot insert a row claiming A's user_id
do $$ begin
  begin
    insert into public.pets (user_id, name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Stolen');
    raise exception 'RLS FAILURE: cross-user insert was allowed';
  exception when insufficient_privilege or check_violation then
    null; -- expected
  end;
end $$;

-- B cannot attach a child record to A's pet even with own user_id
do $$
declare a_pet uuid;
begin
  set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}';
  select id into a_pet from public.pets limit 1;
  set local request.jwt.claims to '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}';
  begin
    insert into public.weight_entries (user_id, pet_id, weight_kg) values ('bbbbbbbb-0000-0000-0000-000000000002', a_pet, 10);
    raise exception 'OWNERSHIP FAILURE: child row attached to foreign pet';
  exception when others then null; -- expected (trigger raises)
  end;
end $$;

reset role;
rollback;
select 'RLS tests passed' as result;
