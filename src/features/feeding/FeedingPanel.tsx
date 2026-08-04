import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { feedingSchema } from '@/schemas/records'
import { toRow } from '@/schemas/pet'
import { usePetCollection, useSaveRow, useDeleteRow } from '@/hooks/usePetRecords'
import { TextField } from '@/components/ui/Field'
import type { FeedingSchedule } from '@/types/db'

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
        <button onClick={() => setAdding(a => !a)} className="rounded-md bg-ink text-paper px-4 py-2 text-sm">{adding ? 'Close' : 'Add feeding'}</button>
      </div>
      {adding && (
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-3 bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-5 mb-6" noValidate>
          <TextField label="Label" error={errors.label} {...register('label')} placeholder="Breakfast" />
          <TextField label="Time" type="time" error={errors.feed_time} {...register('feed_time')} />
          <TextField label="Portion" error={errors.portion} {...register('portion')} placeholder="1 cup kibble" />
          <button type="submit" className="rounded-md bg-moss text-paper px-5 py-2 w-fit">Save</button>
        </form>
      )}
      <ul className="space-y-3">
        {feeds?.map(f => (
          <li key={f.id} className="bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-4 flex justify-between gap-3">
            <div>
              <p className="font-medium">{f.label} <span className="font-normal text-ink/70">· {f.feed_time?.slice(0, 5)}</span></p>
              {f.portion && <p className="text-sm text-ink/60">{f.portion}</p>}
            </div>
            <button onClick={() => remove.mutate(f.id)} className="text-sm text-alert self-start">Delete</button>
          </li>
        ))}
      </ul>
      {feeds?.length === 0 && <p className="text-sm text-ink/50">No feeding times set.</p>}
    </section>
  )
}
