/**
 * Turning free-text medication frequency into a dosing schedule.
 *
 * `medications.frequency` is deliberately free text — it's transcribed straight off a prescription
 * label, and forcing a dropdown would either lose detail or make people mis-file a dose. So the
 * parsing happens here, at read time.
 *
 * This recognises the phrasings that actually appear on veterinary labels: plain English ("twice
 * daily"), the Latin abbreviations vets still write (SID/BID/TID/QID), and interval notation
 * (q12h). Anything it can't place is reported as 'unknown' and surfaced as an unscheduled item
 * rather than silently dropped or guessed at — a missed dose matters more than a tidy list.
 */

export type TimeOfDay = 'morning' | 'midday' | 'evening' | 'night'

export type Cadence = 'daily' | 'every-other-day' | 'weekly' | 'monthly' | 'as-needed' | 'unknown'

export interface DoseSchedule {
  /** Slots to give a dose in, in day order. Empty for as-needed and unrecognised text. */
  times: TimeOfDay[]
  cadence: Cadence
  /** Called out separately because giving a med on an empty stomach can cause vomiting. */
  withFood: boolean
}

export const TIME_LABEL: Record<TimeOfDay, string> = {
  morning: 'Morning',
  midday: 'Midday',
  evening: 'Evening',
  night: 'Bedtime'
}

/** Ordering for display. Also the canonical order returned by parseFrequency. */
export const TIME_ORDER: TimeOfDay[] = ['morning', 'midday', 'evening', 'night']

/** How many doses map onto which slots. Spreads them across waking hours. */
const SLOTS_FOR_COUNT: Record<number, TimeOfDay[]> = {
  1: ['morning'],
  2: ['morning', 'evening'],
  3: ['morning', 'midday', 'evening'],
  4: ['morning', 'midday', 'evening', 'night']
}

/**
 * Interval in hours → doses per day, for "q8h"-style notation.
 *
 * Returns null when the interval implies MORE doses than there are slots to hold them. Clamping
 * instead would render q4h — six doses, real in post-op analgesia and critical care — as four,
 * with no visible sign anything was lost. A confidently-wrong dosing schedule is worse than an
 * unparsed one, so these fall through to 'unknown' and surface for the owner to read off the
 * label themselves.
 */
function slotsForInterval(hours: number): TimeOfDay[] | null {
  if (hours <= 0) return null
  if (hours >= 24) return SLOTS_FOR_COUNT[1]
  const perDay = Math.round(24 / hours)
  return SLOTS_FOR_COUNT[perDay] ?? null
}

const WORD_NUMBERS: Record<string, number> = {
  one: 1, once: 1, two: 2, twice: 2, three: 3, thrice: 3, four: 4
}

export function parseFrequency(frequency: string | null | undefined): DoseSchedule {
  const raw = (frequency ?? '').toLowerCase().trim()
  const withFood = /\bwith\s+(food|meals?|a\s+meal)\b/.test(raw) || /\bafter\s+(eating|meals?)\b/.test(raw)

  if (!raw) return { times: [], cadence: 'unknown', withFood }

  // As-needed first: "twice daily as needed" is still fundamentally as-needed, and scheduling it
  // would nag someone to give a painkiller their pet may not need.
  if (/\b(as\s+needed|as\s+required|prn|when\s+necessary)\b/.test(raw)) {
    return { times: [], cadence: 'as-needed', withFood }
  }

  // Cadences longer than a day don't belong in a daily "give this now" list.
  if (/\b(every\s+other\s+day|alternate\s+days?|eod|q48h?)\b/.test(raw)) {
    return { times: SLOTS_FOR_COUNT[1], cadence: 'every-other-day', withFood }
  }
  if (/\b(weekly|every\s+week|once\s+a\s+week|q7d|qwk)\b/.test(raw)) {
    return { times: SLOTS_FOR_COUNT[1], cadence: 'weekly', withFood }
  }
  if (/\b(monthly|every\s+month|once\s+a\s+month|q30d)\b/.test(raw)) {
    return { times: SLOTS_FOR_COUNT[1], cadence: 'monthly', withFood }
  }

  // Latin abbreviations, still standard on prescription labels. Word-bounded so "bid" doesn't
  // match inside "forbidden".
  if (/\bqid\b/.test(raw)) return { times: SLOTS_FOR_COUNT[4], cadence: 'daily', withFood }
  if (/\btid\b/.test(raw)) return { times: SLOTS_FOR_COUNT[3], cadence: 'daily', withFood }
  if (/\bbid\b/.test(raw)) return { times: SLOTS_FOR_COUNT[2], cadence: 'daily', withFood }
  if (/\b(sid|qd|q\.d\.)\b/.test(raw)) return { times: SLOTS_FOR_COUNT[1], cadence: 'daily', withFood }

  // Interval notation: q8h, q 12 hr, "every 6 hours".
  const interval = raw.match(/\bq\s*(\d{1,2})\s*h/) ?? raw.match(/\bevery\s+(\d{1,2})\s*(?:h|hours?)\b/)
  if (interval) {
    const slots = slotsForInterval(Number(interval[1]))
    return slots
      ? { times: slots, cadence: 'daily', withFood }
      : { times: [], cadence: 'unknown', withFood }
  }

  // "3 times daily", "three times a day", "2x daily".
  const numeric = raw.match(/\b(\d)\s*(?:x|times?)\b/) ?? null
  const worded = raw.match(/\b(one|once|two|twice|three|thrice|four)\b/) ?? null
  const count = numeric ? Number(numeric[1]) : worded ? WORD_NUMBERS[worded[1]] : null
  if (count && /\b(daily|a\s+day|per\s+day|each\s+day|day)\b/.test(raw)) {
    // Same rule as slotsForInterval: no slot to hold it means we say so, not round it down.
    const slots = SLOTS_FOR_COUNT[count]
    if (slots) return { times: slots, cadence: 'daily', withFood }
    return { times: [], cadence: 'unknown', withFood }
  }

  // Explicit slot words: "morning and evening", "at bedtime".
  const explicit: TimeOfDay[] = []
  if (/\b(morning|am|breakfast|a\.m\.)\b/.test(raw)) explicit.push('morning')
  if (/\b(midday|noon|lunch|afternoon)\b/.test(raw)) explicit.push('midday')
  if (/\b(evening|pm|dinner|supper|p\.m\.)\b/.test(raw)) explicit.push('evening')
  if (/\b(night|bedtime|bed\s+time|overnight)\b/.test(raw)) explicit.push('night')
  if (explicit.length > 0) {
    return { times: TIME_ORDER.filter(t => explicit.includes(t)), cadence: 'daily', withFood }
  }

  // A bare "daily" with no count means once.
  if (/\b(daily|every\s+day|each\s+day)\b/.test(raw)) {
    return { times: SLOTS_FOR_COUNT[1], cadence: 'daily', withFood }
  }

  return { times: [], cadence: 'unknown', withFood }
}

/** The slot a given wall-clock hour falls into, for highlighting "right now". */
export function currentSlot(now: Date = new Date()): TimeOfDay {
  const h = now.getHours()
  if (h < 11) return 'morning'
  if (h < 15) return 'midday'
  if (h < 20) return 'evening'
  return 'night'
}

export interface ScheduledDose<T> {
  med: T
  schedule: DoseSchedule
}

export interface DayPlan<T> {
  /** Doses due in each slot, in day order. Slots with nothing due are omitted by the caller. */
  bySlot: Record<TimeOfDay, ScheduledDose<T>[]>
  /** Meds on a longer cycle — shown separately so they don't imply a dose is due today. */
  periodic: ScheduledDose<T>[]
  /** As-needed meds: available, but never "due". */
  asNeeded: ScheduledDose<T>[]
  /** Frequency text we couldn't place. Surfaced so a dose is never silently lost. */
  unscheduled: ScheduledDose<T>[]
}

/**
 * Fold a flat list of medications into a single day's plan.
 *
 * Generic over the medication shape so this stays a pure data transform — the view supplies
 * whatever it needs alongside (pet name, photo) without this module knowing about the database.
 */
export function buildDayPlan<T extends { frequency: string | null }>(meds: T[]): DayPlan<T> {
  const plan: DayPlan<T> = {
    bySlot: { morning: [], midday: [], evening: [], night: [] },
    periodic: [],
    asNeeded: [],
    unscheduled: []
  }

  for (const med of meds) {
    const schedule = parseFrequency(med.frequency)
    const entry = { med, schedule }

    if (schedule.cadence === 'as-needed') { plan.asNeeded.push(entry); continue }
    if (schedule.cadence === 'unknown') { plan.unscheduled.push(entry); continue }
    if (schedule.cadence !== 'daily') { plan.periodic.push(entry); continue }

    for (const slot of schedule.times) plan.bySlot[slot].push(entry)
  }

  return plan
}
