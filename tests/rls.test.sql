-- RLS policy tests. Run against Supabase with: psql "$DATABASE_URL" -f tests/rls.test.sql
--
-- Covers single-owner isolation AND the per-pet sharing model:
--   A = pet owner, B = collaborator (role varies), C = unrelated stranger.
-- Everything runs inside one transaction and is rolled back.
begin;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'a@test.dev'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'b@test.dev'),
  ('cccccccc-0000-0000-0000-00000000000c', 'c@test.dev');

set local role authenticated;

-- ---------------------------------------------------------------- A: own pet
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}';
insert into public.pets (id, user_id, name) values
  ('11111111-1111-4111-8111-111111111111','aaaaaaaa-0000-0000-0000-00000000000a','Ranger');
insert into public.medications (id, user_id, pet_id, name, dosage, frequency) values
  ('22222222-2222-4222-8222-222222222222','aaaaaaaa-0000-0000-0000-00000000000a',
   '11111111-1111-4111-8111-111111111111','Carprofen','75 mg','BID');

do $$ begin
  assert (select count(*) from public.pets) = 1, 'owner should see own pet';
  assert (select count(*) from public.medications) = 1, 'owner should see own medication';
end $$;

-- ------------------------------------------------- C: stranger sees nothing
set local request.jwt.claims to '{"sub":"cccccccc-0000-0000-0000-00000000000c","role":"authenticated"}';
do $$ begin
  assert (select count(*) from public.pets) = 0, 'stranger must not see foreign pets';
  assert (select count(*) from public.medications) = 0, 'stranger must not see foreign meds';
end $$;

-- stranger cannot attach a child row to a pet they cannot access
do $$ begin
  begin
    insert into public.weight_entries (user_id, pet_id, weight_kg)
    values ('cccccccc-0000-0000-0000-00000000000c','11111111-1111-4111-8111-111111111111', 10);
    raise exception 'ACCESS FAILURE: stranger attached a row to a foreign pet';
  exception when insufficient_privilege or check_violation then null; end;
end $$;

-- stranger cannot forge a pet owned by someone else
do $$ begin
  begin
    insert into public.pets (user_id, name)
    values ('aaaaaaaa-0000-0000-0000-00000000000a','Stolen');
    raise exception 'RLS FAILURE: cross-user pet insert was allowed';
  exception when insufficient_privilege or check_violation then null; end;
end $$;

-- ============================================================ VIEWER access
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}';
insert into public.pet_shares (pet_id, user_id, role, invited_by) values
  ('11111111-1111-4111-8111-111111111111','bbbbbbbb-0000-0000-0000-00000000000b','viewer',
   'aaaaaaaa-0000-0000-0000-00000000000a');

set local request.jwt.claims to '{"sub":"bbbbbbbb-0000-0000-0000-00000000000b","role":"authenticated"}';
do $$ begin
  assert (select count(*) from public.pets) = 1, 'viewer should see the shared pet';
  assert (select count(*) from public.medications) = 1, 'viewer should see shared meds';
end $$;

-- viewer must NOT be able to write
do $$ begin
  begin
    insert into public.weight_entries (user_id, pet_id, weight_kg)
    values ('bbbbbbbb-0000-0000-0000-00000000000b','11111111-1111-4111-8111-111111111111', 30);
    raise exception 'ROLE FAILURE: viewer was allowed to insert';
  exception when insufficient_privilege or check_violation then null; end;
end $$;

do $$ begin
  update public.pets set name = 'Renamed' where id = '11111111-1111-4111-8111-111111111111';
  assert (select name from public.pets where id = '11111111-1111-4111-8111-111111111111') = 'Ranger',
    'ROLE FAILURE: viewer update changed the row';
end $$;

-- ============================================================ EDITOR access
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}';
update public.pet_shares set role = 'editor'
  where pet_id = '11111111-1111-4111-8111-111111111111'
    and user_id = 'bbbbbbbb-0000-0000-0000-00000000000b';

set local request.jwt.claims to '{"sub":"bbbbbbbb-0000-0000-0000-00000000000b","role":"authenticated"}';

-- editor may add records under their OWN authorship
insert into public.weight_entries (user_id, pet_id, weight_kg)
values ('bbbbbbbb-0000-0000-0000-00000000000b','11111111-1111-4111-8111-111111111111', 30);
do $$ begin
  assert (select count(*) from public.weight_entries) = 1, 'editor should be able to add records';
end $$;

-- editor may edit a record the OWNER created (the point of collaboration)
update public.medications set dosage = '100 mg'
  where id = '22222222-2222-4222-8222-222222222222';
do $$ begin
  assert (select dosage from public.medications where id = '22222222-2222-4222-8222-222222222222') = '100 mg',
    'editor should be able to edit the owner''s record';
end $$;

-- editor may NOT forge authorship as another user
do $$ begin
  begin
    insert into public.allergies (user_id, pet_id, allergy_type, allergen, severity)
    values ('aaaaaaaa-0000-0000-0000-00000000000a','11111111-1111-4111-8111-111111111111','food','Chicken','mild');
    raise exception 'AUTHORSHIP FAILURE: editor forged another user''s user_id';
  exception when insufficient_privilege or check_violation then null; end;
end $$;

-- editor may NOT delete the pet (owner-only)
do $$ begin
  delete from public.pets where id = '11111111-1111-4111-8111-111111111111';
  assert (select count(*) from public.pets) = 1, 'ROLE FAILURE: editor deleted the pet';
end $$;

-- editor may NOT grant access to anyone else
do $$ begin
  begin
    insert into public.pet_shares (pet_id, user_id, role)
    values ('11111111-1111-4111-8111-111111111111','cccccccc-0000-0000-0000-00000000000c','editor');
    raise exception 'PRIVILEGE FAILURE: editor granted a share';
  exception when insufficient_privilege or check_violation then null; end;
end $$;

-- ========================================================== EXPIRED share
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}';
update public.pet_shares set expires_at = now() - interval '1 hour'
  where pet_id = '11111111-1111-4111-8111-111111111111'
    and user_id = 'bbbbbbbb-0000-0000-0000-00000000000b';

set local request.jwt.claims to '{"sub":"bbbbbbbb-0000-0000-0000-00000000000b","role":"authenticated"}';
do $$ begin
  assert (select count(*) from public.pets) = 0, 'EXPIRY FAILURE: expired share still grants read';
  assert (select count(*) from public.medications) = 0, 'EXPIRY FAILURE: expired share still reads children';
end $$;

-- ===================================================== member can self-leave
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}';
update public.pet_shares set expires_at = null
  where pet_id = '11111111-1111-4111-8111-111111111111'
    and user_id = 'bbbbbbbb-0000-0000-0000-00000000000b';

set local request.jwt.claims to '{"sub":"bbbbbbbb-0000-0000-0000-00000000000b","role":"authenticated"}';
delete from public.pet_shares
  where pet_id = '11111111-1111-4111-8111-111111111111'
    and user_id = 'bbbbbbbb-0000-0000-0000-00000000000b';
do $$ begin
  assert (select count(*) from public.pets) = 0, 'LEAVE FAILURE: access survived leaving';
end $$;

-- ============================================ owner retains everything after
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}';
do $$ begin
  assert (select count(*) from public.pets) = 1, 'owner lost their own pet';
  assert (select count(*) from public.weight_entries) = 1,
    'owner should still see records a collaborator created';
end $$;

reset role;
rollback;
select 'RLS + sharing tests passed' as result;
