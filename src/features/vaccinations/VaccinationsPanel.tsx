import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isBefore, parseISO, addDays } from 'date-fns'
import { vaccinationSchema } from '@/schemas/records'
import { toRow } from '@/schemas/pet'
import { usePetCollection, useSaveRow, useDeleteRow } from '@/hooks/usePetRecords'
import { TextField } from '@/components/ui/Field'
import VetSelect from '@/components/ui/VetSelect'
import { fmtDate } from '@/lib/format'
import type { Vaccination } from '@/types/db'

type Form = z.infer<typeof vaccinationSchema>

function dueStatus(nextDue: string | null): 'overdue' | 'soon' | 'ok' | null {
  if (!nextDue) return null
  const d = parseISO(nextDue)
  if (isBefore(d, new Date())) return 'overdue'
  if (isBefore(d, addDays(new Date(), 30))) return 'soon'
  return 'ok'
}

export default function VaccinationsPanel({ petId }: { petId: string }) {
  const { data: vax } = usePetCollection<Vaccination>('vaccinations', petId, { column: 'next_due_on', ascending: true })
  const save = useSaveRow('vaccinations', petId)
  const remove = useDeleteRow('vaccinations', petId)
  const [adding, setAdding] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({ resolver: zodResolver(vaccinationSchema) })

  const onSubmit = handleSubmit(async v => { await save.mutateAsync({ values: toRow(v) }); reset(); setAdding(false) })

  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl">Vaccinations</h2>
        <button onClick={() => setAdding(a => !a)} className="rounded-md bg-ink text-paper px-4 py-2 text-sm">{adding ? 'Close' : 'Add vaccination'}</button>
      </div>
      {adding && (
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-5 mb-6" noValidate>
          <TextField label="Vaccine" error={errors.vaccine} {...register('vaccine')} placeholder="Rabies (3-yr)" />
          <TextField label="Lot number" error={errors.lot_no} {...register('lot_no')} />
          <TextField label="Administered on" type="date" error={errors.administered_on} {...register('administered_on')} />
          <TextField label="Next booster due" type="date" error={errors.next_due_on} {...register('next_due_on')} />
          <VetSelect label="Administered by" registration={register('veterinarian_id')} />
          <button type="submit" className="rounded-md bg-moss text-paper px-5 py-2 w-fit">Save vaccination</button>
        </form>
      )}
      <ul className="space-y-3">
        {vax?.map(v => {
          const status = dueStatus(v.next_due_on)
          return (
            <li key={v.id} className="bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-4 flex justify-between gap-3">
              <div>
                <p className="font-medium">{v.vaccine}</p>
                <p className="text-sm text-ink/60">
                  {v.administered_on && <>Given {fmtDate(v.administered_on)}</>}
                  {v.next_due_on && (
                    <span className={status === 'overdue' ? 'text-alert font-medium' : status === 'soon' ? 'text-signal' : ''}>
                      {' '}· Next due {fmtDate(v.next_due_on)}{status === 'overdue' && ' — overdue'}
                    </span>
                  )}
                </p>
              </div>
              <button onClick={() => remove.mutate(v.id)} className="text-sm text-alert self-start">Delete</button>
            </li>
          )
        })}
      </ul>
      {vax?.length === 0 && <p className="text-sm text-ink/50">No vaccinations recorded.</p>}
    </section>
  )
}
