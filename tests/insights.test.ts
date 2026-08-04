import { describe, expect, it } from 'vitest'
import { buildInsights } from '@/lib/insights'
import type { Medication, Pet, Vaccination, WeightEntry } from '@/types/db'

const NOW = new Date('2026-08-04T12:00:00Z')
const daysFromNow = (d: number) =>
  new Date(NOW.getTime() + d * 86_400_000).toISOString().slice(0, 10)

const pet = (id: string, name: string) => ({ id, name } as Pet)
const vax = (id: string, petId: string, vaccine: string, due: string | null) =>
  ({ id, pet_id: petId, vaccine, next_due_on: due } as Vaccination)
const med = (id: string, petId: string, name: string, refill: string | null) =>
  ({ id, pet_id: petId, name, refill_due_on: refill } as Medication)
const weight = (petId: string, on: string, kg: number) =>
  ({ pet_id: petId, measured_on: on, weight_kg: kg } as WeightEntry)

const run = (o: Partial<Parameters<typeof buildInsights>[0]>) =>
  buildInsights({ pets: [], medications: [], vaccinations: [], weights: [], now: NOW, ...o })

describe('buildInsights', () => {
  it('returns nothing when everything is current', () => {
    expect(run({
      pets: [pet('p1', 'Ranger')],
      vaccinations: [vax('v1', 'p1', 'Rabies', daysFromNow(200))],
      medications: [med('m1', 'p1', 'Carprofen', daysFromNow(60))],
      weights: [weight('p1', daysFromNow(-10), 30)]
    })).toEqual([])
  })

  it('escalates a long-overdue booster to urgent', () => {
    const [i] = run({ pets: [pet('p1', 'Ranger')], vaccinations: [vax('v1', 'p1', 'Rabies', daysFromNow(-45))] })
    expect(i.severity).toBe('urgent')
    expect(i.title).toContain('Rabies overdue for Ranger')
    expect(i.detail).toContain('45 days')
  })

  it('treats a recently-missed booster as attention, not urgent', () => {
    const [i] = run({ pets: [pet('p1', 'Ranger')], vaccinations: [vax('v1', 'p1', 'DHPP', daysFromNow(-5))] })
    expect(i.severity).toBe('attention')
  })

  it('ignores a vaccination with no due date', () => {
    expect(run({ pets: [pet('p1', 'R')], vaccinations: [vax('v1', 'p1', 'Rabies', null)] })).toEqual([])
  })

  it('separates an overdue refill from one merely coming up', () => {
    const overdue = run({ pets: [pet('p1', 'R')], medications: [med('m1', 'p1', 'Apoquel', daysFromNow(-3))] })
    expect(overdue[0].severity).toBe('attention')
    expect(overdue[0].title).toContain('refill overdue')

    const soon = run({ pets: [pet('p1', 'R')], medications: [med('m1', 'p1', 'Apoquel', daysFromNow(3))] })
    expect(soon[0].severity).toBe('info')
    expect(soon[0].title).toContain('due soon')
  })

  it('stays quiet about a refill that is still far off', () => {
    expect(run({ pets: [pet('p1', 'R')], medications: [med('m1', 'p1', 'Apoquel', daysFromNow(30))] })).toEqual([])
  })

  it('flags a weight swing over the threshold', () => {
    const [i] = run({
      pets: [pet('p1', 'Ranger')],
      weights: [weight('p1', daysFromNow(-60), 30), weight('p1', daysFromNow(-5), 36)]
    })
    expect(i.title).toContain('Ranger gained 20%')
  })

  it('does not flag a small weight change', () => {
    expect(run({
      pets: [pet('p1', 'R')],
      weights: [weight('p1', daysFromNow(-60), 30), weight('p1', daysFromNow(-5), 31)]
    })).toEqual([])
  })

  it('notices weight history that has gone stale', () => {
    const [i] = run({ pets: [pet('p1', 'Mochi')], weights: [weight('p1', daysFromNow(-400), 4)] })
    expect(i.severity).toBe('info')
    expect(i.title).toContain('No recent weight for Mochi')
  })

  it('sorts urgent above attention above info', () => {
    const out = run({
      pets: [pet('p1', 'R')],
      vaccinations: [vax('v1', 'p1', 'Rabies', daysFromNow(-60))],
      medications: [med('m1', 'p1', 'Apoquel', daysFromNow(2))],
      weights: [weight('p1', daysFromNow(-60), 30), weight('p1', daysFromNow(-1), 36)]
    })
    expect(out.map(i => i.severity)).toEqual(['urgent', 'attention', 'info'])
  })
})
