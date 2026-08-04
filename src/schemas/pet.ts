import { z } from 'zod'

export const petSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  nickname: z.string().trim().max(80).optional().or(z.literal('')),
  species: z.enum(['dog','cat','bird','rabbit','reptile','fish','horse','other']),
  breed: z.string().trim().max(120).optional().or(z.literal('')),
  is_mixed_breed: z.boolean().default(false),
  sex: z.enum(['male','female','male_neutered','female_spayed','unknown']),
  birth_date: z.string().optional().or(z.literal('')),
  // Captured in YEARS in the UI; converted to the DB's estimated_age_months on save.
  // 50 years is the ceiling the column's 0-600 month check allows.
  estimated_age_years: z.coerce.number().min(0).max(50).optional().or(z.literal('')),
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

/**
 * The UI asks for an estimated age in years because that's how owners think about it
 * ("she's about 3"), while the column is estimated_age_months. Convert at the boundary.
 * Rounded to whole months — a fractional year like 2.5 becomes 30.
 */
export const yearsToMonths = (years: number | '' | null | undefined): number | null =>
  years === '' || years == null ? null : Math.round(Number(years) * 12)

export const monthsToYears = (months: number | null | undefined): number | '' =>
  months == null ? '' : Math.round((months / 12) * 10) / 10
