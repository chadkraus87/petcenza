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
