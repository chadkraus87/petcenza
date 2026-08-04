import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { allergySchema } from '@/schemas/records'
import { toRow } from '@/schemas/pet'
import { usePetCollection, useSaveRow, useDeleteRow } from '@/hooks/usePetRecords'
import { SelectField, TextField, TextArea } from '@/components/ui/Field'
import SeverityBadge from '@/components/ui/SeverityBadge'
import type { Allergy } from '@/types/db'

type Form = z.infer<typeof allergySchema>

export default function AllergiesPanel({ petId }: { petId: string }) {
  const { data: allergies } = usePetCollection<Allergy>('allergies', petId, { column: 'severity' })
  const save = useSaveRow('allergies', petId)
  const remove = useDeleteRow('allergies', petId)
  const [adding, setAdding] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({ resolver: zodResolver(allergySchema) })

  const onSubmit = handleSubmit(async v => { await save.mutateAsync({ values: toRow(v) }); reset(); setAdding(false) })
  const sorted = [...(allergies ?? [])].sort((a, b) =>
    ['life_threatening','severe','moderate','mild'].indexOf(a.severity) - ['life_threatening','severe','moderate','mild'].indexOf(b.severity))

  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl">Allergies</h2>
        <button onClick={() => setAdding(a => !a)} className="rounded-md bg-ink text-paper px-4 py-2 text-sm">{adding ? 'Close' : 'Add allergy'}</button>
      </div>
      {adding && (
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-5 mb-6" noValidate>
          <SelectField label="Type" error={errors.allergy_type} {...register('allergy_type')}>
            <option value="food">Food</option><option value="medication">Medication</option>
            <option value="environmental">Environmental</option><option value="other">Other</option>
          </SelectField>
          <TextField label="Allergen" error={errors.allergen} {...register('allergen')} />
          <SelectField label="Severity" error={errors.severity} {...register('severity')}>
            <option value="mild">Mild</option><option value="moderate">Moderate</option>
            <option value="severe">Severe</option><option value="life_threatening">Life-threatening</option>
          </SelectField>
          <div className="sm:col-span-2"><TextArea label="Symptoms" error={errors.symptoms} {...register('symptoms')} /></div>
          <div className="sm:col-span-2"><TextArea label="Emergency treatment" error={errors.emergency_treatment} {...register('emergency_treatment')} /></div>
          <button type="submit" className="rounded-md bg-moss text-paper px-5 py-2 w-fit">Save allergy</button>
        </form>
      )}
      <ul className="space-y-3">
        {sorted.map(a => (
          <li key={a.id} className="bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-4">
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-medium">{a.allergen} <SeverityBadge severity={a.severity} /></p>
                <p className="text-xs uppercase tracking-wide text-ink/50">{a.allergy_type}</p>
                {a.symptoms && <p className="text-sm mt-1">Symptoms: {a.symptoms}</p>}
                {a.emergency_treatment && <p className="text-sm text-alert mt-1">Emergency: {a.emergency_treatment}</p>}
              </div>
              <button onClick={() => remove.mutate(a.id)} className="text-sm text-alert self-start">Delete</button>
            </div>
          </li>
        ))}
      </ul>
      {allergies?.length === 0 && <p className="text-sm text-ink/50">No known allergies.</p>}
    </section>
  )
}
