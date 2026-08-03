import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'

const SYNCED_TABLES = [
  'pets','medications','allergies','vaccinations','weight_entries','vet_visits','reminders',
  'feeding_schedules','nutrition_plans','grooming_logs','behavior_notes','notes','documents',
  'veterinarians','emergency_contacts'
]

/**
 * Cross-device sync: any change to a row this user can see invalidates the matching cache.
 *
 * Deliberately unfiltered. The previous `user_id=eq.<uid>` filter matched on *authorship*, so a
 * collaborator's edits to a shared pet never arrived — the whole point of sharing. Supabase
 * applies RLS to postgres_changes, so the server only delivers rows this user is allowed to
 * read; membership is therefore enforced server-side rather than by a client-supplied filter.
 */
export function useRealtimeSync() {
  const qc = useQueryClient()
  const { user } = useAuth()
  useEffect(() => {
    if (!user) return
    const channel = supabase.channel('user-sync')
    for (const table of SYNCED_TABLES) {
      channel.on('postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          qc.invalidateQueries({ queryKey: [table] })
          qc.invalidateQueries({ queryKey: ['dashboard'] })
        })
    }
    channel.subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [user, qc])
}
