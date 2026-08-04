import { describe, expect, it } from 'vitest'
import { petSchema, toRow, yearsToMonths, monthsToYears } from '@/schemas/pet'
import { medicationSchema, allergySchema, weightSchema, validateUpload, vetSchema, emergencyContactSchema, feedingSchema, groomingSchema, behaviorSchema, noteSchema, reminderSchema } from '@/schemas/records'

describe('petSchema', () => {
  it('accepts a minimal valid pet', () => {
    const r = petSchema.safeParse({ name: 'Ranger', species: 'dog', sex: 'male_neutered', is_mixed_breed: true })
    expect(r.success).toBe(true)
  })
  it('rejects an empty name', () => {
    const r = petSchema.safeParse({ name: '  ', species: 'dog', sex: 'unknown' })
    expect(r.success).toBe(false)
  })
})

describe('estimated age years <-> months', () => {
  it('converts whole years to months', () => {
    expect(yearsToMonths(3)).toBe(36)
    expect(yearsToMonths(0)).toBe(0)
  })
  it('rounds fractional years to whole months', () => {
    expect(yearsToMonths(2.5)).toBe(30)
    expect(yearsToMonths(1.2)).toBe(14)   // 14.4 -> 14
  })
  it('treats blank/null as no value rather than zero', () => {
    expect(yearsToMonths('')).toBeNull()
    expect(yearsToMonths(null)).toBeNull()
    expect(yearsToMonths(undefined)).toBeNull()
  })
  it('converts stored months back to years for the form', () => {
    expect(monthsToYears(36)).toBe(3)
    expect(monthsToYears(30)).toBe(2.5)
    expect(monthsToYears(14)).toBe(1.2)
    expect(monthsToYears(null)).toBe('')
  })
  it('round-trips a whole number of years without drift', () => {
    for (const y of [1, 2, 5, 12, 20]) expect(monthsToYears(yearsToMonths(y))).toBe(y)
  })
  it('rejects an age beyond the column check (600 months = 50 years)', () => {
    const base = { name: 'X', species: 'dog', sex: 'unknown' }
    expect(petSchema.safeParse({ ...base, estimated_age_years: 50 }).success).toBe(true)
    expect(petSchema.safeParse({ ...base, estimated_age_years: 51 }).success).toBe(false)
  })
})

describe('toRow', () => {
  it('converts empty strings to null for clean DB writes', () => {
    expect(toRow({ a: '', b: 'x', c: 3 })).toEqual({ a: null, b: 'x', c: 3 })
  })
})

describe('medicationSchema', () => {
  it('rejects end date before start date', () => {
    const r = medicationSchema.safeParse({ name: 'Carprofen', dosage: '75 mg', frequency: 'BID', starts_on: '2026-07-10', ends_on: '2026-07-01' })
    expect(r.success).toBe(false)
  })
})

describe('allergySchema', () => {
  it('requires an allergen', () => {
    expect(allergySchema.safeParse({ allergy_type: 'food', allergen: '', severity: 'severe' }).success).toBe(false)
  })
})

describe('weightSchema', () => {
  it('rejects non-positive weights', () => {
    expect(weightSchema.safeParse({ measured_on: '2026-07-01', weight_kg: 0 }).success).toBe(false)
  })
})

describe('vetSchema', () => {
  it('accepts a vet with just a name', () => {
    expect(vetSchema.safeParse({ name: 'Dr. Reed' }).success).toBe(true)
  })
  it('rejects a malformed email', () => {
    expect(vetSchema.safeParse({ name: 'Dr. Reed', email: 'not-an-email' }).success).toBe(false)
  })
  it('accepts a blank optional email', () => {
    expect(vetSchema.safeParse({ name: 'Dr. Reed', email: '' }).success).toBe(true)
  })
})

describe('emergencyContactSchema', () => {
  it('requires label, name, and phone', () => {
    expect(emergencyContactSchema.safeParse({ label: 'Sitter', name: 'Sam', phone: '555-0100' }).success).toBe(true)
    expect(emergencyContactSchema.safeParse({ label: '', name: 'Sam', phone: '555-0100' }).success).toBe(false)
    expect(emergencyContactSchema.safeParse({ label: 'Sitter', name: 'Sam', phone: '' }).success).toBe(false)
  })
})

describe('medicationSchema — vet link', () => {
  const base = { name: 'Carprofen', dosage: '75 mg', frequency: 'BID', starts_on: '2026-07-10' }
  it('accepts a blank prescriber', () => {
    expect(medicationSchema.safeParse({ ...base, prescriber_id: '' }).success).toBe(true)
  })
  it('rejects a non-uuid prescriber id', () => {
    expect(medicationSchema.safeParse({ ...base, prescriber_id: 'not-a-uuid' }).success).toBe(false)
  })
  it('accepts a valid uuid prescriber id', () => {
    expect(medicationSchema.safeParse({ ...base, prescriber_id: '11111111-1111-4111-8111-111111111111' }).success).toBe(true)
  })
})

describe('feeding/grooming/behavior/note schemas', () => {
  it('feeding requires a label and time', () => {
    expect(feedingSchema.safeParse({ label: 'Breakfast', feed_time: '07:30' }).success).toBe(true)
    expect(feedingSchema.safeParse({ label: '', feed_time: '07:30' }).success).toBe(false)
  })
  it('grooming requires a task and date', () => {
    expect(groomingSchema.safeParse({ task: 'Bath', done_on: '2026-07-01' }).success).toBe(true)
    expect(groomingSchema.safeParse({ task: '', done_on: '2026-07-01' }).success).toBe(false)
  })
  it('behavior enforces a known category and content', () => {
    expect(behaviorSchema.safeParse({ category: 'milestone', content: 'Learned sit', noted_on: '2026-07-01' }).success).toBe(true)
    expect(behaviorSchema.safeParse({ category: 'nonsense', content: 'x', noted_on: '2026-07-01' }).success).toBe(false)
  })
  it('note requires a body', () => {
    expect(noteSchema.safeParse({ body: 'Remember to refill meds' }).success).toBe(true)
    expect(noteSchema.safeParse({ body: '' }).success).toBe(false)
  })
})

describe('reminderSchema', () => {
  const base = { title: 'Evening dose', due_at: '2026-08-04T18:00', kind: 'medication', recurrence: 'daily' }
  it('accepts a valid reminder', () => {
    expect(reminderSchema.safeParse(base).success).toBe(true)
  })
  it('requires a title and a time', () => {
    expect(reminderSchema.safeParse({ ...base, title: '' }).success).toBe(false)
    expect(reminderSchema.safeParse({ ...base, due_at: '' }).success).toBe(false)
  })
  it('rejects unknown kind or recurrence values', () => {
    expect(reminderSchema.safeParse({ ...base, kind: 'nonsense' }).success).toBe(false)
    expect(reminderSchema.safeParse({ ...base, recurrence: 'fortnightly' }).success).toBe(false)
  })
  it('treats pet_id as optional but validates it when present', () => {
    expect(reminderSchema.safeParse({ ...base, pet_id: '' }).success).toBe(true)
    expect(reminderSchema.safeParse({ ...base, pet_id: 'not-a-uuid' }).success).toBe(false)
    expect(reminderSchema.safeParse({ ...base, pet_id: '11111111-1111-4111-8111-111111111111' }).success).toBe(true)
  })
})

describe('validateUpload', () => {
  const mk = (name: string, type: string, size = 100) => new File([new ArrayBuffer(size)], name, { type })
  it('accepts a matching pdf', () => expect(validateUpload(mk('report.pdf', 'application/pdf'))).toBeNull())
  it('rejects mismatched extension vs MIME (spoofed file)', () =>
    expect(validateUpload(mk('report.pdf', 'image/png'))).toMatch(/extension/))
  it('rejects disallowed MIME types', () =>
    expect(validateUpload(mk('run.exe', 'application/x-msdownload'))).toMatch(/Only/))
  it('rejects oversize files', () =>
    expect(validateUpload(mk('big.pdf', 'application/pdf', 26 * 1024 * 1024))).toMatch(/25 MB/))
})
