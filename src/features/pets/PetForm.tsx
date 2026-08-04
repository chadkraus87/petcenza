import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useParams } from 'react-router-dom'
import { petSchema, toRow, yearsToMonths, monthsToYears, type PetForm as PetFormValues } from '@/schemas/pet'
import { usePet, useSavePet } from '@/hooks/usePets'
import { SelectField, TextField } from '@/components/ui/Field'

export default function PetForm() {
  const { id } = useParams()
  const isEdit = !!id && id !== 'new'
  const { data: pet } = usePet(isEdit ? id! : '')
  const save = useSavePet()
  const nav = useNavigate()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PetFormValues>({
    resolver: zodResolver(petSchema),
    values: isEdit && pet ? {
      name: pet.name, nickname: pet.nickname ?? '', species: pet.species, breed: pet.breed ?? '',
      is_mixed_breed: pet.is_mixed_breed, sex: pet.sex, birth_date: pet.birth_date ?? '',
      estimated_age_years: monthsToYears(pet.estimated_age_months), adoption_date: pet.adoption_date ?? '',
      rescue_org: pet.rescue_org ?? '', color: pet.color ?? '', goal_weight_kg: pet.goal_weight_kg ?? '',
      microchip_no: pet.microchip_no ?? '', activity_level: pet.activity_level ?? 'moderate'
    } : undefined
  })

  const onSubmit = handleSubmit(async values => {
    // The form collects years; the column is estimated_age_months.
    const { estimated_age_years, ...rest } = values
    const row = { ...toRow(rest), estimated_age_months: yearsToMonths(estimated_age_years) }
    await save.mutateAsync({ id: isEdit ? id : undefined, values: row })
    nav(isEdit ? `/pets/${id}` : '/pets')
  })

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl mb-6">{isEdit ? `Edit ${pet?.name ?? 'pet'}` : 'Add a pet'}</h1>
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-6" noValidate>
        <TextField label="Name" error={errors.name} {...register('name')} />
        <TextField label="Nickname" error={errors.nickname} {...register('nickname')} />
        <SelectField label="Species" error={errors.species} {...register('species')}>
          {['dog','cat','bird','rabbit','reptile','fish','horse','other'].map(s => <option key={s} value={s}>{s}</option>)}
        </SelectField>
        <TextField label="Breed" error={errors.breed} {...register('breed')} />
        <SelectField label="Sex" error={errors.sex} {...register('sex')}>
          <option value="male">Male</option><option value="female">Female</option>
          <option value="male_neutered">Male (neutered)</option><option value="female_spayed">Female (spayed)</option>
          <option value="unknown">Unknown</option>
        </SelectField>
        <label className="flex items-center gap-2 text-sm self-end pb-2">
          <input type="checkbox" {...register('is_mixed_breed')} /> Mixed breed
        </label>
        <TextField label="Birth date" type="date" error={errors.birth_date} {...register('birth_date')} />
        <TextField label="Estimated age (years, if birth date unknown)" type="number" step="0.5" min="0"
          error={errors.estimated_age_years as never} {...register('estimated_age_years')} />
        <TextField label="Adoption date" type="date" error={errors.adoption_date} {...register('adoption_date')} />
        <TextField label="Rescue organization" error={errors.rescue_org} {...register('rescue_org')} />
        <TextField label="Color / markings" error={errors.color} {...register('color')} />
        <TextField label="Goal weight (kg)" type="number" step="0.1" error={errors.goal_weight_kg as never} {...register('goal_weight_kg')} />
        <TextField label="Microchip number" error={errors.microchip_no} {...register('microchip_no')} />
        <SelectField label="Activity level" {...register('activity_level')}>
          {['low','moderate','high','very_high'].map(a => <option key={a} value={a}>{a.replace('_',' ')}</option>)}
        </SelectField>
        <div className="sm:col-span-2 flex gap-3 mt-2">
          <button type="submit" disabled={isSubmitting} className="rounded-md bg-ink text-paper px-5 py-2 disabled:opacity-50">
            {isSubmitting ? 'Saving…' : 'Save pet'}
          </button>
          <button type="button" onClick={() => history.back()} className="rounded-md border border-line px-5 py-2">Cancel</button>
        </div>
      </form>
    </main>
  )
}
