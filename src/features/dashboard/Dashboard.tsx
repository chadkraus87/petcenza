import { Link } from 'react-router-dom'
import { format, isToday, parseISO } from 'date-fns'
import {
  AlertTriangle, CalendarClock, Check, CheckCircle2, ChevronRight, Clock, Info, OctagonAlert, PawPrint, Pill, Plus,
  ShieldAlert, Stethoscope, Syringe
} from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { useInsights } from '@/hooks/useInsights'
import { useMedSchedule } from '@/hooks/useMedSchedule'
import { useCompleteReminder } from '@/hooks/useReminders'
import { useReminderNotifications } from '@/hooks/useNotifications'
import { usePrimaryPhotos } from '@/hooks/usePetPhotos'
import { findLog, useDoseLogs } from '@/hooks/useDoseLogs'
import { DoseToggle } from '@/features/medications/DoseToggle'
import { buildToday, actionCount, type Urgency } from '@/lib/today'
import { buildDayPlan, currentSlot, TIME_LABEL, TIME_ORDER } from '@/lib/medSchedule'
import { fmtDate } from '@/lib/format'
import { PetAvatar } from '@/components/PetAvatar'
import { Disclaimer, DISCLAIMER } from '@/components/Disclaimer'
import { Button, ButtonLink, Card, EmptyState, PageHeader, PageSkeleton } from '@/components/ui/primitives'

const TONE: Record<Urgency, { icon: typeof Info; chip: string; label: string }> = {
  // Distinct shapes, not just colours: TriangleAlert and AlertTriangle are the same Lucide glyph.
  urgent:    { icon: OctagonAlert,  chip: 'bg-alert/10 text-alert',   label: 'Urgent' },
  attention: { icon: AlertTriangle, chip: 'bg-signal/10 text-signal', label: 'Needs attention' },
  due:       { icon: Clock,         chip: 'bg-wave text-moss',        label: 'Due today' },
  info:      { icon: Info,          chip: 'bg-paper text-muted',      label: 'For your information' }
}

/**
 * Today answers one question: does anything need attention? Everything that asks something of
 * the user is one ranked list, with medication rounds directly beneath it because that's the
 * thing people come back for every day. Upcoming dates, safety facts and pets sit to the side.
 */
export default function Dashboard() {
  const { data, isLoading, error, refetch } = useDashboard()
  const { data: insights } = useInsights()
  const { data: meds } = useMedSchedule()
  const { data: photos } = usePrimaryPhotos()
  const { data: doseLogs } = useDoseLogs()
  const complete = useCompleteReminder()
  useReminderNotifications(data?.remindersToday)

  if (isLoading) return <PageSkeleton />
  if (error || !data) {
    return (
      <main className="px-4 py-6 sm:px-6 lg:px-8 max-w-lg mx-auto">
        <Card className="p-6">
          <EmptyState icon={<AlertTriangle size={20} />} title="Couldn't load today"
            action={<Button onClick={() => void refetch()}>Try again</Button>}>
            Check your connection. Anything you saved offline is still queued and will sync.
          </EmptyState>
        </Card>
      </main>
    )
  }

  // A brand-new account has nothing to be "clear" about. Saying "All clear today" to someone who
  // hasn't added a pet yet is false comfort; show them how to start instead.
  if (data.pets.length === 0) return <FirstRun />

  const petName = (id: string | null) => data.pets.find(p => p.id === id)?.name ?? 'Pet'
  const today = buildToday(insights ?? [], data.remindersToday)
  const todayIso = new Date().toISOString().slice(0, 10)

  const plan = buildDayPlan(meds ?? [])
  const now = currentSlot()
  const nextSlot = TIME_ORDER.slice(TIME_ORDER.indexOf(now)).find(s => plan.bySlot[s].length > 0)
  // A dose from an earlier slot that nobody logged is the most important thing on this screen, so
  // it leads the rounds card and counts toward "things need you". Previously only the current slot
  // was shown and a missed morning dose simply vanished by midday.
  const missed = TIME_ORDER.slice(0, TIME_ORDER.indexOf(now)).flatMap(slot =>
    plan.bySlot[slot].filter(d => !findLog(doseLogs, d.med.id, slot)).map(d => ({ ...d, slot })))
  const doses = [
    ...missed,
    ...(nextSlot ? plan.bySlot[nextSlot].map(d => ({ ...d, slot: nextSlot })) : [])
  ]
  const needs = actionCount(today) + missed.length

  const comingUp = [
    ...data.vaxDue.filter(v => v.next_due_on && v.next_due_on >= todayIso)
      .map(v => ({ key: v.id, date: v.next_due_on!, title: v.vaccine, petId: v.pet_id, icon: Syringe })),
    ...data.visitsUpcoming.map(v => ({ key: v.id, date: v.visit_at, title: v.reason ?? 'Vet visit', petId: v.pet_id, icon: Stethoscope }))
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5)

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <PageHeader title="Today"
        subtitle={`${format(new Date(), 'EEEE, MMMM d')} · ${data.pets.length} ${data.pets.length === 1 ? 'pet' : 'pets'} in your care`} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] items-start">
        <div className="space-y-6">
          {/* ------------------------------------------------------------ needs you */}
          <Card aria-labelledby="needs-heading">
            <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
              <h2 id="needs-heading" className="text-xl">
                {needs === 0 ? 'All clear today' : `${needs} ${needs === 1 ? 'thing needs' : 'things need'} you`}
              </h2>
            </div>

            {today.length === 0 ? (
              <EmptyState icon={<CheckCircle2 size={22} />} title="Nothing needs you right now">
                Boosters, refills and weights all look current, and no reminders are due.
              </EmptyState>
            ) : (
              <ul className="divide-y divide-line">
                {today.map(item => {
                  const tone = TONE[item.urgency]
                  const Icon = tone.icon
                  return (
                    <li key={item.key} className="flex items-center gap-3 px-5 py-3">
                      <span className={`grid place-items-center size-9 rounded-full shrink-0 ${tone.chip}`}>
                        <Icon size={17} aria-hidden />
                      </span>
                      {(() => {
                        // The whole text block is the tap target, not just the title's line box.
                        const text = (
                          <>
                            {(item.urgency === 'urgent' || item.urgency === 'attention') && (
                              <span className={`block text-xs font-semibold ${item.urgency === 'urgent' ? 'text-alert' : 'text-signal'}`}>{tone.label}</span>
                            )}
                            <span className="block font-medium">{item.title}</span>
                            <span className="block text-sm text-muted">
                              {item.detail}
                              {item.dueAt && item.urgency === 'due' && <> at {format(parseISO(item.dueAt), 'h:mm a')}</>}
                              {item.dueAt && item.detail === 'Overdue' && (
                                <>, was due {isToday(parseISO(item.dueAt)) ? format(parseISO(item.dueAt), 'h:mm a') : format(parseISO(item.dueAt), 'MMM d')}</>
                              )}
                            </span>
                          </>
                        )
                        return item.petId
                          ? <Link to={`/pets/${item.petId}`} className="min-w-0 flex-1 py-1 min-h-11 rounded-lg hover:text-moss">{text}</Link>
                          : <div className="min-w-0 flex-1 py-1">{text}</div>
                      })()}
                      {item.reminderId && (
                        <Button variant="secondary" className="shrink-0 px-3"
                          // Only the row being completed is busy; the others stay usable.
                          disabled={complete.isPending && complete.variables === item.reminderId}
                          onClick={() => complete.mutate(item.reminderId!)}
                          aria-label={`Mark "${item.title}" done`}>
                          <Check size={16} aria-hidden /> Done
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            <div className="px-5 pb-4 pt-2"><Disclaimer text={DISCLAIMER.insights} /></div>
          </Card>

          {/* ------------------------------------------------------------ med rounds */}
          {doses.length > 0 && (
            <Card aria-labelledby="rounds-heading">
              <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
                <h2 id="rounds-heading" className="text-xl flex items-center gap-2">
                  <Pill size={19} className="text-moss" aria-hidden /> Medication rounds
                </h2>
                {nextSlot && <span className="text-sm text-muted">{nextSlot === now ? 'Now' : 'Next'}: {TIME_LABEL[nextSlot]}</span>}
              </div>
              <ul className="divide-y divide-line">
                {doses.map(({ med, schedule, slot }) => (
                  <li key={`${med.id}-${slot}`} className="flex items-center gap-3 px-5 py-3">
                    <PetAvatar name={med.petName} url={photos?.[med.petId]} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{med.name} <span className="font-normal text-muted">{med.dosage}</span></p>
                      <p className="text-sm text-muted">
                        for {med.petName}{schedule.withFood && ', with food'}
                        {slot !== nextSlot && <>, {TIME_LABEL[slot].toLowerCase()} dose</>}
                      </p>
                    </div>
                    <DoseToggle petId={med.petId} petName={med.petName} medicationId={med.id} medName={med.name}
                      slot={slot} logs={doseLogs} />
                  </li>
                ))}
              </ul>
              <div className="px-5 pb-4 pt-2">
                <ButtonLink to="/meds" variant="ghost" className="-ml-3">All of today's rounds <ChevronRight size={16} aria-hidden /></ButtonLink>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {/* ------------------------------------------------------------ safety */}
          {data.severeAllergyPets.length > 0 && (
            <Card className="p-5 border-alert/40" role="note" aria-labelledby="safety-heading">
              <h2 id="safety-heading" className="text-lg flex items-center gap-2 mb-2">
                <ShieldAlert size={18} className="text-alert" aria-hidden /> Severe allergies
              </h2>
              <ul className="space-y-1 text-sm">
                {data.severeAllergyPets.map((a, i) => (
                  <li key={i}><span className="font-medium">{petName(a.pet_id)}</span>: {a.allergen}
                    <span className="text-muted"> ({a.severity.replace('_', '-')})</span></li>
                ))}
              </ul>
            </Card>
          )}

          {/* ------------------------------------------------------------ coming up */}
          <Card className="p-5" aria-labelledby="upcoming-heading">
            <h2 id="upcoming-heading" className="text-lg flex items-center gap-2 mb-3">
              <CalendarClock size={18} className="text-moss" aria-hidden /> Coming up
            </h2>
            {comingUp.length === 0 ? (
              <p className="text-sm text-muted">Nothing scheduled in the next 30 days.</p>
            ) : (
              <ul className="space-y-3">
                {comingUp.map(({ key, date, title, petId, icon: Icon }) => (
                  <li key={key} className="flex items-start gap-3">
                    <Icon size={16} className="text-muted mt-0.5 shrink-0" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{title} <span className="font-normal text-muted">· {petName(petId)}</span></p>
                      <p className="text-sm text-muted">{fmtDate(date)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* ------------------------------------------------------------ pets */}
          <Card className="p-5" aria-labelledby="pets-heading">
            <h2 id="pets-heading" className="text-lg mb-3">Your pets</h2>
            {data.pets.length === 0 ? (
              <EmptyState title="Add your first pet"
                action={<ButtonLink to="/pets/new"><Plus size={16} aria-hidden /> Add a pet</ButtonLink>}>
                Start with their name. Vaccinations, medications and reminders build from there.
              </EmptyState>
            ) : (
              <>
                <ul className="space-y-1 -mx-2">
                  {data.pets.map(p => (
                    <li key={p.id}>
                      <Link to={`/pets/${p.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-wave">
                        <PetAvatar name={p.name} url={photos?.[p.id]} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium truncate">{p.name}</span>
                          <span className="block text-sm text-muted truncate">{p.breed ?? p.species}</span>
                        </span>
                        <ChevronRight size={16} className="text-muted" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
                <ButtonLink to="/pets/new" variant="secondary" className="w-full mt-3"><Plus size={16} aria-hidden /> Add a pet</ButtonLink>
              </>
            )}
          </Card>
        </div>
      </div>
    </main>
  )
}

const FIRST_STEPS = [
  { icon: PawPrint, title: 'Add your pet', body: 'Start with a name. Birth date, microchip and insurance can all come later.' },
  { icon: Syringe, title: 'Record their vaccinations', body: 'Add each vaccine with its next due date, and you’ll get a reminder a week before the booster is due.' },
  { icon: Pill, title: 'Add any medications', body: 'Prescriptions appear in your daily medication rounds, with a reminder before each refill.' }
]

function FirstRun() {
  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <PageHeader title="Welcome to PetCenza"
        subtitle="Set up a record your vet, your sitter and your family can rely on." />
      <Card className="p-6 sm:p-8">
        <ol className="space-y-6">
          {FIRST_STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="flex gap-4">
              <span className="grid place-items-center size-11 shrink-0 rounded-full bg-wave text-moss" aria-hidden>
                <Icon size={20} />
              </span>
              <div>
                <p className="font-display text-lg"><span className="sr-only">Step {i + 1}: </span>{title}</p>
                <p className="text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ol>
        <ButtonLink to="/pets/new" className="mt-8 w-full sm:w-auto"><Plus size={16} aria-hidden /> Add your first pet</ButtonLink>
      </Card>
    </main>
  )
}
