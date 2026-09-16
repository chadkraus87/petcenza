import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, isBefore, parseISO } from 'date-fns'
import { Check, Clock, Trash2, Repeat } from 'lucide-react'
import { reminderSchema } from '@/schemas/records'
import { toRow } from '@/schemas/pet'
import { usePets } from '@/hooks/usePets'
import { useReminders, useCreateReminder, useCompleteReminder, useSnoozeReminder, useDeleteReminder, useRescheduleReminder } from '@/hooks/useReminders'
import { TextField, SelectField } from '@/components/ui/Field'
import { fmtDateTime } from '@/lib/format'

type Form = z.infer<typeof reminderSchema>

const KIND_LABEL: Record<string, string> = {
  feeding: 'Feeding', medication: 'Medication', grooming: 'Grooming',
  vaccination: 'Vaccination', birthday: 'Birthday', vet_appointment: 'Vet appointment', custom: 'Custom'
}
const RECURRENCE_LABEL: Record<string, string> = {
  none: 'Does not repeat', daily: 'Daily', weekly: 'Weekly', biweekly: 'Every 2 weeks',
  monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly'
}

export default function RemindersPanel() {
  const { data: reminders } = useReminders()
  const { data: pets } = usePets()
  const create = useCreateReminder()
  const complete = useCompleteReminder()
  const snooze = useSnoozeReminder()
  const reschedule = useRescheduleReminder()
  const remove = useDeleteReminder()
  const [adding, setAdding] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(reminderSchema),
    defaultValues: { kind: 'custom', recurrence: 'none' }
  })

  const onSubmit = handleSubmit(async v => {
    await create.mutateAsync(toRow({ ...v, due_at: new Date(v.due_at).toISOString() }))
    reset({ kind: 'custom', recurrence: 'none' })
    setAdding(false)
  })

  const petName = (id: string | null) => pets?.find(p => p.id === id)?.name

  return (
    <section className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl">Reminders</h2>
        <button onClick={() => setAdding(a => !a)} className="btn btn-primary">
          {adding ? 'Close' : 'Add reminder'}
        </button>
      </div>

      {adding && (
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 surface p-5 mb-6" noValidate>
          <div className="sm:col-span-2">
            <TextField label="What's the reminder?" error={errors.title} {...register('title')}
              placeholder="Give Ranger his evening dose" />
          </div>
          <TextField label="When" type="datetime-local" error={errors.due_at} {...register('due_at')} />
          <SelectField label="Type" error={errors.kind} {...register('kind')}>
            {Object.entries(KIND_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </SelectField>
          <SelectField label="Repeats" error={errors.recurrence} {...register('recurrence')}>
            {Object.entries(RECURRENCE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </SelectField>
          <SelectField label="Pet (optional)" {...register('pet_id')}>
            <option value="">— No specific pet —</option>
            {pets?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </SelectField>
          <div className="sm:col-span-2">
            <button type="submit" disabled={isSubmitting}
              className="btn btn-primary w-fit">
              {isSubmitting ? 'Saving…' : 'Save reminder'}
            </button>
            <p className="text-xs text-muted mt-2">
              Repeating reminders create the next one automatically when you mark this one done.
            </p>
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {reminders?.map(r => {
          const overdue = isBefore(parseISO(r.due_at), new Date())
          return (
            <li key={r.id} className="surface p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {r.title}
                  {r.pet_id && <span className="font-normal text-muted"> · {petName(r.pet_id)}</span>}
                </p>
                <p className="text-xs flex items-center gap-2 flex-wrap">
                  <time className={overdue ? 'text-alert font-medium' : 'text-muted'}>
                    {fmtDateTime(r.due_at)}{overdue && ' — overdue'}
                  </time>
                  <span className="text-muted">{KIND_LABEL[r.kind] ?? r.kind}</span>
                  {r.recurrence !== 'none' && (
                    <span className="inline-flex items-center gap-1 text-muted">
                      <Repeat size={11} aria-hidden /> {RECURRENCE_LABEL[r.recurrence]}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => complete.mutate(r.id)} aria-label={`Mark "${r.title}" done`}
                  title="Mark done"
                  className="btn btn-primary">
                  <Check size={14} aria-hidden /> Done
                </button>
                {/* The keyboard and touch path for the calendar's drag-to-reschedule. Native date
                    input, same mutation. Parsed as a LOCAL date: new Date('YYYY-MM-DD') is UTC
                    midnight, which west of Greenwich is the previous evening. */}
                <input type="date"
                  aria-label={`Move "${r.title}" to another day`}
                  title="Move to another day"
                  value={format(parseISO(r.due_at), 'yyyy-MM-dd')}
                  onChange={e => {
                    const [y, m, d] = e.target.value.split('-').map(Number)
                    if (y && m && d) reschedule.mutate({ id: r.id, from: r.due_at, to: new Date(y, m - 1, d) })
                  }}
                  className="field w-auto" />
                <select
                  aria-label={`Snooze "${r.title}"`}
                  title="Snooze"
                  value=""
                  onChange={e => { if (e.target.value) snooze.mutate({ id: r.id, hours: Number(e.target.value) }) }}
                  className="field w-auto">
                  <option value="">Snooze…</option>
                  <option value="1">1 hour</option>
                  <option value="4">4 hours</option>
                  <option value="24">1 day</option>
                  <option value="168">1 week</option>
                </select>
                <button onClick={() => remove.mutate(r.id)} aria-label={`Delete "${r.title}"`}
                  className="text-alert px-1">
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {reminders?.length === 0 && (
        <p className="text-sm text-muted flex items-center gap-2">
          <Clock size={14} aria-hidden /> No open reminders.
        </p>
      )}
    </section>
  )
}
