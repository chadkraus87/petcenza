import { differenceInDays, parseISO } from 'date-fns'
import { WEIGHT_ALERT_PCT, weightChangePct } from './format'
import type { Medication, Pet, Vaccination, WeightEntry } from '@/types/db'

/**
 * Derives "what needs attention" from records the user already has.
 *
 * Pure and dependency-free so it can be unit-tested without a database — the thresholds here are
 * clinical judgement calls, and getting them wrong either buries a real problem or trains people
 * to ignore the panel.
 */

export type Severity = 'urgent' | 'attention' | 'info'

export interface Insight {
  id: string
  severity: Severity
  petId: string | null
  title: string
  detail: string
}

/** A booster this far past due is worth shouting about rather than nudging. */
const VAX_URGENT_DAYS = 30
/** Weigh-ins older than this suggest the record has gone stale, not that the pet is fine. */
const STALE_WEIGHT_DAYS = 180

export function buildInsights(input: {
  pets: Pet[]
  medications: Medication[]
  vaccinations: Vaccination[]
  weights: WeightEntry[]
  now?: Date
}): Insight[] {
  const { pets, medications, vaccinations, weights, now = new Date() } = input
  const out: Insight[] = []
  const nameOf = (id: string | null) => pets.find(p => p.id === id)?.name ?? 'Pet'

  // --- overdue / upcoming boosters -----------------------------------------
  for (const v of vaccinations) {
    if (!v.next_due_on) continue
    const days = differenceInDays(parseISO(v.next_due_on), now)
    if (days < 0) {
      const over = Math.abs(days)
      out.push({
        id: `vax-${v.id}`,
        severity: over >= VAX_URGENT_DAYS ? 'urgent' : 'attention',
        petId: v.pet_id,
        title: `${v.vaccine} overdue for ${nameOf(v.pet_id)}`,
        detail: `${over} day${over === 1 ? '' : 's'} past due — book a booster.`
      })
    }
  }

  // --- refills coming up ----------------------------------------------------
  for (const m of medications) {
    if (!m.refill_due_on) continue
    const days = differenceInDays(parseISO(m.refill_due_on), now)
    if (days < 0) {
      out.push({
        id: `refill-${m.id}`, severity: 'attention', petId: m.pet_id,
        title: `${m.name} refill overdue`,
        detail: `${nameOf(m.pet_id)} — was due ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago.`
      })
    } else if (days <= 7) {
      out.push({
        id: `refill-${m.id}`, severity: 'info', petId: m.pet_id,
        title: `${m.name} refill due soon`,
        detail: `${nameOf(m.pet_id)} — in ${days} day${days === 1 ? '' : 's'}.`
      })
    }
  }

  // --- weight trend & staleness, per pet ------------------------------------
  for (const pet of pets) {
    const series = weights
      .filter(w => w.pet_id === pet.id)
      .sort((a, b) => a.measured_on.localeCompare(b.measured_on))
    if (series.length === 0) continue

    const pct = weightChangePct(series.map(w => Number(w.weight_kg)))
    if (pct !== null && Math.abs(pct) >= WEIGHT_ALERT_PCT) {
      out.push({
        id: `weight-${pet.id}`, severity: 'attention', petId: pet.id,
        title: `${pet.name} ${pct > 0 ? 'gained' : 'lost'} ${Math.abs(pct).toFixed(0)}%`,
        detail: `Since the previous weigh-in. A swing over ${WEIGHT_ALERT_PCT}% is worth mentioning to your vet.`
      })
    }

    const last = series[series.length - 1]
    const age = differenceInDays(now, parseISO(last.measured_on))
    if (age >= STALE_WEIGHT_DAYS) {
      out.push({
        id: `stale-weight-${pet.id}`, severity: 'info', petId: pet.id,
        title: `No recent weight for ${pet.name}`,
        detail: `Last recorded ${Math.round(age / 30)} months ago.`
      })
    }
  }

  const rank: Record<Severity, number> = { urgent: 0, attention: 1, info: 2 }
  return out.sort((a, b) => rank[a.severity] - rank[b.severity])
}
