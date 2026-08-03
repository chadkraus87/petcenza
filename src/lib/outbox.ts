import { get, set } from 'idb-keyval'
import { supabase } from './supabase'

/**
 * Offline mutation outbox.
 * Writes attempted while offline are appended here and replayed in order when connectivity
 * returns. Conflict detection is last-write-wins per row with an updated_at guard: if the
 * server row changed after the queued write was created, the replay is flagged for manual
 * review instead of silently overwriting.
 */
export type OutboxItem = {
  id: string
  table: string
  op: 'insert' | 'update' | 'delete'
  payload: Record<string, unknown>
  rowId?: string
  baseUpdatedAt?: string
  queuedAt: string
}

const KEY = 'pawchart-outbox'

export async function enqueue(item: Omit<OutboxItem, 'id' | 'queuedAt'>) {
  const items = ((await get(KEY)) as OutboxItem[] | undefined) ?? []
  items.push({ ...item, id: crypto.randomUUID(), queuedAt: new Date().toISOString() })
  await set(KEY, items)
}

export async function pending(): Promise<OutboxItem[]> {
  return ((await get(KEY)) as OutboxItem[] | undefined) ?? []
}

export async function replay(): Promise<{ ok: number; conflicts: OutboxItem[] }> {
  const items = await pending()
  const conflicts: OutboxItem[] = []
  let ok = 0
  for (const item of items) {
    try {
      if (item.op === 'update' && item.rowId && item.baseUpdatedAt) {
        const { data } = await supabase.from(item.table).select('updated_at').eq('id', item.rowId).single()
        if (data?.updated_at && data.updated_at > item.baseUpdatedAt) {
          conflicts.push(item)
          continue
        }
      }
      const q = supabase.from(item.table)
      if (item.op === 'insert') await q.insert(item.payload).throwOnError()
      if (item.op === 'update' && item.rowId) await q.update(item.payload).eq('id', item.rowId).throwOnError()
      if (item.op === 'delete' && item.rowId) await q.delete().eq('id', item.rowId).throwOnError()
      ok++
    } catch {
      conflicts.push(item) // keep for retry; network may have dropped mid-replay
    }
  }
  await set(KEY, conflicts)
  return { ok, conflicts }
}

export function watchConnectivity(onBack: () => void) {
  window.addEventListener('online', onBack)
  return () => window.removeEventListener('online', onBack)
}
