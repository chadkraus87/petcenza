import { describe, expect, it } from 'vitest'
import { parseFrequency, buildDayPlan, currentSlot } from '@/lib/medSchedule'

describe('parseFrequency — plain English', () => {
  it('once daily', () => {
    const s = parseFrequency('Once daily')
    expect(s.times).toEqual(['morning'])
    expect(s.cadence).toBe('daily')
  })
  it('twice daily', () => {
    expect(parseFrequency('Twice daily').times).toEqual(['morning', 'evening'])
  })
  it('three times a day', () => {
    expect(parseFrequency('Three times a day').times).toEqual(['morning', 'midday', 'evening'])
  })
  it('numeric form', () => {
    expect(parseFrequency('2x daily').times).toEqual(['morning', 'evening'])
    expect(parseFrequency('4 times per day').times).toEqual(['morning', 'midday', 'evening', 'night'])
  })
  it('bare "daily" means once', () => {
    expect(parseFrequency('daily').times).toEqual(['morning'])
  })

  it('refuses to under-report counts above four', () => {
    // Same clamp, other code path: "6 times daily" used to render as four doses.
    expect(parseFrequency('6 times daily').cadence).toBe('unknown')
    expect(parseFrequency('5x daily').times).toEqual([])
  })
})

describe('parseFrequency — veterinary abbreviations', () => {
  it('maps SID/BID/TID/QID', () => {
    expect(parseFrequency('SID').times).toHaveLength(1)
    expect(parseFrequency('BID').times).toHaveLength(2)
    expect(parseFrequency('TID').times).toHaveLength(3)
    expect(parseFrequency('QID').times).toHaveLength(4)
  })
  it('is case insensitive', () => {
    expect(parseFrequency('bid with food').times).toHaveLength(2)
  })
  it('does not match an abbreviation inside another word', () => {
    // "forbidden" contains "bid" — a substring match here would invent a second daily dose.
    expect(parseFrequency('forbidden to take').cadence).toBe('unknown')
  })
})

describe('parseFrequency — interval notation', () => {
  it('q12h is twice daily', () => {
    expect(parseFrequency('q12h').times).toEqual(['morning', 'evening'])
  })
  it('q8h is three times daily', () => {
    expect(parseFrequency('1 tablet q8h').times).toHaveLength(3)
  })
  it('every 6 hours is four times daily', () => {
    expect(parseFrequency('every 6 hours').times).toHaveLength(4)
  })
  it('q24h collapses to once', () => {
    expect(parseFrequency('q24h').times).toEqual(['morning'])
  })

  /**
   * Regression: intervals below 6 hours used to be CLAMPED to four doses. q4h is six doses a day
   * and is real in post-op analgesia and critical care — it rendered as four, confidently, with
   * nothing on screen to say a third of the schedule had been dropped. Under-reporting a dose
   * silently is the worst thing this module can do, so these must land in 'unknown'.
   */
  it('refuses to under-report intervals it has no slots for', () => {
    for (const [text, prescribed] of [['q4h', 6], ['q3h', 8], ['q2h', 12]] as const) {
      const s = parseFrequency(text)
      expect(s.cadence, `${text} (${prescribed}/day) must not be silently clamped`).toBe('unknown')
      expect(s.times).toEqual([])
    }
  })

  it('still parses intervals that do fit', () => {
    expect(parseFrequency('q6h').times).toHaveLength(4)
  })
})

describe('parseFrequency — non-daily cadences', () => {
  it('every other day', () => {
    expect(parseFrequency('Every other day').cadence).toBe('every-other-day')
  })
  it('weekly', () => {
    expect(parseFrequency('Once a week').cadence).toBe('weekly')
  })
  it('monthly', () => {
    expect(parseFrequency('Monthly flea preventative').cadence).toBe('monthly')
  })
})

describe('parseFrequency — as needed', () => {
  it('recognises PRN and prose', () => {
    expect(parseFrequency('PRN').cadence).toBe('as-needed')
    expect(parseFrequency('As needed for pain').cadence).toBe('as-needed')
  })
  it('as-needed wins over a stated frequency', () => {
    // Scheduling this would prompt someone to give a painkiller the pet may not need.
    const s = parseFrequency('Twice daily as needed')
    expect(s.cadence).toBe('as-needed')
    expect(s.times).toEqual([])
  })
})

describe('parseFrequency — explicit slots', () => {
  it('morning and evening', () => {
    expect(parseFrequency('Morning and evening').times).toEqual(['morning', 'evening'])
  })
  it('at bedtime', () => {
    expect(parseFrequency('At bedtime').times).toEqual(['night'])
  })
  it('returns slots in day order regardless of input order', () => {
    expect(parseFrequency('evening and morning').times).toEqual(['morning', 'evening'])
  })
})

describe('parseFrequency — with food', () => {
  it('detects food requirements', () => {
    expect(parseFrequency('Twice daily with food').withFood).toBe(true)
    expect(parseFrequency('BID with meals').withFood).toBe(true)
    expect(parseFrequency('Once daily after eating').withFood).toBe(true)
  })
  it('is false when not mentioned', () => {
    expect(parseFrequency('Twice daily').withFood).toBe(false)
  })
})

describe('parseFrequency — unrecognised input', () => {
  it('reports unknown rather than guessing', () => {
    expect(parseFrequency('ask Dr. Patel').cadence).toBe('unknown')
    expect(parseFrequency('').cadence).toBe('unknown')
    expect(parseFrequency(null).cadence).toBe('unknown')
  })
})

describe('buildDayPlan', () => {
  const meds = [
    { id: 'a', frequency: 'Twice daily' },
    { id: 'b', frequency: 'Once daily with food' },
    { id: 'c', frequency: 'As needed for pain' },
    { id: 'd', frequency: 'Monthly' },
    { id: 'e', frequency: 'ask the vet' }
  ]

  it('routes each med to the right bucket', () => {
    const plan = buildDayPlan(meds)
    expect(plan.bySlot.morning.map(d => d.med.id)).toEqual(['a', 'b'])
    expect(plan.bySlot.evening.map(d => d.med.id)).toEqual(['a'])
    expect(plan.asNeeded.map(d => d.med.id)).toEqual(['c'])
    expect(plan.periodic.map(d => d.med.id)).toEqual(['d'])
    expect(plan.unscheduled.map(d => d.med.id)).toEqual(['e'])
  })

  it('never loses a medication', () => {
    const plan = buildDayPlan(meds)
    const placed = new Set([
      ...Object.values(plan.bySlot).flat().map(d => d.med.id),
      ...plan.periodic.map(d => d.med.id),
      ...plan.asNeeded.map(d => d.med.id),
      ...plan.unscheduled.map(d => d.med.id)
    ])
    expect(placed).toEqual(new Set(meds.map(m => m.id)))
  })

  it('handles an empty list', () => {
    const plan = buildDayPlan([])
    expect(plan.bySlot.morning).toEqual([])
    expect(plan.unscheduled).toEqual([])
  })
})

describe('currentSlot', () => {
  const at = (h: number) => currentSlot(new Date(2026, 7, 4, h, 0))
  it('maps the clock onto slots', () => {
    expect(at(7)).toBe('morning')
    expect(at(12)).toBe('midday')
    expect(at(18)).toBe('evening')
    expect(at(22)).toBe('night')
  })
  it('covers boundaries', () => {
    expect(at(10)).toBe('morning')
    expect(at(11)).toBe('midday')
    expect(at(14)).toBe('midday')
    expect(at(15)).toBe('evening')
    expect(at(19)).toBe('evening')
    expect(at(20)).toBe('night')
    expect(at(0)).toBe('morning')
  })
})
