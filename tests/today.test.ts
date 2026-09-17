import { describe, expect, it } from 'vitest'
import { buildToday, actionCount } from '@/lib/today'
import type { Insight } from '@/lib/insights'
import type { Reminder } from '@/types/db'

const now = new Date('2026-09-16T12:00:00Z')
const insight = (o: Partial<Insight>): Insight =>
  ({ id: 'x', severity: 'attention', title: 'T', detail: 'D', petId: 'p1', ...o }) as Insight
const reminder = (o: Partial<Reminder>): Reminder => ({
  id: 'r1', pet_id: 'p1', kind: 'custom', title: 'Walk', due_at: '2026-09-16T18:00:00Z',
  recurrence: 'none', completed_at: null, snoozed_until: null, ...o
})

describe('buildToday', () => {
  it('merges an auto-reminder into the insight for the same record instead of listing it twice', () => {
    const items = buildToday(
      [insight({ id: 'vax-v1', severity: 'urgent', title: 'FVRCP overdue' })],
      [reminder({ id: 'r9', source_table: 'vaccinations', source_id: 'v1', due_at: '2026-09-06T09:00:00Z' })],
      now)
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ title: 'FVRCP overdue', reminderId: 'r9' })
  })

  it('keeps a reminder whose source has no insight', () => {
    const items = buildToday([], [reminder({ source_table: 'medications', source_id: 'm1' })], now)
    expect(items).toHaveLength(1)
    expect(items[0].reminderId).toBe('r1')
  })

  it('ranks urgent, then attention (including overdue reminders), then due, then info', () => {
    const items = buildToday(
      [insight({ id: 'i-info', severity: 'info' }), insight({ id: 'i-urgent', severity: 'urgent' })],
      [reminder({ id: 'later', due_at: '2026-09-16T20:00:00Z' }), reminder({ id: 'late', due_at: '2026-09-16T08:00:00Z' })],
      now)
    expect(items.map(i => i.urgency)).toEqual(['urgent', 'attention', 'due', 'info'])
    expect(items[1].reminderId).toBe('late')
  })

  it('orders same-urgency reminders by time', () => {
    const items = buildToday([], [
      reminder({ id: 'b', due_at: '2026-09-16T19:00:00Z' }),
      reminder({ id: 'a', due_at: '2026-09-16T15:00:00Z' })
    ], now)
    expect(items.map(i => i.reminderId)).toEqual(['a', 'b'])
  })

  it('ignores completed reminders and does not count informational rows as actions', () => {
    const items = buildToday([insight({ id: 'i', severity: 'info' })], [reminder({ completed_at: '2026-09-16T10:00:00Z' })], now)
    expect(items).toHaveLength(1)
    expect(actionCount(items)).toBe(0)
  })

  it('says tomorrow for reminders in the 24-hour window that fall after midnight', () => {
    const noon = new Date(2026, 8, 16, 12, 0)
    const items = buildToday([], [
      reminder({ id: 'tonight', due_at: new Date(2026, 8, 16, 20, 0).toISOString() }),
      reminder({ id: 'tomorrow', due_at: new Date(2026, 8, 17, 9, 0).toISOString() })
    ], noon)
    expect(items.map(i => i.detail)).toEqual(['Due today', 'Due tomorrow'])
  })
})
