import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { groomingSchema } from '@/schemas/records'
import { toRow } from '@/schemas/pet'
import { usePetCollection, useSaveRow, useDeleteRow } from '@/hooks/usePetRecords'
import { TextField, TextArea } from '@/components/ui/Field'
import { fmtDate } from '@/lib/format'
import type { GroomingLog } from '@/types/db'
import { EmptyState } from '@/components/ui/primitives'

type Form = z.infer<typeof groomingSchema>

export default function GroomingPanel({ petId }: { petId: string }) {
  const { data: logs } = usePetCollection<GroomingLog>('grooming_logs', petId, { column: 'done_on' })
  const save = useSaveRow('grooming_logs', petId)
  const remove = useDeleteRow('grooming_logs', petId)
  const [adding, setAdding] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(groomingSchema),
    defaultValues: { done_on: new Date().toISOString().slice(0, 10) }
  })

  const onSubmit = handleSubmit(async v => { await save.mutateAsync({ values: toRow(v) }); reset(); setAdding(false) })

  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl">Grooming</h2>
        <button onClick={() => setAdding(a => !a)} className="btn btn-primary">{adding ? 'Close' : 'Log grooming'}</button>
      </div>
      {adding && (
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 surface p-5 mb-6" noValidate>
          <TextField label="Task" error={errors.task} {...register('task')} placeholder="Bath, nail trim, teeth…" />
          <TextField label="Date" type="date" error={errors.done_on} {...register('done_on')} />
          <div className="sm:col-span-2"><TextArea label="Notes" error={errors.notes} {...register('notes')} /></div>
          <button type="submit" className="btn btn-primary w-fit">Save</button>
        </form>
      )}
      <ul className="space-y-3">
        {logs?.map(l => (
          <li key={l.id} className="surface p-4 flex justify-between gap-3">
            <div>
              <p className="font-medium">{l.task} <span className="font-normal text-muted">· {fmtDate(l.done_on)}</span></p>
              {l.notes && <p className="text-sm text-muted mt-1">{l.notes}</p>}
            </div>
            <button onClick={() => remove.mutate(l.id)} aria-label={`Delete ${l.task}`}
                className="btn btn-ghost text-alert hover:bg-alert/10 self-start -mr-2">Delete</button>
          </li>
        ))}
      </ul>
      {logs?.length === 0 && <EmptyState title="Nothing logged yet">Track nail trims, baths and grooming appointments so you know when the next one is due.</EmptyState>}
    </section>
  )
}
