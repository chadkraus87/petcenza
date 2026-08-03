import { describe, expect, it } from 'vitest'
import { kgToLb, petAge, weightChangePct, WEIGHT_ALERT_PCT } from '@/lib/format'

describe('kgToLb', () => {
  it('converts and rounds to one decimal', () => expect(kgToLb(36)).toBe(79.4))
})

describe('petAge', () => {
  it('uses estimated months when no birth date', () => expect(petAge(null, 14)).toBe('1 yr 2 mo'))
  it('handles under one year', () => expect(petAge(null, 7)).toBe('7 mo'))
  it('reports unknown when nothing given', () => expect(petAge(null, null)).toBe('Age unknown'))
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
