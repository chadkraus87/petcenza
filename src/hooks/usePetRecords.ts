import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { enqueue } from '@/lib/outbox'

/** Generic per-pet child collection: medications, allergies, vaccinations, weight_entries, vet_visits… */
export function usePetCollection<T>(table: string, petId: string, orderBy: { column: string; ascending?: boolean }) {
  return useQuery({
    queryKey: [table, petId],
    queryFn: async (): Promise<T[]> => {
      const { data, error } = await supabase.from(table).select('*').eq('pet_id', petId)
        .order(orderBy.column, { ascending: orderBy.ascending ?? false })
      if (error) throw error
      return data as T[]
    },
    enabled: !!petId
  })
}

export function useSaveRow(table: string, petId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values, baseUpdatedAt }: { id?: string; values: Record<string, unknown>; baseUpdatedAt?: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const row = { ...values, user_id: user.id, pet_id: petId }
      if (!navigator.onLine) {
        await enqueue(id
          ? { table, op: 'update', payload: row, rowId: id, baseUpdatedAt }
          : { table, op: 'insert', payload: row })
        return
      }
      const q = supabase.from(table)
      const { error } = id ? await q.update(row).eq('id', id) : await q.insert(row)
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [table, petId] })
  })
}

export function useDeleteRow(table: string, petId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      if (!navigator.onLine) { await enqueue({ table, op: 'delete', payload: {}, rowId: id }); return }
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [table, petId] })
  })
}
