import { z } from 'zod'

export const petSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  nickname: z.string().trim().max(80).optional().or(z.literal('')),
  species: z.enum(['dog','cat','bird','rabbit','reptile','fish','horse','other']),
  breed: z.string().trim().max(120).optional().or(z.literal('')),
  is_mixed_breed: z.boolean().default(false),
  sex: z.enum(['male','female','male_neutered','female_spayed','unknown']),
  birth_date: z.string().optional().or(z.literal('')),
  estimated_age_months: z.coerce.number().int().min(0).max(600).optional().or(z.literal('')),
  adoption_date: z.string().optional().or(z.literal('')),
  rescue_org: z.string().trim().max(160).optional().or(z.literal('')),
  color: z.string().trim().max(80).optional().or(z.literal('')),
  goal_weight_kg: z.coerce.number().positive().max(1500).optional().or(z.literal('')),
  microchip_no: z.string().trim().max(40).optional().or(z.literal('')),
  activity_level: z.enum(['low','moderate','high','very_high']).optional()
})
export type PetForm = z.infer<typeof petSchema>

/** Empty-string fields → null so PostgREST stores proper NULLs. */
export function toRow<T extends Record<string, unknown>>(form: T) {
  return Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === '' ? null : v]))
}
