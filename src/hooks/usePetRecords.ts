import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { enqueue } from '@/lib/outbox'
import { showToast } from '@/components/ui/Toast'

/** Generic per-pet child collection: medications, allergies, vaccinations, weight_entries, vet_visits… */
export function usePetCollection<T>(table: string, petId: string, orderBy: { column: string; ascending?: boolean }) {
  return useQuery({
    queryKey: [table, petId],
    // Rows waiting out their undo window stay hidden even if a refetch or realtime sync brings
    // them back before the delete has actually been sent.
    select: (rows: T[]) => rows.filter(r => !pendingDeletes.has((r as { id?: string }).id ?? '')),
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

const UNDO_MS = 6000
const pendingDeletes = new Set<string>()

/** Best human name for a record, for "Levothyroxine deleted" rather than "Record deleted". */
function labelOf(row: Record<string, unknown> | undefined) {
  const v = row && (row.name ?? row.vaccine ?? row.allergen ?? row.title ?? row.task ?? row.reason ?? row.label ?? row.food_brand)
  return typeof v === 'string' && v.trim() ? v.trim() : 'Record'
}

/**
 * Delete with a 6-second Undo. Health records used to vanish on a single tap with no way back.
 *
 * The row is hidden at once, but the real delete is only sent after the undo window. Undo
 * therefore never has to reverse anything on the server or in the offline outbox, because
 * nothing was sent. ponytail: closing the app inside the window cancels the delete and keeps
 * the record — deliberately failing toward keeping health data; flush on pagehide if that ever
 * surprises people.
 */
export function useDeleteRow(table: string, petId: string) {
  const qc = useQueryClient()
  const key = [table, petId]

  // A plain function, not a mutation bound to this component: the panel may well unmount (you
  // switch tabs) before the undo window closes, and the delete must still be sent.
  async function send(id: string) {
    try {
      if (!navigator.onLine) await enqueue({ table, op: 'delete', payload: {}, rowId: id })
      else {
        const { error } = await supabase.from(table).delete().eq('id', id)
        if (error) throw error
      }
    } catch {
      showToast('Couldn’t delete that record. It’s been restored.')
    } finally {
      pendingDeletes.delete(id)
      void qc.invalidateQueries({ queryKey: key })
    }
  }

  return {
    mutate(id: string) {
      type Row = Record<string, unknown>
      const cached = qc.getQueryData<Row[]>(key) ?? []
      const index = cached.findIndex(r => r.id === id)
      const row = cached[index]
      // Remove it from the cache outright. (Copying the array to force a re-render does nothing:
      // structural sharing sees identical data and keeps the old reference.)
      pendingDeletes.add(id)
      qc.setQueryData<Row[]>(key, old => old?.filter(r => r.id !== id))
      const timer = setTimeout(() => void send(id), UNDO_MS)
      showToast(`${labelOf(row)} deleted`, () => {
        clearTimeout(timer)
        pendingDeletes.delete(id)
        if (row) qc.setQueryData<Row[]>(key, old => {
          if (!old || old.some(r => r.id === id)) return old
          const next = [...old]; next.splice(Math.min(index, next.length), 0, row); return next
        })
      }, UNDO_MS)
    }
  }
}
