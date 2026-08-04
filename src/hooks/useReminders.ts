import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { moveToDay } from '@/lib/format'
import type { Reminder } from '@/types/db'

/**
 * Reminders: create, complete, snooze.
 *
 * Completing a recurring reminder does NOT need client work — the
 * reminders_recurrence trigger (migration 0004) creates the next occurrence
 * when completed_at goes from null to set.
 *
 * Snoozing deliberately moves due_at forward instead of touching completed_at,
 * so it never triggers regeneration and every existing "what's due" query keeps
 * working unchanged. snoozed_until records that it was postponed.
 */

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['reminders'] })
  qc.invalidateQueries({ queryKey: ['dashboard'] })
  qc.invalidateQueries({ queryKey: ['calendar'] })
}

/** Open reminders, soonest first. */
export function useReminders(limit = 50) {
  return useQuery({
    queryKey: ['reminders'],
    queryFn: async (): Promise<Reminder[]> => {
      const { data, error } = await supabase.from('reminders').select('*')
        .is('completed_at', null).order('due_at').limit(limit)
      if (error) throw error
      return data as Reminder[]
    }
  })
}

export function useCreateReminder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const { error } = await supabase.from('reminders').insert({ ...values, user_id: user.id })
      if (error) throw error
    },
    onSettled: () => invalidate(qc)
  })
}

/** Mark done. Recurring reminders regenerate server-side via the trigger. */
export function useCompleteReminder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('reminders')
        .update({ completed_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSettled: () => invalidate(qc)
  })
}

/** Push a reminder out by N hours. */
export function useSnoozeReminder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, hours }: { id: string; hours: number }) => {
      const until = new Date(Date.now() + hours * 3_600_000).toISOString()
      const { error } = await supabase.from('reminders')
        .update({ due_at: until, snoozed_until: until }).eq('id', id)
      if (error) throw error
    },
    onSettled: () => invalidate(qc)
  })
}

/**
 * Move a reminder to a different day, keeping its time of day.
 *
 * Dragging changes the DATE only — someone dropping a "morning meds" reminder on Thursday means
 * Thursday morning, not Thursday at whatever o'clock the cell happens to represent.
 */
export function useRescheduleReminder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, from, to }: { id: string; from: string; to: Date }) => {
      const { error } = await supabase.from('reminders')
        .update({ due_at: moveToDay(from, to).toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSettled: () => invalidate(qc)
  })
}

export function useDeleteReminder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('reminders').delete().eq('id', id)
      if (error) throw error
    },
    onSettled: () => invalidate(qc)
  })
}
