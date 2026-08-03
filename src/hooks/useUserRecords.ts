import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { enqueue } from '@/lib/outbox'

/** User-scoped (not per-pet) collections: veterinarians, emergency_contacts. */
export function useUserCollection<T>(table: string, orderBy: { column: string; ascending?: boolean }) {
  return useQuery({
    queryKey: [table],
    queryFn: async (): Promise<T[]> => {
      const { data, error } = await supabase.from(table).select('*')
        .order(orderBy.column, { ascending: orderBy.ascending ?? true })
      if (error) throw error
      return data as T[]
    }
  })
}

export function useSaveUserRow(table: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: Record<string, unknown> }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const row = { ...values, user_id: user.id }
      if (!navigator.onLine) {
        await enqueue(id ? { table, op: 'update', payload: row, rowId: id } : { table, op: 'insert', payload: row })
        return
      }
      const q = supabase.from(table)
      const { error } = id ? await q.update(row).eq('id', id) : await q.insert(row)
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [table] })
  })
}

export function useDeleteUserRow(table: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      if (!navigator.onLine) { await enqueue({ table, op: 'delete', payload: {}, rowId: id }); return }
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [table] })
  })
}
