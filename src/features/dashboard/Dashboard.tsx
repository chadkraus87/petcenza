import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import {
  AlertTriangle, CalendarClock, Check, CheckCircle2, ChevronRight, Clock, Info, Pill, Plus,
  ShieldAlert, Stethoscope, Syringe, TriangleAlert
} from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { useInsights } from '@/hooks/useInsights'
import { useMedSchedule } from '@/hooks/useMedSchedule'
import { useCompleteReminder } from '@/hooks/useReminders'
import { useReminderNotifications } from '@/hooks/useNotifications'
import { usePrimaryPhotos } from '@/hooks/usePetPhotos'
import { buildToday, actionCount, type Urgency } from '@/lib/today'
import { buildDayPlan, currentSlot, TIME_LABEL, TIME_ORDER } from '@/lib/medSchedule'
import { fmtDate } from '@/lib/format'
import { PetAvatar } from '@/components/PetAvatar'
import { Disclaimer, DISCLAIMER } from '@/components/Disclaimer'
import { Button, ButtonLink, Card, EmptyState, PageHeader, PageSkeleton } from '@/components/ui/primitives'

const TONE: Record<Urgency, { icon: typeof Info; chip: string; label: string }> = {
  urgent:    { icon: TriangleAlert, chip: 'bg-alert/10 text-alert',   label: 'Urgent' },
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
  const complete = useCompleteReminder()
  useReminderNotifications(data?.remindersToday)

  if (isLoading) return <PageSkeleton />
  if (error || !data) {
    return (
      <main className="p-6 max-w-lg mx-auto">
        <Card className="p-6">
          <EmptyState icon={<AlertTriangle size={20} />} title="Couldn't load today"
            action={<Button onClick={() => void refetch()}>Try again</Button>}>
            Check your connection. Anything you saved offline is still queued and will sync.
          </EmptyState>
        </Card>
      </main>
    )
  }

  const petName = (id: string | null) => data.pets.find(p => p.id === id)?.name ?? 'Pet'
  const today = buildToday(insights ?? [], data.remindersToday)
  const needs = actionCount(today)
  const todayIso = new Date().toISOString().slice(0, 10)

  const plan = buildDayPlan(meds ?? [])
  const now = currentSlot()
  const nextSlot = TIME_ORDER.slice(TIME_ORDER.indexOf(now)).find(s => plan.bySlot[s].length > 0)
  const doses = nextSlot ? plan.bySlot[nextSlot] : []

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
                        <span className="sr-only">{tone.label}</span>
                      </span>
                      {(() => {
                        // The whole text block is the tap target, not just the title's line box.
                        const text = (
                          <>
                            <span className="block font-medium">{item.title}</span>
                            <span className="block text-sm text-muted">
                              {item.detail}
                              {item.dueAt && item.urgency === 'due' && <> at {format(parseISO(item.dueAt), 'h:mm a')}</>}
                            </span>
                          </>
                        )
                        return item.petId
                          ? <Link to={`/pets/${item.petId}`} className="min-w-0 flex-1 py-1 min-h-11 rounded-lg hover:text-moss">{text}</Link>
                          : <div className="min-w-0 flex-1 py-1">{text}</div>
                      })()}
                      {item.reminderId && (
                        <Button variant="secondary" className="shrink-0 px-3"
                          disabled={complete.isPending}
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
          {doses.length > 0 && nextSlot && (
            <Card aria-labelledby="rounds-heading">
              <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
                <h2 id="rounds-heading" className="text-xl flex items-center gap-2">
                  <Pill size={19} className="text-moss" aria-hidden /> Medication rounds
                </h2>
                <span className="text-sm text-muted">{nextSlot === now ? 'Now' : 'Next'}: {TIME_LABEL[nextSlot]}</span>
              </div>
              <ul className="divide-y divide-line">
                {doses.map(({ med, schedule }) => (
                  <li key={`${med.id}-${nextSlot}`} className="flex items-center gap-3 px-5 py-3">
                    <PetAvatar name={med.petName} url={photos?.[med.petId]} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{med.name} <span className="font-normal text-muted">{med.dosage}</span></p>
                      <p className="text-sm text-muted">for {med.petName}{schedule.withFood && ' · with food'}</p>
                    </div>
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
