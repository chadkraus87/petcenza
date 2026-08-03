import { z } from 'zod'

export const medicationSchema = z.object({
  name: z.string().trim().min(1, 'Medication name is required').max(160),
  dosage: z.string().trim().min(1, 'Dosage is required').max(120),
  frequency: z.string().trim().min(1, 'Frequency is required').max(160),
  starts_on: z.string().min(1, 'Start date is required'),
  ends_on: z.string().optional().or(z.literal('')),
  instructions: z.string().max(1000).optional().or(z.literal('')),
  pharmacy: z.string().max(160).optional().or(z.literal('')),
  refill_due_on: z.string().optional().or(z.literal('')),
  side_effects: z.string().max(1000).optional().or(z.literal('')),
  prescriber_id: z.string().uuid().optional().or(z.literal(''))
}).refine(v => !v.ends_on || v.ends_on >= v.starts_on, { message: 'End date must be after start date', path: ['ends_on'] })

export const allergySchema = z.object({
  allergy_type: z.enum(['food','medication','environmental','other']),
  allergen: z.string().trim().min(1, 'Allergen is required').max(160),
  severity: z.enum(['mild','moderate','severe','life_threatening']),
  symptoms: z.string().max(1000).optional().or(z.literal('')),
  emergency_treatment: z.string().max(1000).optional().or(z.literal(''))
})

export const vaccinationSchema = z.object({
  vaccine: z.string().trim().min(1, 'Vaccine name is required').max(160),
  administered_on: z.string().optional().or(z.literal('')),
  next_due_on: z.string().optional().or(z.literal('')),
  lot_no: z.string().max(60).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
  veterinarian_id: z.string().uuid().optional().or(z.literal(''))
})

export const weightSchema = z.object({
  measured_on: z.string().min(1, 'Date is required'),
  weight_kg: z.coerce.number().positive('Weight must be positive').max(2000),
  body_condition: z.coerce.number().int().min(1).max(9).optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal(''))
})

export const visitSchema = z.object({
  visit_at: z.string().min(1, 'Date & time required'),
  reason: z.string().max(300).optional().or(z.literal('')),
  diagnosis: z.string().max(1000).optional().or(z.literal('')),
  treatment: z.string().max(1000).optional().or(z.literal('')),
  followup: z.string().max(1000).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
  veterinarian_id: z.string().uuid().optional().or(z.literal(''))
})

export const nutritionSchema = z.object({
  food_brand: z.string().trim().max(160).optional().or(z.literal('')),
  formula: z.string().trim().max(160).optional().or(z.literal('')),
  portion: z.string().trim().max(160).optional().or(z.literal('')),
  calories_per_day: z.coerce.number().int().min(0).max(20000).optional().or(z.literal('')),
  supplements: z.string().max(1000).optional().or(z.literal('')),
  treats: z.string().max(1000).optional().or(z.literal('')),
  water_notes: z.string().max(1000).optional().or(z.literal('')),
  foods_to_avoid: z.string().max(1000).optional().or(z.literal(''))
})

export const feedingSchema = z.object({
  label: z.string().trim().min(1, 'Label is required').max(80),
  feed_time: z.string().min(1, 'Time is required'),
  portion: z.string().trim().max(160).optional().or(z.literal('')),
  active: z.boolean().default(true)
})

export const groomingSchema = z.object({
  task: z.string().trim().min(1, 'Task is required').max(120),
  done_on: z.string().min(1, 'Date is required'),
  notes: z.string().max(1000).optional().or(z.literal(''))
})

export const behaviorSchema = z.object({
  category: z.enum(['anxiety_trigger', 'command', 'milestone', 'temperament', 'socialization', 'other']),
  content: z.string().trim().min(1, 'Add a note').max(2000),
  noted_on: z.string().min(1, 'Date is required')
})

export const noteSchema = z.object({
  title: z.string().trim().max(160).optional().or(z.literal('')),
  body: z.string().trim().min(1, 'Note text is required').max(5000),
  pinned: z.boolean().default(false)
})

export const vetSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(160),
  clinic: z.string().trim().max(160).optional().or(z.literal('')),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  email: z.string().trim().email('Enter a valid email').max(160).optional().or(z.literal('')),
  address: z.string().trim().max(300).optional().or(z.literal('')),
  is_primary: z.boolean().default(false),
  is_emergency_clinic: z.boolean().default(false),
  notes: z.string().max(1000).optional().or(z.literal(''))
})

export const emergencyContactSchema = z.object({
  label: z.string().trim().min(1, 'Label is required').max(80),
  name: z.string().trim().min(1, 'Name is required').max(160),
  phone: z.string().trim().min(1, 'Phone is required').max(40),
  notes: z.string().max(500).optional().or(z.literal(''))
})

// Secure upload validation: extension AND MIME must both be on the allowlist.
const DOC_MIME = ['application/pdf','image/jpeg','image/png','image/webp'] as const
export function validateUpload(file: File): string | null {
  if (file.size === 0) return 'File is empty'
  if (file.size > 25 * 1024 * 1024) return 'File exceeds 25 MB limit'
  if (!DOC_MIME.includes(file.type as typeof DOC_MIME[number])) return 'Only PDF, JPEG, PNG, or WebP files are accepted'
  const ext = file.name.split('.').pop()?.toLowerCase()
  const extOk = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' } as Record<string, string>
  if (!ext || extOk[ext] !== file.type) return 'File extension does not match its type'
  return null
}
