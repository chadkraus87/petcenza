import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { medicationSchema } from '@/schemas/records'
import { toRow } from '@/schemas/pet'
import { usePetCollection, useSaveRow, useDeleteRow } from '@/hooks/usePetRecords'
import { TextField, TextArea } from '@/components/ui/Field'
import VetSelect from '@/components/ui/VetSelect'
import { fmtDate } from '@/lib/format'
import { isMedicationActive, type Medication } from '@/types/db'

type Form = z.infer<typeof medicationSchema>

export default function MedicationsPanel({ petId }: { petId: string }) {
  const { data: meds } = usePetCollection<Medication>('medications', petId, { column: 'starts_on' })
  const save = useSaveRow('medications', petId)
  const remove = useDeleteRow('medications', petId)
  const [adding, setAdding] = useState(false)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(medicationSchema) })

  const onSubmit = handleSubmit(async v => {
    await save.mutateAsync({ values: toRow(v) })
    reset(); setAdding(false)
  })

  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl">Medications</h2>
        <button onClick={() => setAdding(a => !a)} className="rounded-md bg-ink text-paper px-4 py-2 text-sm">
          {adding ? 'Close' : 'Add medication'}
        </button>
      </div>

      {adding && (
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-5 mb-6" noValidate>
          <TextField label="Medication" error={errors.name} {...register('name')} />
          <TextField label="Dosage" error={errors.dosage} {...register('dosage')} placeholder="75 mg" />
          <TextField label="Frequency" error={errors.frequency} {...register('frequency')} placeholder="Twice daily with food" />
          <TextField label="Pharmacy" error={errors.pharmacy} {...register('pharmacy')} />
          <TextField label="Starts" type="date" error={errors.starts_on} {...register('starts_on')} />
          <TextField label="Ends (blank = ongoing)" type="date" error={errors.ends_on} {...register('ends_on')} />
          <TextField label="Refill due" type="date" error={errors.refill_due_on} {...register('refill_due_on')} />
          <VetSelect label="Prescriber" registration={register('prescriber_id')} />
          <div className="sm:col-span-2"><TextArea label="Administration instructions" error={errors.instructions} {...register('instructions')} /></div>
          <div className="sm:col-span-2"><TextArea label="Side effects to watch for" error={errors.side_effects} {...register('side_effects')} /></div>
          <button type="submit" disabled={isSubmitting} className="rounded-md bg-moss text-paper px-5 py-2 w-fit">Save medication</button>
        </form>
      )}

      <ul className="space-y-3">
        {meds?.map(m => (
          <li key={m.id} className={`bg-card rounded-card border p-4 ${isMedicationActive(m) ? 'border-line' : 'border-line opacity-60'}`}>
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-medium">{m.name} <span className="font-normal text-muted">{m.dosage} — {m.frequency}</span></p>
                <p className="text-sm text-muted">
                  {fmtDate(m.starts_on)}{m.ends_on ? ` → ${fmtDate(m.ends_on)}` : ' → ongoing'}
                  {m.refill_due_on && <span className="text-signal"> · refill by {fmtDate(m.refill_due_on)}</span>}
                </p>
                {m.instructions && <p className="text-sm mt-1">{m.instructions}</p>}
              </div>
              <button onClick={() => remove.mutate(m.id)} className="text-sm text-alert self-start">Delete</button>
            </div>
          </li>
        ))}
      </ul>
      {meds?.length === 0 && <p className="text-sm text-muted">No medications recorded.</p>}
    </section>
  )
}
