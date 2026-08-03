-- Storage: two private buckets. Paths are namespaced by user id: {user_id}/{pet_id}/{uuid}.{ext}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('pet-photos','pet-photos', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic']),
  ('pet-documents','pet-documents', false, 26214400, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "photos owner read" on storage.objects for select to authenticated
  using (bucket_id = 'pet-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos owner write" on storage.objects for insert to authenticated
  with check (bucket_id = 'pet-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'pet-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "docs owner read" on storage.objects for select to authenticated
  using (bucket_id = 'pet-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "docs owner write" on storage.objects for insert to authenticated
  with check (bucket_id = 'pet-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "docs owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'pet-documents' and (storage.foldername(name))[1] = auth.uid()::text);
