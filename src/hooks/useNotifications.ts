import { useEffect } from 'react'
import { differenceInMinutes, parseISO } from 'date-fns'
import { useNotificationSettings, shouldNotify } from './useNotificationSettings'
import type { Reminder } from '@/types/db'

/**
 * Browser notifications for due reminders. Checks each minute while the app is open.
 *
 * Honours notification_settings: the master browser_push switch, the per-kind toggles, and
 * quiet hours. This previously fired for every reminder regardless of preferences, which made
 * the settings table decorative.
 *
 * Permission is only requested once something is actually due and push is enabled — prompting on
 * first page load is the pattern browsers penalise and users reflexively decline.
 */
export function useReminderNotifications(reminders: Reminder[] | undefined) {
  const { data: settings } = useNotificationSettings()

  useEffect(() => {
    if (!reminders?.length || !('Notification' in window)) return
    if (settings && !settings.browser_push) return

    const fired = new Set<string>()
    const tick = () => {
      const due = reminders.filter(r => {
        if (r.completed_at || fired.has(r.id)) return false
        const mins = differenceInMinutes(parseISO(r.due_at), new Date())
        return mins <= 0 && mins > -60
      })
      if (due.length === 0) return

      if (Notification.permission === 'default') { void Notification.requestPermission(); return }
      if (Notification.permission !== 'granted') return

      for (const r of due) {
        // Mark as fired either way, so a suppressed reminder isn't re-evaluated every minute.
        if (shouldNotify(settings, r.kind)) {
          new Notification('PetCenza reminder', { body: r.title, tag: r.id })
        }
        fired.add(r.id)
      }
    }
    tick()
    const t = setInterval(tick, 60_000)
    return () => clearInterval(t)
  }, [reminders, settings])
}
