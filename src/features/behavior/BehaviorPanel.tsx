import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { behaviorSchema } from '@/schemas/records'
import { toRow } from '@/schemas/pet'
import { usePetCollection, useSaveRow, useDeleteRow } from '@/hooks/usePetRecords'
import { SelectField, TextField, TextArea } from '@/components/ui/Field'
import { fmtDate } from '@/lib/format'
import type { BehaviorNote } from '@/types/db'

type Form = z.infer<typeof behaviorSchema>

const CATEGORY_LABEL: Record<string, string> = {
  anxiety_trigger: 'Anxiety trigger', command: 'Command / training', milestone: 'Milestone',
  temperament: 'Temperament', socialization: 'Socialization', other: 'Other'
}

export default function BehaviorPanel({ petId }: { petId: string }) {
  const { data: notes } = usePetCollection<BehaviorNote>('behavior_notes', petId, { column: 'noted_on' })
  const save = useSaveRow('behavior_notes', petId)
  const remove = useDeleteRow('behavior_notes', petId)
  const [adding, setAdding] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(behaviorSchema),
    defaultValues: { category: 'milestone', noted_on: new Date().toISOString().slice(0, 10) }
  })

  const onSubmit = handleSubmit(async v => { await save.mutateAsync({ values: toRow(v) }); reset(); setAdding(false) })

  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl">Behavior & training</h2>
        <button onClick={() => setAdding(a => !a)} className="rounded-md bg-ink text-paper px-4 py-2 text-sm">{adding ? 'Close' : 'Add note'}</button>
      </div>
      {adding && (
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-5 mb-6" noValidate>
          <SelectField label="Category" error={errors.category} {...register('category')}>
            {Object.entries(CATEGORY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </SelectField>
          <TextField label="Date" type="date" error={errors.noted_on} {...register('noted_on')} />
          <div className="sm:col-span-2"><TextArea label="Note" error={errors.content} {...register('content')} /></div>
          <button type="submit" className="rounded-md bg-moss text-paper px-5 py-2 w-fit">Save</button>
        </form>
      )}
      <ul className="space-y-3">
        {notes?.map(n => (
          <li key={n.id} className="bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-4 flex justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-moss">{CATEGORY_LABEL[n.category] ?? n.category} · {fmtDate(n.noted_on)}</p>
              <p className="text-sm mt-1">{n.content}</p>
            </div>
            <button onClick={() => remove.mutate(n.id)} className="text-sm text-alert self-start">Delete</button>
          </li>
        ))}
      </ul>
      {notes?.length === 0 && <p className="text-sm text-ink/50">No behavior notes yet.</p>}
    </section>
  )
}
