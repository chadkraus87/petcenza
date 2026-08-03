import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'

const SYNCED_TABLES = [
  'pets','medications','allergies','vaccinations','weight_entries','vet_visits','reminders',
  'feeding_schedules','nutrition_plans','grooming_logs','behavior_notes','notes','documents',
  'veterinarians','emergency_contacts'
]

/** Cross-device sync: any change to this user's rows invalidates the matching query cache. */
export function useRealtimeSync() {
  const qc = useQueryClient()
  const { user } = useAuth()
  useEffect(() => {
    if (!user) return
    const channel = supabase.channel('user-sync')
    for (const table of SYNCED_TABLES) {
      channel.on('postgres_changes',
        { event: '*', schema: 'public', table, filter: `user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: [table] })
          qc.invalidateQueries({ queryKey: ['dashboard'] })
        })
    }
    channel.subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [user, qc])
}
