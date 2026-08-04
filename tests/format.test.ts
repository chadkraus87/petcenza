import { describe, expect, it } from 'vitest'
import { kgToLb, petAge, weightChangePct, WEIGHT_ALERT_PCT, moveToDay } from '@/lib/format'

describe('kgToLb', () => {
  it('converts and rounds to one decimal', () => expect(kgToLb(36)).toBe(79.4))
})

describe('petAge', () => {
  it('uses estimated months when no birth date', () => expect(petAge(null, 14)).toBe('1 yr 2 mo'))
  it('handles under one year', () => expect(petAge(null, 7)).toBe('7 mo'))
  it('reports unknown when nothing given', () => expect(petAge(null, null)).toBe('Age unknown'))
})

describe('moveToDay (calendar drag-to-reschedule)', () => {
  it('keeps the time of day when moving to another date', () => {
    const out = moveToDay(new Date(2026, 7, 4, 8, 30), new Date(2026, 7, 11, 0, 0))
    expect(out.getFullYear()).toBe(2026)
    expect(out.getMonth()).toBe(7)
    expect(out.getDate()).toBe(11)
    expect(out.getHours()).toBe(8)
    expect(out.getMinutes()).toBe(30)
  })
  it('works when moving backwards across a month boundary', () => {
    const out = moveToDay(new Date(2026, 8, 2, 18, 0), new Date(2026, 7, 28, 0, 0))
    expect(out.getMonth()).toBe(7)
    expect(out.getDate()).toBe(28)
    expect(out.getHours()).toBe(18)
  })
  it('does not mutate the target date it was handed', () => {
    const target = new Date(2026, 7, 11, 0, 0)
    moveToDay(new Date(2026, 7, 4, 8, 30), target)
    expect(target.getHours()).toBe(0)
  })
  it('accepts an ISO string as the source', () => {
    const out = moveToDay(new Date(2026, 7, 4, 9, 15).toISOString(), new Date(2026, 7, 20, 0, 0))
    expect(out.getDate()).toBe(20)
    expect(out.getHours()).toBe(9)
    expect(out.getMinutes()).toBe(15)
  })
})

describe('weightChangePct', () => {
  it('returns null with fewer than two points', () => {
    expect(weightChangePct([])).toBeNull()
    expect(weightChangePct([20])).toBeNull()
  })
  it('computes percent change between the last two measurements', () => {
    expect(weightChangePct([20, 22])).toBeCloseTo(10)      // +10%
    expect(weightChangePct([30, 20, 18])).toBeCloseTo(-10) // -10% on the last pair
  })
  it('flags a notable swing at the alert threshold', () => {
    const pct = weightChangePct([10, 12]) // +20%
    expect(pct !== null && Math.abs(pct) >= WEIGHT_ALERT_PCT).toBe(true)
  })
})
