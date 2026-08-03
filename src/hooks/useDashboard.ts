import { useQuery } from '@tanstack/react-query'
import { addDays } from 'date-fns'
import { supabase } from '@/lib/supabase'
import type { Medication, Pet, Reminder, Vaccination, VetVisit } from '@/types/db'

export interface DashboardData {
  pets: Pet[]
  medsActive: Medication[]
  vaxDue: Vaccination[]
  visitsUpcoming: VetVisit[]
  remindersToday: Reminder[]
  severeAllergyPets: { pet_id: string; allergen: string; severity: string }[]
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async (): Promise<DashboardData> => {
      const now = new Date().toISOString()
      const horizon = addDays(new Date(), 30).toISOString().slice(0, 10)
      const endOfDay = addDays(new Date(), 1).toISOString()
      const [pets, meds, vax, visits, reminders, allergies] = await Promise.all([
        supabase.from('pets').select('*').eq('archived', false).order('name'),
        supabase.from('medications').select('*').or(`ends_on.is.null,ends_on.gte.${now.slice(0, 10)}`),
        supabase.from('vaccinations').select('*').lte('next_due_on', horizon).order('next_due_on'),
        supabase.from('vet_visits').select('*').gte('visit_at', now).order('visit_at').limit(5),
        supabase.from('reminders').select('*').is('completed_at', null).lte('due_at', endOfDay).order('due_at'),
        supabase.from('allergies').select('pet_id, allergen, severity').in('severity', ['severe', 'life_threatening'])
      ])
      const firstError = [pets, meds, vax, visits, reminders, allergies].find(r => r.error)?.error
      if (firstError) throw firstError
      return {
        pets: pets.data ?? [], medsActive: meds.data ?? [], vaxDue: vax.data ?? [],
        visitsUpcoming: visits.data ?? [], remindersToday: reminders.data ?? [],
        severeAllergyPets: allergies.data ?? []
      }
    }
  })
}
