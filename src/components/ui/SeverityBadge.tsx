import type { AllergySeverity } from '@/types/db'

const styles: Record<AllergySeverity, string> = {
  mild: 'bg-line text-ink',
  moderate: 'bg-signal/20 text-ink',
  severe: 'bg-alert text-paper',
  life_threatening: 'bg-alert text-paper ring-2 ring-alert/40'
}

export default function SeverityBadge({ severity }: { severity: AllergySeverity }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[severity]}`}>
      {severity.replace('_', '-')}
    </span>
  )
}
