import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pin } from 'lucide-react'
import { noteSchema } from '@/schemas/records'
import { toRow } from '@/schemas/pet'
import { usePetCollection, useSaveRow, useDeleteRow } from '@/hooks/usePetRecords'
import { TextField, TextArea } from '@/components/ui/Field'
import { fmtDate } from '@/lib/format'
import type { Note } from '@/types/db'
import { EmptyState } from '@/components/ui/primitives'

type Form = z.infer<typeof noteSchema>

export default function NotesPanel({ petId }: { petId: string }) {
  const { data: notes } = usePetCollection<Note>('notes', petId, { column: 'created_at' })
  const save = useSaveRow('notes', petId)
  const remove = useDeleteRow('notes', petId)
  const [adding, setAdding] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({ resolver: zodResolver(noteSchema) })

  const onSubmit = handleSubmit(async v => { await save.mutateAsync({ values: toRow(v) }); reset(); setAdding(false) })
  // Pinned notes float to the top.
  const sorted = [...(notes ?? [])].sort((a, b) => Number(b.pinned) - Number(a.pinned))

  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl">Notes</h2>
        <button onClick={() => setAdding(a => !a)} className="btn btn-primary">{adding ? 'Close' : 'Add note'}</button>
      </div>
      {adding && (
        <form onSubmit={onSubmit} className="grid gap-3 surface p-5 mb-6" noValidate>
          <TextField label="Title (optional)" error={errors.title} {...register('title')} />
          <TextArea label="Note" error={errors.body} {...register('body')} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('pinned')} /> Pin to top</label>
          <button type="submit" className="btn btn-primary w-fit">Save note</button>
        </form>
      )}
      <ul className="space-y-3">
        {sorted.map(n => (
          <li key={n.id} className="surface p-4 flex justify-between gap-3">
            <div>
              <p className="font-medium flex items-center gap-1">
                {n.pinned && <Pin size={14} className="text-signal" aria-label="Pinned" />}
                {n.title || 'Note'} <span className="font-normal text-muted text-sm">· {fmtDate(n.created_at)}</span>
              </p>
              <p className="text-sm mt-1 whitespace-pre-wrap">{n.body}</p>
            </div>
            <button onClick={() => remove.mutate(n.id)} className="text-sm text-alert self-start">Delete</button>
          </li>
        ))}
      </ul>
      {notes?.length === 0 && <EmptyState title="No notes yet">Pill tricks, quirks, questions for the next vet visit: anything worth remembering.</EmptyState>}
    </section>
  )
}
