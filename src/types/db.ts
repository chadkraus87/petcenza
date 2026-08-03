// Hand-maintained row types for the tables the UI touches.
// Regenerate the full set anytime with: supabase gen types typescript --linked > src/types/supabase.ts

export type Species = 'dog'|'cat'|'bird'|'rabbit'|'reptile'|'fish'|'horse'|'other'
export type Sex = 'male'|'female'|'male_neutered'|'female_spayed'|'unknown'
export type AllergySeverity = 'mild'|'moderate'|'severe'|'life_threatening'
export type ReminderKind = 'feeding'|'medication'|'grooming'|'vaccination'|'birthday'|'vet_appointment'|'custom'

export interface Pet {
  id: string; user_id: string; name: string; nickname: string | null
  species: Species; breed: string | null; is_mixed_breed: boolean; sex: Sex
  birth_date: string | null; estimated_age_months: number | null
  adoption_date: string | null; rescue_org: string | null; color: string | null
  goal_weight_kg: number | null; height_cm: number | null
  activity_level: 'low'|'moderate'|'high'|'very_high' | null
  insurance_provider: string | null; insurance_policy_no: string | null
  registration_no: string | null; microchip_no: string | null
  favorite_foods: string[] | null; favorite_toys: string[] | null; favorite_activities: string[] | null
  archived: boolean; created_at: string; updated_at: string
}

export interface PetPhoto { id: string; pet_id: string; storage_path: string; caption: string | null; is_primary: boolean }

export interface Medication {
  id: string; pet_id: string; name: string; dosage: string; frequency: string
  starts_on: string; ends_on: string | null; instructions: string | null
  prescriber_id: string | null; pharmacy: string | null; refill_due_on: string | null
  side_effects: string | null; notes: string | null; updated_at: string
}

/** A med is active if it has no end date or the end date is today or later. */
export const isMedicationActive = (m: Pick<Medication, 'ends_on'>): boolean =>
  !m.ends_on || m.ends_on >= new Date().toISOString().slice(0, 10)

export interface Allergy {
  id: string; pet_id: string; allergy_type: 'food'|'medication'|'environmental'|'other'
  allergen: string; severity: AllergySeverity; symptoms: string | null; emergency_treatment: string | null
}

export interface Vaccination {
  id: string; pet_id: string; vaccine: string; administered_on: string | null
  next_due_on: string | null; veterinarian_id: string | null; lot_no: string | null; notes: string | null
}

export interface WeightEntry { id: string; pet_id: string; measured_on: string; weight_kg: number; body_condition: number | null; notes: string | null }

export interface VetVisit {
  id: string; pet_id: string; veterinarian_id: string | null; visit_at: string
  reason: string | null; diagnosis: string | null; treatment: string | null; followup: string | null; notes: string | null; updated_at: string
}

export interface Veterinarian {
  id: string; name: string; clinic: string | null; address: string | null; phone: string | null
  email: string | null; is_primary: boolean; is_emergency_clinic: boolean; notes: string | null
}

export interface EmergencyContact { id: string; label: string; name: string; phone: string; notes: string | null; sort_order: number }

export interface Reminder {
  id: string; pet_id: string | null; kind: ReminderKind; title: string; due_at: string
  recurrence: 'none'|'daily'|'weekly'|'biweekly'|'monthly'|'quarterly'|'yearly'
  completed_at: string | null; snoozed_until: string | null
}

export interface SearchHit { entity: string; id: string; pet_id: string | null; title: string; snippet: string }

export interface NutritionPlan {
  id: string; pet_id: string; food_brand: string | null; formula: string | null; portion: string | null
  calories_per_day: number | null; supplements: string | null; treats: string | null
  water_notes: string | null; foods_to_avoid: string | null; updated_at: string
}

export interface FeedingSchedule {
  id: string; pet_id: string; label: string; feed_time: string; portion: string | null; active: boolean
}

export interface GroomingLog { id: string; pet_id: string; task: string; done_on: string; notes: string | null }

export interface BehaviorNote { id: string; pet_id: string; category: string; content: string; noted_on: string }

export interface Note {
  id: string; pet_id: string | null; title: string | null; body: string; pinned: boolean
  created_at: string; updated_at: string
}

export interface PetDocument {
  id: string; pet_id: string | null; medical_record_id: string | null; storage_path: string
  file_name: string; mime_type: string; size_bytes: number; kind: string; created_at: string
}
