import { useEffect } from 'react'
import { differenceInMinutes, parseISO } from 'date-fns'
import type { Reminder } from '@/types/db'

/** Browser notifications for due reminders. Checks each minute while the app is open. */
export function useReminderNotifications(reminders: Reminder[] | undefined) {
  useEffect(() => {
    if (!reminders?.length || !('Notification' in window)) return
    if (Notification.permission === 'default') void Notification.requestPermission()
    const fired = new Set<string>()
    const tick = () => {
      if (Notification.permission !== 'granted') return
      for (const r of reminders) {
        if (r.completed_at || fired.has(r.id)) continue
        const mins = differenceInMinutes(parseISO(r.due_at), new Date())
        if (mins <= 0 && mins > -60) {
          new Notification('PetCenza reminder', { body: r.title, tag: r.id })
          fired.add(r.id)
        }
      }
    }
    tick()
    const t = setInterval(tick, 60_000)
    return () => clearInterval(t)
  }, [reminders])
}
