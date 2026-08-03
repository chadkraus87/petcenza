import { differenceInMonths, format, parseISO } from 'date-fns'

export const fmtDate = (d: string | Date) => format(typeof d === 'string' ? parseISO(d) : d, 'MMM d, yyyy')
export const fmtDateTime = (d: string | Date) => format(typeof d === 'string' ? parseISO(d) : d, 'MMM d, yyyy · h:mm a')

export function petAge(birthDate?: string | null, estimatedAgeMonths?: number | null): string {
  const months = birthDate
    ? differenceInMonths(new Date(), parseISO(birthDate))
    : estimatedAgeMonths ?? null
  if (months == null) return 'Age unknown'
  const y = Math.floor(months / 12), m = months % 12
  if (y === 0) return `${m} mo`
  return m ? `${y} yr ${m} mo` : `${y} yr`
}

export const kgToLb = (kg: number) => Math.round(kg * 2.20462 * 10) / 10

/**
 * Percentage weight change between the two most recent measurements (chronological).
 * Returns null when there aren't two points. Used to flag clinically notable swings.
 */
export function weightChangePct(sortedAscKg: number[]): number | null {
  if (sortedAscKg.length < 2) return null
  const prev = sortedAscKg[sortedAscKg.length - 2]
  const latest = sortedAscKg[sortedAscKg.length - 1]
  if (!prev) return null
  return ((latest - prev) / prev) * 100
}

/** A change of 10%+ between consecutive weigh-ins is worth surfacing to the owner/vet. */
export const WEIGHT_ALERT_PCT = 10
