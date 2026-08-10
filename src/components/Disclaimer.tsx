import { Info } from 'lucide-react'

/**
 * The standing disclaimers, kept in one place so the wording can't drift between screens.
 *
 * These are placed next to the features they describe rather than only in the Terms, because a
 * disclaimer nobody encounters is worth very little — legally or ethically. The reminder one
 * matters most: a missed notification leading to a missed dose is the most likely way this app
 * contributes to harm.
 */
export const DISCLAIMER = {
  medication:
    'Schedules are interpreted from the frequency text you entered. Always check them against ' +
    'your prescription label and your vet’s directions.',
  reminders:
    'Reminders are best-effort — delivery depends on your device, network and notification ' +
    'settings. Don’t rely on PetCenza as your only reminder for a critical dose.',
  insights:
    'These are calculated from the records you’ve entered, not clinical assessments. Worth ' +
    'mentioning to your vet, not a diagnosis.',
  emergency:
    'In an emergency, call your vet or an emergency animal hospital immediately. Don’t rely ' +
    'on this app.'
} as const

export function Disclaimer({ text, tone = 'quiet' }: {
  text: string
  /** 'loud' for the emergency screen, where it must not be skimmable. */
  tone?: 'quiet' | 'loud'
}) {
  if (tone === 'loud') {
    return (
      <p role="note" className="flex items-start gap-2 rounded-card border border-signal/40 bg-signal/10 px-3 py-2 text-sm text-ink/80">
        <Info size={15} className="text-signal shrink-0 mt-0.5" aria-hidden />
        <span>{text}</span>
      </p>
    )
  }
  return (
    <p role="note" className="flex items-start gap-1.5 text-xs text-muted leading-relaxed">
      <Info size={12} className="shrink-0 mt-0.5" aria-hidden />
      <span>{text}</span>
    </p>
  )
}
