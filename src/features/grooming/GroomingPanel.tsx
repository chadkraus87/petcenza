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
        <button onClick={() => setAdding(a => !a)} className="rounded-md bg-ink text-paper px-4 py-2 text-sm">{adding ? 'Close' : 'Log grooming'}</button>
      </div>
      {adding && (
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-5 mb-6" noValidate>
          <TextField label="Task" error={errors.task} {...register('task')} placeholder="Bath, nail trim, teeth…" />
          <TextField label="Date" type="date" error={errors.done_on} {...register('done_on')} />
          <div className="sm:col-span-2"><TextArea label="Notes" error={errors.notes} {...register('notes')} /></div>
          <button type="submit" className="rounded-md bg-moss text-paper px-5 py-2 w-fit">Save</button>
        </form>
      )}
      <ul className="space-y-3">
        {logs?.map(l => (
          <li key={l.id} className="bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-4 flex justify-between gap-3">
            <div>
              <p className="font-medium">{l.task} <span className="font-normal text-muted">· {fmtDate(l.done_on)}</span></p>
              {l.notes && <p className="text-sm text-muted mt-1">{l.notes}</p>}
            </div>
            <button onClick={() => remove.mutate(l.id)} className="text-sm text-alert self-start">Delete</button>
          </li>
        ))}
      </ul>
      {logs?.length === 0 && <p className="text-sm text-muted">No grooming logged yet.</p>}
    </section>
  )
}
