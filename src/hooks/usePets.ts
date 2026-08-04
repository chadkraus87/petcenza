import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { enqueue } from '@/lib/outbox'
import type { Pet } from '@/types/db'

export function usePets() {
  return useQuery({
    queryKey: ['pets'],
    queryFn: async (): Promise<Pet[]> => {
      const { data, error } = await supabase.from('pets').select('*').eq('archived', false).order('name')
      if (error) throw error
      return data
    }
  })
}

/**
 * Pets that have passed away. Kept out of usePets (which excludes archived rows) so the main
 * list stays about animals currently in your care, without hiding the records entirely.
 */
export function useRememberedPets() {
  return useQuery({
    queryKey: ['pets', 'remembered'],
    queryFn: async (): Promise<Pet[]> => {
      const { data, error } = await supabase.from('pets').select('*')
        .not('deceased_on', 'is', null).order('deceased_on', { ascending: false })
      if (error) throw error
      return data
    }
  })
}

export function usePet(id: string) {
  return useQuery({
    queryKey: ['pets', id],
    queryFn: async (): Promise<Pet> => {
      const { data, error } = await supabase.from('pets').select('*').eq('id', id).single()
      if (error) throw error
      return data
    },
    // Without this the "Add a pet" screen (no :id in the route) fired `id=eq.` with an empty
    // value, which PostgREST rejects — three 400s per mount once retries are counted.
    enabled: !!id
  })
}

/**
 * Marks a pet as having passed away (or undoes it). A DB trigger cancels every pending reminder
 * for that pet and stops new auto-reminders — records are kept, the nagging stops.
 */
export function useMarkDeceased() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, on }: { id: string; on: string | null }) => {
      const { error } = await supabase.from('pets')
        .update({ deceased_on: on, archived: on !== null }).eq('id', id)
      if (error) throw error
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['pets'] })
      qc.invalidateQueries({ queryKey: ['reminders'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['insights'] })
    }
  })
}

/** Permanently deletes a pet and everything attached to it. Primary owner only (RLS). */
export function useDeletePet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pets').delete().eq('id', id)
      if (error) throw error
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['pets'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['insights'] })
    }
  })
}

export function useSavePet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: Record<string, unknown> }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const row = { ...values, user_id: user.id }
      if (!navigator.onLine) {
        await enqueue(id ? { table: 'pets', op: 'update', payload: row, rowId: id } : { table: 'pets', op: 'insert', payload: row })
        return
      }
      const q = supabase.from('pets')
      const { error } = id ? await q.update(row).eq('id', id) : await q.insert(row)
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['pets'] })
  })
}
