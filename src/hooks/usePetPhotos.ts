import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/**
 * Primary photo per pet, as signed URLs.
 *
 * Fetched for ALL pets in one query and signed in a single batch call, so the pet list doesn't
 * fire N round-trips. Buckets are private, so every render needs fresh signed URLs — they're
 * cached for slightly less than their one-hour TTL to avoid serving one that expires mid-view.
 */
export function usePrimaryPhotos() {
  return useQuery({
    queryKey: ['primary_photos'],
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase.from('pet_photos')
        .select('pet_id, storage_path, is_primary, created_at')
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error

      // First row per pet wins: an explicit primary, else the most recent upload.
      const chosen = new Map<string, string>()
      for (const row of data ?? []) {
        if (!chosen.has(row.pet_id)) chosen.set(row.pet_id, row.storage_path)
      }
      if (chosen.size === 0) return {}

      const paths = [...chosen.values()]
      const { data: signed } = await supabase.storage.from('pet-photos').createSignedUrls(paths, 3600)
      const urlFor = new Map((signed ?? []).map(s => [s.path, s.signedUrl]))

      const out: Record<string, string> = {}
      for (const [petId, path] of chosen) {
        const url = urlFor.get(path)
        if (url) out[petId] = url
      }
      return out
    },
    staleTime: 50 * 60 * 1000,   // just under the signed-URL lifetime
    gcTime: 55 * 60 * 1000
  })
}

/**
 * A write blocked by RLS is not an error — Postgres just filters the row out and reports success
 * on zero rows. Selecting the affected rows back is the only way to tell "done" from "silently
 * refused", which for a viewer clicking an editor-only control is the difference between a clear
 * message and a button that appears broken.
 */
const NOT_ALLOWED = 'You have view-only access to this pet, so you can\'t change its photos.'

/** Promote one photo to be the pet's primary. A unique partial index allows only one. */
export function useSetPrimaryPhoto(petId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (photoId: string) => {
      // Clear the existing primary first — pet_photos_one_primary is a unique index, so setting
      // a second one in place would violate it.
      const { error: clearErr } = await supabase.from('pet_photos')
        .update({ is_primary: false }).eq('pet_id', petId).eq('is_primary', true)
      if (clearErr) throw clearErr

      const { data, error } = await supabase.from('pet_photos')
        .update({ is_primary: true }).eq('id', photoId).select('id')
      if (error) throw error
      if (!data || data.length === 0) throw new Error(NOT_ALLOWED)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['pet_photos', petId] })
      qc.invalidateQueries({ queryKey: ['primary_photos'] })
    }
  })
}

export function useDeletePhoto(petId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, storagePath }: { id: string; storagePath: string }) => {
      // Row first, then the file. The reverse order strands a row pointing at a deleted object
      // if the second step fails, which renders as a permanently broken image in the album.
      // Failing the other way just leaves an unreferenced file, which nobody ever sees.
      const { data, error } = await supabase.from('pet_photos').delete().eq('id', id).select('id')
      if (error) throw error
      if (!data || data.length === 0) throw new Error(NOT_ALLOWED)

      await supabase.storage.from('pet-photos').remove([storagePath])
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['pet_photos', petId] })
      qc.invalidateQueries({ queryKey: ['primary_photos'] })
    }
  })
}
