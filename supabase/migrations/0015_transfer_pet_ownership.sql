-- ============================================================================
-- Ownership transfer.
--
-- Needs an RPC rather than a plain UPDATE. pets_update allows an editor to edit
-- the pet, so permitting user_id changes through that policy would let any
-- editor seize a pet outright. Instead this is SECURITY DEFINER, gated on the
-- caller being the CURRENT owner, and performs the whole handover atomically:
--
--   1. the recipient must already be a member (you can't hand a pet to a
--      stranger — invite them first, so the transfer is never a surprise)
--   2. pets.user_id moves to the recipient
--   3. the recipient's now-redundant pet_shares row is removed (ownership is
--      expressed by pets.user_id, not by a share)
--   4. the outgoing owner is demoted to editor, so they keep working access
--      rather than losing the pet entirely by accident
--
-- Returns a status string; the UI maps it to a message. Deliberately does NOT
-- reveal whether an arbitrary user id exists.
-- ============================================================================
create or replace function public.transfer_pet_ownership(p_pet_id uuid, p_to_user uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then return 'not_authenticated'; end if;
  if not exists (select 1 from public.pets where id = p_pet_id and user_id = uid) then
    return 'not_owner';
  end if;
  if p_to_user = uid then return 'already_owner'; end if;
  if not exists (
    select 1 from public.pet_shares
     where pet_id = p_pet_id and user_id = p_to_user
       and (expires_at is null or expires_at > now())
  ) then
    return 'not_a_member';
  end if;

  update public.pets set user_id = p_to_user where id = p_pet_id;
  delete from public.pet_shares where pet_id = p_pet_id and user_id = p_to_user;

  insert into public.pet_shares (pet_id, user_id, role, invited_by)
  values (p_pet_id, uid, 'editor', p_to_user)
  on conflict (pet_id, user_id) do update set role = 'editor', expires_at = null;

  insert into public.activity_logs (user_id, action, entity, entity_id, metadata)
  values (uid, 'pet.ownership_transferred', 'pets', p_pet_id,
          jsonb_build_object('to_user', p_to_user));

  return 'ok';
end $$;

revoke execute on function public.transfer_pet_ownership(uuid, uuid) from public, anon;
grant execute on function public.transfer_pet_ownership(uuid, uuid) to authenticated;
