import { supabase } from './supabase'

/** Fire-and-forget audit trail for auth + sensitive events. */
export async function logActivity(action: string, entity?: string, entityId?: string, metadata: Record<string, unknown> = {}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('activity_logs').insert({ user_id: user.id, action, entity, entity_id: entityId, metadata })
}
