import type { Insight } from '@/lib/insights'
import type { Reminder } from '@/types/db'

/**
 * The Today list: everything that needs a person's attention, as ONE ranked list.
 *
 * Previously insights and reminders rendered separately, so an overdue booster appeared twice —
 * once as "FVRCP overdue" and again as its auto-generated reminder. An auto-reminder whose source
 * record already has an insight is merged into that row: the insight explains why, the reminder
 * contributes its Done button.
 */

export type Urgency = 'urgent' | 'attention' | 'due' | 'info'

export interface TodayItem {
  key: string
  urgency: Urgency
  title: string
  detail: string
  petId: string | null
  /** When present, the row can be marked done. */
  reminderId?: string
  dueAt?: string
}

const RANK: Record<Urgency, number> = { urgent: 0, attention: 1, due: 2, info: 3 }
const INSIGHT_PREFIX = { vaccinations: 'vax', medications: 'refill' } as const

export function buildToday(insights: Insight[], reminders: Reminder[], now = new Date()): TodayItem[] {
  const items: TodayItem[] = insights.map(i => ({
    key: i.id, urgency: i.severity, title: i.title, detail: i.detail, petId: i.petId ?? null
  }))
  const byKey = new Map(items.map(i => [i.key, i]))

  for (const r of reminders) {
    if (r.completed_at) continue
    const source = r.source_table && r.source_id ? `${INSIGHT_PREFIX[r.source_table]}-${r.source_id}` : null
    const merged = source ? byKey.get(source) : undefined
    if (merged) {
      merged.reminderId = r.id
      merged.dueAt = r.due_at
      continue
    }
    const due = new Date(r.due_at)
    const overdue = due < now
    // The dashboard fetches the next 24 hours, which crosses midnight for most of the day.
    const sameDay = due.toDateString() === now.toDateString()
    items.push({
      key: `reminder-${r.id}`,
      urgency: overdue ? 'attention' : 'due',
      title: r.title,
      detail: overdue ? 'Overdue' : sameDay ? 'Due today' : 'Due tomorrow',
      petId: r.pet_id,
      reminderId: r.id,
      dueAt: r.due_at
    })
  }

  return items.sort((a, b) =>
    RANK[a.urgency] - RANK[b.urgency] || (a.dueAt ?? '').localeCompare(b.dueAt ?? ''))
}

/** How many rows actually ask something of the user. Informational rows don't count. */
export const actionCount = (items: TodayItem[]) => items.filter(i => i.urgency !== 'info').length
