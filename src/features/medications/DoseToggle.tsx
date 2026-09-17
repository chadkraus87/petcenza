import { Check } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useAuth } from '@/features/auth/AuthProvider'
import { doseStatus, type TimeOfDay } from '@/lib/medSchedule'
import { findLog, useToggleDose, type DoseLog } from '@/hooks/useDoseLogs'

const STATUS = {
  overdue: { text: 'Overdue', cls: 'text-alert font-semibold' },
  due: { text: 'Due now', cls: 'text-moss font-semibold' },
  upcoming: { text: 'Later', cls: 'text-muted' }
} as const

/** One dose's status plus the control to record it. Used on Today and on Medication rounds. */
export function DoseToggle({ petId, petName, medicationId, medName, slot, logs }: {
  petId: string; petName: string; medicationId: string; medName: string; slot: TimeOfDay; logs?: DoseLog[]
}) {
  const { user } = useAuth()
  const toggle = useToggleDose()
  const log = findLog(logs, medicationId, slot)
  const run = () => toggle.mutate({ petId, medicationId, slot, log, id: log?.id ?? crypto.randomUUID(), label: `${medName} for ${petName}` })

  if (log) {
    const by = log.given_by === user?.id ? 'by you' : 'by your household'
    return (
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted text-right leading-tight hidden sm:block">
          Given {format(parseISO(log.given_at), 'h:mm a')}<br />{by}
        </span>
        <button onClick={run} aria-pressed="true"
          aria-label={`${medName} for ${petName} marked given ${by}. Undo`}
          className="btn btn-secondary px-3 text-moss border-moss/40">
          <Check size={16} aria-hidden /> Given
        </button>
      </div>
    )
  }
  // Not logged, so the status can only be overdue, due or upcoming.
  const status = doseStatus(slot, false) as keyof typeof STATUS
  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className={`text-xs ${STATUS[status].cls}`}>{STATUS[status].text}</span>
      <button onClick={run} aria-pressed="false" aria-label={`Mark ${medName} given to ${petName}`}
        className={`btn px-3 ${status === 'upcoming' ? 'btn-secondary' : 'btn-primary'}`}>
        Mark given
      </button>
    </div>
  )
}
