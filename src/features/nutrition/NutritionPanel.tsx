import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { nutritionSchema } from '@/schemas/records'
import { toRow } from '@/schemas/pet'
import { supabase } from '@/lib/supabase'
import { TextField, TextArea } from '@/components/ui/Field'
import type { NutritionPlan } from '@/types/db'

type Form = z.infer<typeof nutritionSchema>

/** Nutrition is a single row per pet (unique index), so this is an upsert rather than a list. */
export default function NutritionPanel({ petId }: { petId: string }) {
  const qc = useQueryClient()
  const { data: plan } = useQuery({
    queryKey: ['nutrition_plans', petId],
    queryFn: async (): Promise<NutritionPlan | null> => {
      const { data, error } = await supabase.from('nutrition_plans').select('*').eq('pet_id', petId).maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!petId
  })

  const save = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const row = { ...values, user_id: user.id, pet_id: petId }
      const { error } = await supabase.from('nutrition_plans').upsert(row, { onConflict: 'pet_id' })
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['nutrition_plans', petId] })
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<Form>({ resolver: zodResolver(nutritionSchema) })

  useEffect(() => {
    if (plan) reset({
      food_brand: plan.food_brand ?? '', formula: plan.formula ?? '', portion: plan.portion ?? '',
      calories_per_day: plan.calories_per_day ?? '', supplements: plan.supplements ?? '',
      treats: plan.treats ?? '', water_notes: plan.water_notes ?? '', foods_to_avoid: plan.foods_to_avoid ?? ''
    })
  }, [plan, reset])

  const onSubmit = handleSubmit(async v => { await save.mutateAsync(toRow(v)) })

  return (
    <section>
      <h2 className="text-xl mb-4">Nutrition plan</h2>
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 bg-card rounded-card border border-line p-5" noValidate>
        <TextField label="Food brand" error={errors.food_brand} {...register('food_brand')} />
        <TextField label="Formula" error={errors.formula} {...register('formula')} placeholder="Adult, grain-free…" />
        <TextField label="Portion" error={errors.portion} {...register('portion')} placeholder="1 cup, twice daily" />
        <TextField label="Calories / day" type="number" error={errors.calories_per_day as never} {...register('calories_per_day')} />
        <div className="sm:col-span-2"><TextArea label="Supplements" error={errors.supplements} {...register('supplements')} /></div>
        <div className="sm:col-span-2"><TextArea label="Treats" error={errors.treats} {...register('treats')} /></div>
        <div className="sm:col-span-2"><TextArea label="Water notes" error={errors.water_notes} {...register('water_notes')} /></div>
        <div className="sm:col-span-2"><TextArea label="Foods to avoid" error={errors.foods_to_avoid} {...register('foods_to_avoid')} /></div>
        <button type="submit" disabled={isSubmitting || !isDirty} className="rounded-md bg-moss text-paper px-5 py-2 w-fit disabled:opacity-50">
          {isSubmitting ? 'Saving…' : 'Save plan'}
        </button>
      </form>
    </section>
  )
}
