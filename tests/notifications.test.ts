import { describe, expect, it } from 'vitest'
import { inQuietHours, shouldNotify } from '@/hooks/useNotificationSettings'
import type { NotificationSettings } from '@/types/db'

const base: NotificationSettings = {
  user_id: 'u', browser_push: true,
  feeding: true, medication: true, grooming: true, vaccination: true,
  birthdays: true, vet_appointments: true, custom: true,
  quiet_hours_start: null, quiet_hours_end: null
}
/** Local time on an arbitrary day — quiet hours are compared in local time. */
const at = (h: number, m = 0) => new Date(2026, 7, 4, h, m)

describe('inQuietHours', () => {
  it('is false when either bound is unset', () => {
    expect(inQuietHours(base, at(3))).toBe(false)
    expect(inQuietHours({ ...base, quiet_hours_start: '22:00' }, at(23))).toBe(false)
  })

  it('handles a same-day window', () => {
    const s = { ...base, quiet_hours_start: '13:00', quiet_hours_end: '15:00' }
    expect(inQuietHours(s, at(12, 59))).toBe(false)
    expect(inQuietHours(s, at(13, 0))).toBe(true)   // inclusive start
    expect(inQuietHours(s, at(14, 30))).toBe(true)
    expect(inQuietHours(s, at(15, 0))).toBe(false)  // exclusive end
  })

  it('handles a window that wraps past midnight', () => {
    const s = { ...base, quiet_hours_start: '22:00', quiet_hours_end: '07:00' }
    expect(inQuietHours(s, at(21, 59))).toBe(false)
    expect(inQuietHours(s, at(22, 0))).toBe(true)
    expect(inQuietHours(s, at(2, 0))).toBe(true)    // after midnight, still quiet
    expect(inQuietHours(s, at(6, 59))).toBe(true)
    expect(inQuietHours(s, at(7, 0))).toBe(false)
  })

  it('tolerates seconds in the stored time value', () => {
    const s = { ...base, quiet_hours_start: '22:00:00', quiet_hours_end: '07:00:00' }
    expect(inQuietHours(s, at(23))).toBe(true)
  })
})

describe('shouldNotify', () => {
  it('notifies by default when settings have not loaded', () => {
    expect(shouldNotify(undefined, 'medication')).toBe(true)
  })
  it('respects the master switch', () => {
    expect(shouldNotify({ ...base, browser_push: false }, 'medication')).toBe(false)
  })
  it('respects a per-kind toggle', () => {
    expect(shouldNotify({ ...base, medication: false }, 'medication')).toBe(false)
    expect(shouldNotify({ ...base, medication: false }, 'feeding')).toBe(true)
  })
  it('maps the pluralised columns to their singular reminder kinds', () => {
    expect(shouldNotify({ ...base, birthdays: false }, 'birthday')).toBe(false)
    expect(shouldNotify({ ...base, vet_appointments: false }, 'vet_appointment')).toBe(false)
  })
  it('suppresses during quiet hours and resumes after', () => {
    const s = { ...base, quiet_hours_start: '22:00', quiet_hours_end: '07:00' }
    expect(shouldNotify(s, 'medication', at(23))).toBe(false)
    expect(shouldNotify(s, 'medication', at(9))).toBe(true)
  })
})
