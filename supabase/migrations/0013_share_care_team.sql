-- ============================================================================
-- Share the care team with collaborators.
--
-- Problem: veterinarians and emergency_contacts stayed strictly personal, so
-- someone caring for a pet shared with them saw an EMPTY Emergency screen and
-- an empty vet dropdown. In a crisis that is exactly the wrong answer — the
-- Emergency screen exists precisely for the person who is with the animal.
--
-- Rule: if you hold a live share on any of my pets, you can READ my care team.
-- Writes remain owner-only, so a collaborator can never edit or delete my vets.
--
-- Scope is deliberately "the owner's care team" rather than "vets linked to
-- this pet". A sitter needs the poison-control number and the emergency clinic
-- whether or not those rows happen to be referenced by a record on that pet.
-- ============================================================================

create or replace function public.shares_pet_with(p_owner uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.pet_shares s
      join public.pets p on p.id = s.pet_id
     where s.user_id = (select auth.uid())
       and p.user_id = p_owner
       and (s.expires_at is null or s.expires_at > now())
  )
$$;

-- Same reasoning as can_access_pet: policies on these tables consult pet_shares
-- and pets, so the lookup must bypass RLS to avoid recursion. Read-only, takes
-- a user id, returns a boolean.
revoke execute on function public.shares_pet_with(uuid) from public, anon;
grant execute on function public.shares_pet_with(uuid) to authenticated;

-- veterinarians: read for collaborators, write for the owner only
drop policy if exists veterinarians_select on public.veterinarians;
create policy veterinarians_select on public.veterinarians for select to authenticated
  using (user_id = (select auth.uid()) or public.shares_pet_with(user_id));

-- emergency_contacts: same
drop policy if exists emergency_contacts_select on public.emergency_contacts;
create policy emergency_contacts_select on public.emergency_contacts for select to authenticated
  using (user_id = (select auth.uid()) or public.shares_pet_with(user_id));

-- insert/update/delete policies from 0002/0006 are unchanged and still require
-- user_id = auth.uid(), so collaborators get read access and nothing more.
