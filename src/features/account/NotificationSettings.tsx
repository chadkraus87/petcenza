import { Bell, BellOff, Moon } from 'lucide-react'
import { useNotificationSettings, useUpdateNotificationSettings } from '@/hooks/useNotificationSettings'
import type { NotificationSettings as Settings } from '@/types/db'

const KINDS: { col: keyof Settings; label: string; help: string }[] = [
  { col: 'medication',       label: 'Medications',   help: 'Doses and refill reminders' },
  { col: 'feeding',          label: 'Feeding',       help: 'Scheduled meals' },
  { col: 'vaccination',      label: 'Vaccinations',  help: 'Boosters coming due' },
  { col: 'vet_appointments', label: 'Vet visits',    help: 'Upcoming appointments' },
  { col: 'grooming',         label: 'Grooming',      help: 'Baths, nails, teeth' },
  { col: 'birthdays',        label: 'Birthdays',     help: 'Pet birthdays' },
  { col: 'custom',           label: 'Custom',        help: 'Anything you added yourself' }
]

export default function NotificationSettings() {
  const { data: settings, isLoading } = useNotificationSettings()
  const update = useUpdateNotificationSettings()

  const permission = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  const blocked = permission === 'denied'

  if (isLoading) return (
    <section className="bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-6">
      <p className="text-sm text-muted">Loading notification settings…</p>
    </section>
  )

  const set = (patch: Partial<Settings>) => update.mutate(patch)

  return (
    <section className="bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-6">
      <div className="flex items-center gap-2 mb-1">
        {settings?.browser_push ? <Bell className="text-moss" aria-hidden /> : <BellOff className="text-muted" aria-hidden />}
        <h2 className="text-xl">Notifications</h2>
      </div>
      <p className="text-sm text-muted mb-4">
        Reminders can raise a browser notification while PetCenza is open.
      </p>

      {blocked && (
        <p role="alert" className="text-sm text-alert mb-4">
          Your browser is blocking notifications for this site. Re-allow them in your browser's
          site settings — PetCenza can't undo that from here.
        </p>
      )}
      {permission === 'unsupported' && (
        <p className="text-sm text-muted mb-4">This browser doesn't support notifications.</p>
      )}

      <label className="flex items-start gap-3 mb-5">
        <input type="checkbox" className="mt-1" checked={settings?.browser_push ?? false}
          onChange={e => set({ browser_push: e.target.checked })} />
        <span>
          <span className="block font-medium">Browser notifications</span>
          <span className="block text-sm text-muted">Master switch — turn this off to silence everything.</span>
        </span>
      </label>

      <fieldset disabled={!settings?.browser_push} className="disabled:opacity-50">
        <legend className="text-sm font-medium mb-2">What to notify me about</legend>
        <div className="grid gap-2 sm:grid-cols-2 mb-5">
          {KINDS.map(({ col, label, help }) => (
            <label key={col} className="flex items-start gap-2">
              <input type="checkbox" className="mt-1"
                checked={Boolean(settings?.[col])}
                onChange={e => set({ [col]: e.target.checked } as Partial<Settings>)} />
              <span>
                <span className="block text-sm">{label}</span>
                <span className="block text-xs text-muted">{help}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-2">
          <Moon size={16} className="text-calm" aria-hidden />
          <span className="text-sm font-medium">Quiet hours</span>
        </div>
        <p className="text-xs text-muted mb-2">
          Nothing will notify you between these times. Leave both blank to disable. A window that
          crosses midnight (say 22:00 to 07:00) works as you'd expect.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="qh-start" className="block text-sm mb-1">From</label>
            <input id="qh-start" type="time" value={settings?.quiet_hours_start?.slice(0, 5) ?? ''}
              onChange={e => set({ quiet_hours_start: e.target.value || null })}
              className="rounded-md border border-line px-3 py-2 bg-card" />
          </div>
          <div>
            <label htmlFor="qh-end" className="block text-sm mb-1">Until</label>
            <input id="qh-end" type="time" value={settings?.quiet_hours_end?.slice(0, 5) ?? ''}
              onChange={e => set({ quiet_hours_end: e.target.value || null })}
              className="rounded-md border border-line px-3 py-2 bg-card" />
          </div>
          {(settings?.quiet_hours_start || settings?.quiet_hours_end) && (
            <button onClick={() => set({ quiet_hours_start: null, quiet_hours_end: null })}
              className="rounded-md border border-line px-4 py-2 text-sm">Clear</button>
          )}
        </div>
      </fieldset>
    </section>
  )
}
