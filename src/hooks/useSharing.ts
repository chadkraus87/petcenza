import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PetMember, PetInvitation, ShareRole, VetShareLink, VetShareSnapshot } from '@/types/db'

/** Owner + collaborators for a pet. Served by the pet_members() RPC because
 *  profiles/auth.users aren't directly readable by other members. */
export function usePetMembers(petId: string) {
  return useQuery({
    queryKey: ['pet_members', petId],
    queryFn: async (): Promise<PetMember[]> => {
      const { data, error } = await supabase.rpc('pet_members', { p_pet_id: petId })
      if (error) throw error
      return (data ?? []) as PetMember[]
    },
    enabled: !!petId
  })
}

/** Outstanding invitations. Only the pet owner can read these (RLS). */
export function usePetInvitations(petId: string) {
  return useQuery({
    queryKey: ['pet_invitations', petId],
    queryFn: async (): Promise<PetInvitation[]> => {
      const { data, error } = await supabase.from('pet_invitations').select('*')
        .eq('pet_id', petId).is('accepted_at', null).is('revoked_at', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as PetInvitation[]
    },
    enabled: !!petId
  })
}

/** True when the signed-in user owns this pet (owners alone can manage sharing). */
export function useIsPetOwner(petId: string) {
  return useQuery({
    queryKey: ['is_pet_owner', petId],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.rpc('is_pet_owner', { p_pet_id: petId })
      if (error) throw error
      return data === true
    },
    enabled: !!petId
  })
}

/**
 * True only for the PRIMARY owner (pets.user_id) — distinct from useIsPetOwner, which also
 * returns true for co-owners. Deleting the pet, transferring it, and granting co-ownership are
 * restricted to the primary owner.
 */
export function useIsPrimaryPetOwner(petId: string) {
  return useQuery({
    queryKey: ['is_primary_pet_owner', petId],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.rpc('is_primary_pet_owner', { p_pet_id: petId })
      if (error) throw error
      return data === true
    },
    enabled: !!petId
  })
}

/** True when the signed-in user may modify this pet's records (owner or editor). */
export function useCanEditPet(petId: string) {
  return useQuery({
    queryKey: ['can_edit_pet', petId],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.rpc('can_access_pet', { p_pet_id: petId, p_min_role: 'editor' })
      if (error) throw error
      return data === true
    },
    enabled: !!petId
  })
}

/** Hand a pet to an existing member. Returns the RPC's status code. */
export function useTransferOwnership(petId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (toUserId: string): Promise<string> => {
      const { data, error } = await supabase.rpc('transfer_pet_ownership', {
        p_pet_id: petId, p_to_user: toUserId
      })
      if (error) throw error
      return data as string
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['pet_members', petId] })
      qc.invalidateQueries({ queryKey: ['is_pet_owner', petId] })
      qc.invalidateQueries({ queryKey: ['pets'] })
    }
  })
}

export function useCreateInvitation(petId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ role, email }: { role: Exclude<ShareRole, 'owner'>; email?: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const { data, error } = await supabase.from('pet_invitations')
        .insert({
          pet_id: petId,
          role,
          invited_email: email?.trim() ? email.trim().toLowerCase() : null,
          invited_by: user.id
        })
        .select().single()
      if (error) throw error
      return data as PetInvitation
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['pet_invitations', petId] })
  })
}

export function useRevokeInvitation(petId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pet_invitations')
        .update({ revoked_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['pet_invitations', petId] })
  })
}

export function useUpdateMemberRole(petId: string) {
  const qc = useQueryClient()
  return useMutation({
    // 'owner' here means CO-owner. A DB trigger restricts granting it to the primary owner.
    mutationFn: async ({ userId, role }: { userId: string; role: ShareRole }) => {
      const { error } = await supabase.from('pet_shares')
        .update({ role }).eq('pet_id', petId).eq('user_id', userId)
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['pet_members', petId] })
  })
}

/** Removes a collaborator. Also used by a member to leave a pet themselves —
 *  the delete policy allows both the owner and the member in question. */
export function useRemoveMember(petId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from('pet_shares')
        .delete().eq('pet_id', petId).eq('user_id', userId)
      if (error) throw error
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['pet_members', petId] })
      qc.invalidateQueries({ queryKey: ['pets'] })
    }
  })
}

/** Redeem an invitation token. Returns the RPC's status code. */
export async function acceptInvitation(token: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_pet_invitation', { p_token: token })
  if (error) throw error
  return data as string
}

// ---------------------------------------------------------------- vet links

export function useVetShareLinks(petId: string) {
  return useQuery({
    queryKey: ['pet_share_links', petId],
    queryFn: async (): Promise<VetShareLink[]> => {
      const { data, error } = await supabase.from('pet_share_links').select('*')
        .eq('pet_id', petId).is('revoked_at', null).order('created_at', { ascending: false })
      if (error) throw error
      return data as VetShareLink[]
    },
    enabled: !!petId
  })
}

export function useCreateVetShareLink(petId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ label, days }: { label: string; days: number }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const expires = new Date(Date.now() + days * 86_400_000).toISOString()
      const { data, error } = await supabase.from('pet_share_links')
        .insert({ pet_id: petId, label: label.trim() || null, created_by: user.id, expires_at: expires })
        .select().single()
      if (error) throw error
      return data as VetShareLink
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['pet_share_links', petId] })
  })
}

export function useRevokeVetShareLink(petId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pet_share_links')
        .update({ revoked_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['pet_share_links', petId] })
  })
}

/**
 * Fetch a read-only snapshot for a vet-share token. Hits the public edge function directly —
 * no Supabase session is involved, because the viewer has no account.
 */
export async function fetchVetShare(token: string): Promise<VetShareSnapshot> {
  const base = import.meta.env.VITE_SUPABASE_URL
  const res = await fetch(`${base}/functions/v1/vet-share?token=${encodeURIComponent(token)}`)
  const body = await res.json().catch(() => ({ error: 'unavailable' }))
  if (!res.ok) throw new Error(body?.error ?? 'unavailable')
  return body as VetShareSnapshot
}
