import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { visitSchema } from '@/schemas/records'
import { toRow } from '@/schemas/pet'
import { usePetCollection, useSaveRow, useDeleteRow } from '@/hooks/usePetRecords'
import { TextField, TextArea } from '@/components/ui/Field'
import VetSelect from '@/components/ui/VetSelect'
import { fmtDateTime } from '@/lib/format'
import type { VetVisit } from '@/types/db'
import { EmptyState } from '@/components/ui/primitives'

type Form = z.infer<typeof visitSchema>

export default function VisitsPanel({ petId }: { petId: string }) {
  const { data: visits } = usePetCollection<VetVisit>('vet_visits', petId, { column: 'visit_at' })
  const save = useSaveRow('vet_visits', petId)
  const remove = useDeleteRow('vet_visits', petId)
  const [adding, setAdding] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({ resolver: zodResolver(visitSchema) })

  const onSubmit = handleSubmit(async v => {
    await save.mutateAsync({ values: toRow({ ...v, visit_at: new Date(v.visit_at).toISOString() }) })
    reset(); setAdding(false)
  })

  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl">Vet visits</h2>
        <button onClick={() => setAdding(a => !a)} className="btn btn-primary">{adding ? 'Close' : 'Add visit'}</button>
      </div>
      {adding && (
        <form onSubmit={onSubmit} className="grid gap-3 surface p-5 mb-6" noValidate>
          <TextField label="Date & time" type="datetime-local" error={errors.visit_at} {...register('visit_at')} />
          <TextField label="Reason" error={errors.reason} {...register('reason')} />
          <VetSelect label="Veterinarian" registration={register('veterinarian_id')} />
          <TextArea label="Diagnosis" error={errors.diagnosis} {...register('diagnosis')} />
          <TextArea label="Treatment" error={errors.treatment} {...register('treatment')} />
          <TextArea label="Follow-up recommendations" error={errors.followup} {...register('followup')} />
          <button type="submit" className="btn btn-primary w-fit">Save visit</button>
        </form>
      )}
      <ul className="space-y-3">
        {visits?.map(v => (
          <li key={v.id} className="surface p-4 flex justify-between gap-3">
            <div>
              <p className="font-medium">{v.reason ?? 'Vet visit'}</p>
              <time className="text-sm text-moss">{fmtDateTime(v.visit_at)}</time>
              {v.diagnosis && <p className="text-sm mt-1">Diagnosis: {v.diagnosis}</p>}
              {v.treatment && <p className="text-sm">Treatment: {v.treatment}</p>}
              {v.followup && <p className="text-sm text-signal">Follow-up: {v.followup}</p>}
            </div>
            <button onClick={() => remove.mutate(v.id)} className="text-sm text-alert self-start">Delete</button>
          </li>
        ))}
      </ul>
      {visits?.length === 0 && <EmptyState title="No vet visits yet">Log each appointment to keep diagnoses, treatments and follow-ups in one place.</EmptyState>}
    </section>
  )
}
