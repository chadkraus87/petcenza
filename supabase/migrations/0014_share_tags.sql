-- Let collaborators resolve tag labels on pets shared with them.
--
-- pet_tags became pet-scoped in 0007 (read = viewer), but `tags` itself stayed user-scoped. The
-- result: a collaborator could see that a shared pet HAS tags while the embedded tag row came
-- back null, so the labels silently vanished. Same reasoning and same rule as the care team in
-- 0013 — a live share grants READ on the owner's tags; writes stay owner-only.
drop policy if exists tags_select on public.tags;
create policy tags_select on public.tags for select to authenticated
  using (user_id = (select auth.uid()) or public.shares_pet_with(user_id));
