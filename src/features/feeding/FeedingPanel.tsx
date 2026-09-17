import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { feedingSchema } from '@/schemas/records'
import { toRow } from '@/schemas/pet'
import { usePetCollection, useSaveRow, useDeleteRow } from '@/hooks/usePetRecords'
import { TextField } from '@/components/ui/Field'
import type { FeedingSchedule } from '@/types/db'
import { EmptyState } from '@/components/ui/primitives'

type Form = z.infer<typeof feedingSchema>

export default function FeedingPanel({ petId }: { petId: string }) {
  const { data: feeds } = usePetCollection<FeedingSchedule>('feeding_schedules', petId, { column: 'feed_time', ascending: true })
  const save = useSaveRow('feeding_schedules', petId)
  const remove = useDeleteRow('feeding_schedules', petId)
  const [adding, setAdding] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({ resolver: zodResolver(feedingSchema) })

  const onSubmit = handleSubmit(async v => { await save.mutateAsync({ values: toRow(v) }); reset(); setAdding(false) })

  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl">Feeding schedule</h2>
        <button onClick={() => setAdding(a => !a)} className="btn btn-primary">{adding ? 'Close' : 'Add feeding'}</button>
      </div>
      {adding && (
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-3 surface p-5 mb-6" noValidate>
          <TextField label="Label" error={errors.label} {...register('label')} placeholder="Breakfast" />
          <TextField label="Time" type="time" error={errors.feed_time} {...register('feed_time')} />
          <TextField label="Portion" error={errors.portion} {...register('portion')} placeholder="1 cup kibble" />
          <button type="submit" className="btn btn-primary w-fit">Save</button>
        </form>
      )}
      <ul className="space-y-3">
        {feeds?.map(f => (
          <li key={f.id} className="surface p-4 flex justify-between gap-3">
            <div>
              <p className="font-medium">{f.label} <span className="font-normal text-muted">· {f.feed_time?.slice(0, 5)}</span></p>
              {f.portion && <p className="text-sm text-muted">{f.portion}</p>}
            </div>
            <button onClick={() => remove.mutate(f.id)} aria-label={`Delete ${f.label}`}
                className="btn btn-ghost text-alert hover:bg-alert/10 self-start -mr-2">Delete</button>
          </li>
        ))}
      </ul>
      {feeds?.length === 0 && <EmptyState title="No feeding times set">Add each meal so everyone who cares for them feeds the same amount at the same time.</EmptyState>}
    </section>
  )
}
