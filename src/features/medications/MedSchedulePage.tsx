import { Link } from 'react-router-dom'
import { Pill, UtensilsCrossed, HelpCircle, CalendarClock, Hand } from 'lucide-react'
import { useMedSchedule, type MedWithPet } from '@/hooks/useMedSchedule'
import { usePrimaryPhotos } from '@/hooks/usePetPhotos'
import { PetAvatar } from '@/components/PetAvatar'
import {
  buildDayPlan, currentSlot, TIME_ORDER, TIME_LABEL,
  type ScheduledDose
} from '@/lib/medSchedule'

export default function MedSchedulePage() {
  const { data: meds, isLoading, error } = useMedSchedule()
  const { data: photos } = usePrimaryPhotos()

  if (isLoading) return <p className="p-6 text-ink/50">Loading today's doses…</p>
  if (error) return <p className="p-6 text-alert">Couldn't load the medication schedule. Check your connection and retry.</p>

  const plan = buildDayPlan(meds ?? [])
  const now = currentSlot()
  const activeSlots = TIME_ORDER.filter(slot => plan.bySlot[slot].length > 0)
  const nothingAtAll = (meds ?? []).length === 0

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl mb-1">Medication rounds</h1>
      <p className="text-ink/60 mb-6">
        Everything your pets are on right now, grouped by when it's given.
      </p>

      {nothingAtAll && (
        <p className="text-ink/60">
          Nobody is on medication right now. Anything you add on a pet's page shows up here.
        </p>
      )}

      {activeSlots.map(slot => (
        <section key={slot} className="mb-6">
          <h2 className="text-xl mb-3 flex items-center gap-2">
            {TIME_LABEL[slot]}
            {slot === now && (
              <span className="rounded-full bg-moss text-paper px-2 py-0.5 text-xs font-normal">
                Now
              </span>
            )}
            <span className="text-sm font-normal text-ink/50">
              {plan.bySlot[slot].length} {plan.bySlot[slot].length === 1 ? 'dose' : 'doses'}
            </span>
          </h2>
          <ul className="space-y-2">
            {plan.bySlot[slot].map(dose => (
              <DoseRow key={`${dose.med.id}-${slot}`} dose={dose} photos={photos} />
            ))}
          </ul>
        </section>
      ))}

      {plan.periodic.length > 0 && (
        <Group title="On a longer cycle" icon={<CalendarClock size={18} className="text-moss" aria-hidden />}
          note="Not necessarily due today — check the pet's page for the last dose.">
          {plan.periodic.map(d => <DoseRow key={d.med.id} dose={d} photos={photos} showCadence />)}
        </Group>
      )}

      {plan.asNeeded.length > 0 && (
        <Group title="As needed" icon={<Hand size={18} className="text-moss" aria-hidden />}
          note="Give only when the symptoms call for it.">
          {plan.asNeeded.map(d => <DoseRow key={d.med.id} dose={d} photos={photos} />)}
        </Group>
      )}

      {/* Never silently drop a med we couldn't parse — a missed dose matters more than a tidy list. */}
      {plan.unscheduled.length > 0 && (
        <Group title="Needs a clearer schedule" icon={<HelpCircle size={18} className="text-signal" aria-hidden />}
          note="We couldn't work out when these are given. Open the pet and reword the frequency — for example “Twice daily” or “q12h” — and they'll slot in above.">
          {plan.unscheduled.map(d => <DoseRow key={d.med.id} dose={d} photos={photos} />)}
        </Group>
      )}
    </main>
  )
}

function Group({ title, icon, note, children }: {
  title: string; icon: React.ReactNode; note: string; children: React.ReactNode
}) {
  return (
    <section className="mb-6">
      <h2 className="text-xl mt-8 mb-1 flex items-center gap-2">{icon} {title}</h2>
      <p className="text-sm text-ink/50 mb-3">{note}</p>
      <ul className="space-y-2">{children}</ul>
    </section>
  )
}

function DoseRow({ dose, photos, showCadence = false }: {
  dose: ScheduledDose<MedWithPet>
  photos?: Record<string, string>
  showCadence?: boolean
}) {
  const { med, schedule } = dose
  return (
    <li>
      <Link to={`/pets/${med.petId}`}
        className="flex items-center gap-3 bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-3 hover:border-moss">
        <PetAvatar name={med.petName} url={photos?.[med.petId]} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 flex-wrap">
            <span className="font-medium truncate">{med.name}</span>
            <span className="text-sm text-ink/60">{med.dosage}</span>
          </p>
          <p className="text-sm text-ink/60 truncate">
            for {med.petName}
            {showCadence && <> · {med.frequency}</>}
          </p>
          {med.instructions && (
            <p className="text-xs text-ink/50 truncate">{med.instructions}</p>
          )}
        </div>
        {schedule.withFood && (
          <span className="inline-flex items-center gap-1 rounded-full bg-wave text-ink/70 px-2 py-1 text-xs shrink-0"
            title="Give with food">
            <UtensilsCrossed size={12} aria-hidden /> With food
          </span>
        )}
        <Pill size={16} className="text-ink/30 shrink-0" aria-hidden />
      </Link>
    </li>
  )
}
