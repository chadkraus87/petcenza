import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { buildInsights } from '@/lib/insights'
import type { Medication, Pet, Vaccination, WeightEntry } from '@/types/db'

/** Overdue boosters, refills, weight swings and stale weights, read from existing records. */
export function useInsights() {
  return useQuery({
    queryKey: ['insights'],
    queryFn: async () => {
      const [pets, meds, vax, weights] = await Promise.all([
        supabase.from('pets').select('*').eq('archived', false),
        supabase.from('medications').select('*'),
        supabase.from('vaccinations').select('*'),
        supabase.from('weight_entries').select('*')
      ])
      return buildInsights({
        pets: (pets.data ?? []) as Pet[],
        medications: (meds.data ?? []) as Medication[],
        vaccinations: (vax.data ?? []) as Vaccination[],
        weights: (weights.data ?? []) as WeightEntry[]
      })
    }
  })
}
