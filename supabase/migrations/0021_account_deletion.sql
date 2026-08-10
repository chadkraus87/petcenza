-- ============================================================================
-- Self-serve account deletion.
--
-- Required by law (GDPR Art. 17, several US state acts) and a hard App Store requirement
-- (guideline 5.1.1(v)). It is also the single most destructive operation in the product, so the
-- rules are spelled out rather than left to cascade behaviour.
--
-- THE CO-OWNERSHIP TRAP: pets.user_id references profiles ON DELETE CASCADE. Deleting the
-- profile row first would cascade-delete every pet the user is primary owner of — including pets
-- a co-owner actively depends on. Someone's partner would lose their dog's entire medical
-- history because the other person closed their account. So co-owned pets are HANDED OVER
-- before the profile row is touched.
--
-- The rules:
--   * Pet with a co-owner  -> ownership transfers to the longest-standing co-owner. Records live
--                             on for the person who still has the animal.
--   * Pet with no co-owner -> deleted, cascading to every record and reminder.
--   * Pet shared TO this user -> only their access is removed. The pet is untouched.
--
-- Storage objects are NOT reachable from Postgres, so the function returns the paths it orphaned
-- and the caller (the delete-account edge function) purges them.
-- ============================================================================

create or replace function public.delete_my_account()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := (select auth.uid());
  doomed uuid[];
  photo_paths text[];
  doc_paths text[];
  rec record;
  tbl text;
  -- Every table holding pet records stamped with an author. Kept explicit rather than derived
  -- from the catalog: a new table must be a deliberate decision here, not silently inherited.
  record_tables text[] := array[
    'allergies','behavior_notes','documents','feeding_schedules','grooming_logs',
    'medical_records','medications','notes','nutrition_plans','pet_photos',
    'pet_tags','reminders','vaccinations','vet_visits','weight_entries'
  ];
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- Pets this user is PRIMARY owner of that nobody else co-owns. These die with the account.
  select coalesce(array_agg(p.id), '{}')
    into doomed
    from public.pets p
   where p.user_id = uid
     and not exists (
       select 1 from public.pet_shares s
        where s.pet_id = p.id and s.role = 'owner'
     );

  -- Collect storage paths BEFORE the rows are deleted; afterwards they are unrecoverable.
  -- Kept per-bucket: photos and documents live in different buckets and the path alone does not
  -- say which, so the caller must not have to guess.
  select coalesce(array_agg(storage_path), '{}') into photo_paths
    from public.pet_photos where pet_id = any(doomed);
  select coalesce(array_agg(storage_path), '{}') into doc_paths
    from public.documents where pet_id = any(doomed);

  -- Hand over every co-owned pet. Oldest share first: the person who has been caring for the
  -- animal longest is the least surprising person to inherit it.
  for rec in
    select p.id as pet_id,
           (select s.user_id
              from public.pet_shares s
             where s.pet_id = p.id and s.role = 'owner'
             order by s.created_at asc
             limit 1) as heir
      from public.pets p
     where p.user_id = uid
       and exists (select 1 from public.pet_shares s where s.pet_id = p.id and s.role = 'owner')
  loop
    -- Every record table carries an authorship user_id that references profiles ON DELETE
    -- CASCADE. Handing the pet over is not enough on its own: dropping this profile would then
    -- cascade-delete every vaccination, medication, weight and document THIS user authored on a
    -- pet the heir just inherited. The heir would keep the animal and lose its history.
    -- So authorship moves with the animal.
    foreach tbl in array record_tables loop
      execute format(
        'update public.%I set user_id = $1 where pet_id = $2 and user_id = $3', tbl
      ) using rec.heir, rec.pet_id, uid;
    end loop;

    -- ORDER MATTERS. Drop the heir's co-owner share while this user is still the primary owner:
    -- guard_owner_role() (migration 0018) only lets the primary owner remove a co-owner, so
    -- transferring first makes the caller a non-owner and this delete raises, aborting the whole
    -- deletion. Both this and the authorship bug above were caught by the test fixture.
    delete from public.pet_shares where pet_id = rec.pet_id and user_id = rec.heir;
    update public.pets set user_id = rec.heir where id = rec.pet_id;
  end loop;

  -- Now safe: no remaining pet points at this profile except the doomed ones.
  delete from public.pets where id = any(doomed);

  -- Drop this user's access to pets that belong to other people.
  delete from public.pet_shares where user_id = uid;

  -- Everything else (profile, notification settings, vets, emergency contacts, tags, activity
  -- logs, invitations they issued) cascades from the profile row.
  delete from public.profiles where id = uid;

  return jsonb_build_object(
    'pets_deleted',    coalesce(array_length(doomed, 1), 0),
    'photo_paths',     to_jsonb(photo_paths),
    'document_paths',  to_jsonb(doc_paths)
  );
end $$;

-- Runs as the CALLER and derives the account from auth.uid(), so it is structurally incapable of
-- deleting anyone else's account. That is why it is safe to expose to authenticated directly
-- rather than routing a user id through a service-role function.
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ============================================================================
-- export_my_account — everything this user can see, as one JSON document.
--
-- A legal right (data portability) and the thing that makes a paywall ethical: nobody should
-- have to keep paying to get their dead dog's medical history back out.
--
-- Deliberately runs as SECURITY INVOKER, so RLS decides what is included. A shared pet the user
-- can read appears in their export; anything they cannot read does not. No separate access rules
-- to keep in sync.
-- ============================================================================
create or replace function public.export_my_account()
returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'exported_at',       now(),
    'format_version',    1,
    'profile',           (select to_jsonb(p) from public.profiles p where p.id = (select auth.uid())),
    'pets',              (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.pets t),
    'vaccinations',      (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.vaccinations t),
    'medications',       (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.medications t),
    'vet_visits',        (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.vet_visits t),
    'weight_entries',    (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.weight_entries t),
    'allergies',         (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.allergies t),
    'medical_records',   (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.medical_records t),
    'nutrition_plans',   (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.nutrition_plans t),
    'feeding_schedules', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.feeding_schedules t),
    'grooming_logs',     (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.grooming_logs t),
    'behavior_notes',    (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.behavior_notes t),
    'notes',             (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.notes t),
    'reminders',         (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.reminders t),
    'veterinarians',     (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.veterinarians t),
    'emergency_contacts',(select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.emergency_contacts t),
    'tags',              (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.tags t),
    'pet_tags',          (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.pet_tags t),
    -- Files live in Storage, not Postgres. These rows carry the paths so the client can fetch
    -- each one and bundle it alongside the JSON.
    'photos',            (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.pet_photos t),
    'documents',         (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.documents t)
  );
$$;

revoke execute on function public.export_my_account() from public, anon;
grant execute on function public.export_my_account() to authenticated;
