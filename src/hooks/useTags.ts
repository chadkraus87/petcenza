import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { theme } from '@/lib/theme'
import type { Tag } from '@/types/db'

/**
 * Tags are personal to each account (RLS on `tags` is user-scoped), while the pet↔tag join is
 * pet-scoped. A collaborator can therefore see that a shared pet HAS tags but can't resolve the
 * labels — the embedded `tags` row comes back null and is filtered out below, so it degrades to
 * "no tags shown" rather than rendering blanks. Migration 0014 opens tag reads to collaborators;
 * until it's applied, tags are effectively an owner-only feature.
 */

/** Palette offered when creating a tag — drawn from the app's own tokens. */
export const TAG_COLORS = [theme.moss, theme.calm, theme.coral, theme.signal, theme.alert, theme.ink]

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: async (): Promise<Tag[]> => {
      const { data, error } = await supabase.from('tags').select('*').order('name')
      if (error) throw error
      return data as Tag[]
    }
  })
}

/** Tags currently attached to one pet. */
export function usePetTags(petId: string) {
  return useQuery({
    queryKey: ['pet_tags', petId],
    queryFn: async (): Promise<Tag[]> => {
      const { data, error } = await supabase.from('pet_tags')
        .select('tag_id, tags(id, user_id, name, color)')
        .eq('pet_id', petId)
      if (error) throw error
      type Row = { tags: Tag | null }
      return ((data ?? []) as unknown as Row[]).map(r => r.tags).filter((t): t is Tag => t !== null)
    },
    enabled: !!petId
  })
}

/** Every pet→tag pairing, for filtering the pet list without an N+1. */
export function useAllPetTags() {
  return useQuery({
    queryKey: ['pet_tags'],
    queryFn: async (): Promise<{ pet_id: string; tag_id: string }[]> => {
      const { data, error } = await supabase.from('pet_tags').select('pet_id, tag_id')
      if (error) throw error
      return data as { pet_id: string; tag_id: string }[]
    }
  })
}

export function useCreateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const { data, error } = await supabase.from('tags')
        .insert({ user_id: user.id, name: name.trim(), color })
        .select().single()
      if (error) throw error
      return data as Tag
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['tags'] })
  })
}

export function useDeleteTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // pet_tags rows cascade with the tag, so no manual cleanup.
      const { error } = await supabase.from('tags').delete().eq('id', id)
      if (error) throw error
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tags'] })
      qc.invalidateQueries({ queryKey: ['pet_tags'] })
    }
  })
}

export function useAssignTag(petId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (tagId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const { error } = await supabase.from('pet_tags')
        .insert({ pet_id: petId, tag_id: tagId, user_id: user.id })
      if (error) throw error
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['pet_tags', petId] })
      qc.invalidateQueries({ queryKey: ['pet_tags'] })
    }
  })
}

export function useUnassignTag(petId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase.from('pet_tags')
        .delete().eq('pet_id', petId).eq('tag_id', tagId)
      if (error) throw error
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['pet_tags', petId] })
      qc.invalidateQueries({ queryKey: ['pet_tags'] })
    }
  })
}
