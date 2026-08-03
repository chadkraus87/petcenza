-- ============================================================================
-- Storage: move from owner-scoped paths to pet-scoped paths.
--
-- Old layout: {user_id}/{pet_id}/{uuid}.{ext}, policy matched folder[1] against
-- auth.uid(). That breaks sharing in both directions: a collaborator's upload
-- lands under THEIR id (invisible to everyone else), and they cannot read files
-- the owner uploaded.
--
-- New layout: {pet_id}/{uuid}.{ext}, with access decided by pet membership —
-- the same rule the database tables use.
--
-- Safe to run as a pure policy swap: both buckets were verified empty (0
-- objects) when this was applied, so no files needed relocating. If you ever
-- replay this against a populated bucket, move the objects first — the new
-- policies will not match the old three-segment paths.
--
-- The folder[1] segment is regex-guarded before casting to uuid; without that,
-- an object at a non-uuid path would raise on the cast instead of simply
-- failing the check.
-- ============================================================================

drop policy if exists "photos owner read" on storage.objects;
drop policy if exists "photos owner write" on storage.objects;
drop policy if exists "photos owner delete" on storage.objects;
drop policy if exists "docs owner read" on storage.objects;
drop policy if exists "docs owner write" on storage.objects;
drop policy if exists "docs owner delete" on storage.objects;

-- pet-photos: members read, editors write/delete
create policy "photos member read" on storage.objects for select to authenticated
  using (
    bucket_id = 'pet-photos'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.can_access_pet(((storage.foldername(name))[1])::uuid, 'viewer')
  );

create policy "photos editor write" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'pet-photos'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.can_access_pet(((storage.foldername(name))[1])::uuid, 'editor')
  );

create policy "photos editor delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'pet-photos'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.can_access_pet(((storage.foldername(name))[1])::uuid, 'editor')
  );

-- pet-documents: same rules
create policy "docs member read" on storage.objects for select to authenticated
  using (
    bucket_id = 'pet-documents'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.can_access_pet(((storage.foldername(name))[1])::uuid, 'viewer')
  );

create policy "docs editor write" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'pet-documents'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.can_access_pet(((storage.foldername(name))[1])::uuid, 'editor')
  );

create policy "docs editor delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'pet-documents'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.can_access_pet(((storage.foldername(name))[1])::uuid, 'editor')
  );
