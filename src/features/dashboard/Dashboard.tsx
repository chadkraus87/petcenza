import { Link } from 'react-router-dom'
import { AlertTriangle, Check } from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { useCompleteReminder } from '@/hooks/useReminders'
import { useReminderNotifications } from '@/hooks/useNotifications'
import { fmtDate, fmtDateTime } from '@/lib/format'

export default function Dashboard() {
  const { data, isLoading, error } = useDashboard()
  const complete = useCompleteReminder()
  useReminderNotifications(data?.remindersToday)

  if (isLoading) return <p className="p-6 text-ink/50">Loading your pack…</p>
  if (error) return <p className="p-6 text-alert">Couldn't load the dashboard. Check your connection and retry.</p>
  if (!data) return null

  const petName = (id: string | null) => data.pets.find(p => p.id === id)?.name ?? 'Pet'

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl mb-1">Today</h1>
      <p className="text-ink/60 mb-6">{data.pets.length} pet{data.pets.length !== 1 && 's'} in your care</p>

      {data.severeAllergyPets.length > 0 && (
        <div role="alert" className="mb-6 rounded-card border border-alert bg-alert/5 p-4 flex gap-3">
          <AlertTriangle className="text-alert shrink-0" aria-hidden />
          <div>
            <p className="font-medium text-alert">Severe allergies on file</p>
            <ul className="text-sm">
              {data.severeAllergyPets.map((a, i) => (
                <li key={i}>{petName(a.pet_id)}: {a.allergen} ({a.severity.replace('_', '-')})</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="bg-card rounded-card border border-line p-4">
          <h2 className="text-lg mb-3">Due today</h2>
          {data.remindersToday.length === 0 && <p className="text-sm text-ink/50">Nothing due. Enjoy the quiet.</p>}
          <ul className="space-y-2">
            {data.remindersToday.map(r => (
              <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">
                  {r.title} <span className="text-ink/50">· {petName(r.pet_id)}</span>
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <time className="text-signal">{fmtDateTime(r.due_at).split('·')[1]}</time>
                  <button onClick={() => complete.mutate(r.id)} title="Mark done"
                    aria-label={`Mark "${r.title}" done`}
                    className="rounded-md border border-line p-1 hover:border-moss hover:text-moss">
                    <Check size={14} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-card rounded-card border border-line p-4">
          <h2 className="text-lg mb-3">Vaccinations due soon</h2>
          {data.vaxDue.length === 0 && <p className="text-sm text-ink/50">All boosters current for the next 30 days.</p>}
          <ul className="space-y-2">
            {data.vaxDue.map(v => (
              <li key={v.id} className="flex justify-between text-sm">
                <span>{v.vaccine} <span className="text-ink/50">· {petName(v.pet_id)}</span></span>
                {v.next_due_on && <time className="text-signal">{fmtDate(v.next_due_on)}</time>}
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-card rounded-card border border-line p-4">
          <h2 className="text-lg mb-3">Active medications</h2>
          {data.medsActive.length === 0 && <p className="text-sm text-ink/50">No active prescriptions.</p>}
          <ul className="space-y-2">
            {data.medsActive.map(m => (
              <li key={m.id} className="text-sm">
                <span className="font-medium">{m.name}</span> {m.dosage} — {m.frequency}
                <span className="text-ink/50"> · {petName(m.pet_id)}</span>
                {m.refill_due_on && <span className="block text-xs text-signal">Refill by {fmtDate(m.refill_due_on)}</span>}
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-card rounded-card border border-line p-4">
          <h2 className="text-lg mb-3">Upcoming vet visits</h2>
          {data.visitsUpcoming.length === 0 && <p className="text-sm text-ink/50">No appointments scheduled.</p>}
          <ul className="space-y-2">
            {data.visitsUpcoming.map(v => (
              <li key={v.id} className="text-sm">
                <span className="font-medium">{v.reason ?? 'Vet visit'}</span>
                <span className="text-ink/50"> · {petName(v.pet_id)}</span>
                <time className="block text-xs text-moss">{fmtDateTime(v.visit_at)}</time>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {data.pets.map(p => (
          <Link key={p.id} to={`/pets/${p.id}`}
            className="rounded-card border border-line bg-card px-4 py-3 hover:border-moss">
            <span className="font-display">{p.name}</span>
            <span className="block text-xs text-ink/50">{p.breed ?? p.species}</span>
          </Link>
        ))}
        <Link to="/pets/new" className="rounded-card border border-dashed border-moss text-moss px-4 py-3 grid place-items-center">
          + Add a pet
        </Link>
      </div>
    </main>
  )
}
