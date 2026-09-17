import { Link } from 'react-router-dom'
import { HelpCircle, CalendarClock, Hand } from 'lucide-react'
import { useMedSchedule, type MedWithPet } from '@/hooks/useMedSchedule'
import { usePrimaryPhotos } from '@/hooks/usePetPhotos'
import { useDoseLogs, type DoseLog } from '@/hooks/useDoseLogs'
import { DoseToggle } from './DoseToggle'
import { PetAvatar } from '@/components/PetAvatar'
import { Disclaimer, DISCLAIMER } from '@/components/Disclaimer'
import { PageSkeleton } from '@/components/ui/primitives'
import {
  buildDayPlan, currentSlot, TIME_ORDER, TIME_LABEL,
  type ScheduledDose, type TimeOfDay
} from '@/lib/medSchedule'

export default function MedSchedulePage() {
  const { data: meds, isLoading, error } = useMedSchedule()
  const { data: photos } = usePrimaryPhotos()
  const { data: logs } = useDoseLogs()

  if (isLoading) return <PageSkeleton />
  if (error) return <p className="p-6 text-alert">Couldn't load the medication schedule. Check your connection and retry.</p>

  const plan = buildDayPlan(meds ?? [])
  const now = currentSlot()
  const activeSlots = TIME_ORDER.filter(slot => plan.bySlot[slot].length > 0)
  const nothingAtAll = (meds ?? []).length === 0

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <h1 className="mb-1">Medication rounds</h1>
      <p className="text-muted mb-3">
        Everything your pets are on right now, grouped by when it's given.
      </p>
      <div className="mb-6 space-y-1">
        <Disclaimer text={DISCLAIMER.medication} />
        <Disclaimer text={DISCLAIMER.reminders} />
      </div>

      {nothingAtAll && (
        <p className="text-muted">
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
            <span className="text-sm font-normal text-muted">
              {plan.bySlot[slot].length} {plan.bySlot[slot].length === 1 ? 'dose' : 'doses'}
            </span>
          </h2>
          <ul className="space-y-2">
            {plan.bySlot[slot].map(dose => (
              <DoseRow key={`${dose.med.id}-${slot}`} dose={dose} photos={photos} slot={slot} logs={logs} />
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
      <p className="text-sm text-muted mb-3">{note}</p>
      <ul className="space-y-2">{children}</ul>
    </section>
  )
}

function DoseRow({ dose, photos, showCadence = false, slot, logs }: {
  dose: ScheduledDose<MedWithPet>
  photos?: Record<string, string>
  showCadence?: boolean
  slot?: TimeOfDay
  logs?: DoseLog[]
}) {
  const { med, schedule } = dose
  return (
    <li className="surface flex items-center gap-3 p-3">
      {/* The link and the toggle are siblings: a button nested inside a link is invalid and
          unpredictable for screen readers. */}
      <Link to={`/pets/${med.petId}?tab=medications`} className="flex items-center gap-3 min-w-0 flex-1 rounded-lg hover:text-moss">
        <PetAvatar name={med.petName} url={photos?.[med.petId]} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 flex-wrap">
            <span className="font-medium truncate">{med.name}</span>
            <span className="text-sm text-muted">{med.dosage}</span>
          </p>
          <p className="text-sm text-muted truncate">
            for {med.petName}
            {showCadence && <>, {med.frequency}</>}
            {/* Emphasised on purpose: some medications cause vomiting on an empty stomach. */}
            {schedule.withFood && <>, <span className="font-semibold text-ink">give with food</span></>}
          </p>
          {med.instructions && <p className="text-xs text-muted truncate">{med.instructions}</p>}
        </div>
      </Link>
      {slot && (
        <DoseToggle petId={med.petId} petName={med.petName} medicationId={med.id} medName={med.name}
          slot={slot} logs={logs} />
      )}
    </li>
  )
}
