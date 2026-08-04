import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { NotificationSettings, ReminderKind } from '@/types/db'

/**
 * Per-user notification preferences. The row is created by the handle_new_user trigger, so this
 * only ever reads and updates — there is no insert path (and no insert policy).
 */
export function useNotificationSettings() {
  return useQuery({
    queryKey: ['notification_settings'],
    queryFn: async (): Promise<NotificationSettings | null> => {
      const { data, error } = await supabase.from('notification_settings').select('*').maybeSingle()
      if (error) throw error
      return data
    }
  })
}

export function useUpdateNotificationSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<NotificationSettings>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const { error } = await supabase.from('notification_settings').update(patch).eq('user_id', user.id)
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['notification_settings'] })
  })
}

/**
 * Reminder kinds and settings columns don't line up one-to-one — the columns were pluralised
 * for two of them. Map explicitly rather than guessing at runtime.
 */
const KIND_COLUMN: Record<ReminderKind, keyof NotificationSettings> = {
  feeding: 'feeding',
  medication: 'medication',
  grooming: 'grooming',
  vaccination: 'vaccination',
  birthday: 'birthdays',
  vet_appointment: 'vet_appointments',
  custom: 'custom'
}

/** Is a reminder of this kind allowed to raise a browser notification right now? */
export function shouldNotify(
  settings: NotificationSettings | null | undefined,
  kind: ReminderKind,
  now = new Date()
): boolean {
  if (!settings) return true                 // no prefs loaded yet — don't silently swallow alerts
  if (!settings.browser_push) return false
  if (settings[KIND_COLUMN[kind]] === false) return false
  return !inQuietHours(settings, now)
}

/**
 * Quiet hours are stored as bare `time` values with no date, so they're compared as local
 * minutes-since-midnight. A window that wraps past midnight (22:00 → 07:00) is handled by
 * treating start > end as "either side of midnight".
 */
export function inQuietHours(settings: NotificationSettings, now = new Date()): boolean {
  const { quiet_hours_start: start, quiet_hours_end: end } = settings
  if (!start || !end) return false
  const mins = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + (m || 0)
  }
  const s = mins(start), e = mins(end), n = now.getHours() * 60 + now.getMinutes()
  return s <= e ? (n >= s && n < e) : (n >= s || n < e)
}
