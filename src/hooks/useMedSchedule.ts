import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Medication, Pet } from '@/types/db'

export interface MedWithPet extends Medication {
  petName: string
  petId: string
}

/**
 * Every currently-active medication across every pet in the household.
 *
 * The per-pet medication panel answers "what is this animal on?". This answers the question you
 * actually have standing at the cupboard with three animals underfoot: "what do I give, to whom,
 * right now?"
 *
 * Filtered to meds in their active window — started, and not yet ended. Archived and remembered
 * pets are excluded; their meds aren't a live task.
 */
export function useMedSchedule() {
  return useQuery({
    queryKey: ['med_schedule'],
    queryFn: async (): Promise<MedWithPet[]> => {
      const today = new Date().toISOString().slice(0, 10)

      const [petsRes, medsRes] = await Promise.all([
        supabase.from('pets').select('id, name').eq('archived', false),
        supabase.from('medications').select('*')
          .lte('starts_on', today)
          .or(`ends_on.is.null,ends_on.gte.${today}`)
      ])
      if (petsRes.error) throw petsRes.error
      if (medsRes.error) throw medsRes.error

      const pets = (petsRes.data ?? []) as Pick<Pet, 'id' | 'name'>[]
      const nameById = new Map(pets.map(p => [p.id, p.name]))

      // Drop meds whose pet isn't in the active set — that's how an archived or remembered pet's
      // prescriptions stay out of today's list.
      return (medsRes.data as Medication[])
        .filter(m => nameById.has(m.pet_id))
        .map(m => ({ ...m, petId: m.pet_id, petName: nameById.get(m.pet_id)! }))
    }
  })
}
