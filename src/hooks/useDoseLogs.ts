import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { enqueue } from '@/lib/outbox'
import { useAuth } from '@/features/auth/AuthProvider'
import { showToast } from '@/components/ui/Toast'
import { localDay, type TimeOfDay } from '@/lib/medSchedule'

export interface DoseLog {
  id: string; pet_id: string; medication_id: string; slot: TimeOfDay
  given_on: string; given_by: string | null; given_at: string
}

/** Every dose logged today across the household. Shared, so everyone sees the same answer. */
export function useDoseLogs(day = localDay()) {
  return useQuery({
    queryKey: ['dose_logs', day],
    queryFn: async (): Promise<DoseLog[]> => {
      const { data, error } = await supabase.from('dose_logs').select('*').eq('given_on', day)
      if (error) throw error
      return data as DoseLog[]
    }
  })
}

export const findLog = (logs: DoseLog[] | undefined, medicationId: string, slot: TimeOfDay) =>
  logs?.find(l => l.medication_id === medicationId && l.slot === slot)

/**
 * Mark a dose given, or take it back. Optimistic so the tap feels instant; queued through the
 * outbox when offline, like every other write.
 */
export function useToggleDose(day = localDay()) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const key = ['dose_logs', day]

  const mutation = useMutation({
    mutationFn: async ({ petId, medicationId, slot, log, id }:
      { petId: string; medicationId: string; slot: TimeOfDay; log?: DoseLog; id: string; label?: string }) => {
      if (log) {
        if (!navigator.onLine) { await enqueue({ table: 'dose_logs', op: 'delete', payload: {}, rowId: log.id }); return }
        const { error } = await supabase.from('dose_logs').delete().eq('id', log.id)
        if (error) throw error
        return
      }
      if (!user) throw new Error('Not signed in')
      // Client-generated id, so the optimistic row and the stored row are the same record and an
      // immediate Undo deletes the right one.
      const row = { id, pet_id: petId, medication_id: medicationId, slot, given_on: day, given_by: user.id }
      if (!navigator.onLine) { await enqueue({ table: 'dose_logs', op: 'insert', payload: row }); return }
      const { error } = await supabase.from('dose_logs').insert(row)
      // Someone else in the household logged the same dose a moment earlier. The dose WAS given,
      // which is all this action asserts, so that's success rather than an error.
      if (error && error.code !== '23505') throw error
    },
    onMutate: async ({ petId, medicationId, slot, log, id }) => {
      await qc.cancelQueries({ queryKey: key })
      const before = qc.getQueryData<DoseLog[]>(key)
      qc.setQueryData<DoseLog[]>(key, old => log
        ? (old ?? []).filter(l => l.id !== log.id)
        : [...(old ?? []), { id, pet_id: petId, medication_id: medicationId, slot, given_on: day, given_by: user?.id ?? null, given_at: new Date().toISOString() }])
      return { before }
    },
    onError: (_e, _v, ctx) => {
      qc.setQueryData(key, ctx?.before)
      showToast('Couldn’t record that dose. Please try again.')
    },
    onSuccess: (_d, v) => {
      // Confirm the anxious moment, and make a mis-tap reversible even if the row has moved.
      if (!v.log && v.label) {
        showToast(`${v.label} marked given`, () => mutation.mutate({
          ...v, label: undefined,
          log: { id: v.id, pet_id: v.petId, medication_id: v.medicationId, slot: v.slot, given_on: day, given_by: user?.id ?? null, given_at: '' }
        }))
      }
    },
    onSettled: () => { if (navigator.onLine) void qc.invalidateQueries({ queryKey: key }) }
  })
  return mutation
}
