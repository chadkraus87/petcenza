import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Info, Sparkles, TriangleAlert } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Disclaimer, DISCLAIMER } from '@/components/Disclaimer'
import { buildInsights, type Severity } from '@/lib/insights'
import type { Medication, Pet, Vaccination, WeightEntry } from '@/types/db'

const STYLE: Record<Severity, { wrap: string; icon: typeof Info; tone: string }> = {
  urgent:    { wrap: 'border-alert bg-alert/5',   icon: TriangleAlert, tone: 'text-alert' },
  attention: { wrap: 'border-signal bg-signal/5', icon: AlertTriangle, tone: 'text-signal' },
  info:      { wrap: 'border-line bg-card',       icon: Info,          tone: 'text-calm' }
}

/**
 * "Needs attention" digest. Reads the records the user already has rather than storing anything
 * new — overdue boosters, refills, notable weight swings, and stale weight history.
 */
export default function InsightsPanel() {
  const { data: insights } = useQuery({
    queryKey: ['insights'],
    queryFn: async () => {
      const [pets, meds, vax, weights] = await Promise.all([
        supabase.from('pets').select('*').eq('archived', false),
        supabase.from('medications').select('*'),
        supabase.from('vaccinations').select('*'),
        supabase.from('weight_entries').select('*')
      ])
      return buildInsights({
        pets: (pets.data ?? []) as Pet[],
        medications: (meds.data ?? []) as Medication[],
        vaccinations: (vax.data ?? []) as Vaccination[],
        weights: (weights.data ?? []) as WeightEntry[]
      })
    }
  })

  if (!insights) return null

  if (insights.length === 0) {
    return (
      <section className="rounded-card border border-line bg-card shadow-sm shadow-ink/5 p-4 mb-6 flex items-center gap-3">
        <Sparkles size={18} className="text-moss shrink-0" aria-hidden />
        <p className="text-sm text-muted">Nothing needs attention — boosters, refills and weights all look current.</p>
      </section>
    )
  }

  return (
    <section className="mb-6" aria-labelledby="insights-heading">
      <h2 id="insights-heading" className="text-lg mb-2">Needs attention</h2>
      <ul className="space-y-2">
        {insights.map(i => {
          const { wrap, icon: Icon, tone } = STYLE[i.severity]
          const body = (
            <div className={`rounded-card border p-3 flex items-start gap-3 ${wrap}`}>
              <Icon size={16} className={`${tone} shrink-0 mt-0.5`} aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-medium">{i.title}</p>
                <p className="text-xs text-muted">{i.detail}</p>
              </div>
            </div>
          )
          return (
            <li key={i.id}>
              {i.petId ? <Link to={`/pets/${i.petId}`} className="block hover:opacity-90">{body}</Link> : body}
            </li>
          )
        })}
      </ul>
      <div className="mt-2"><Disclaimer text={DISCLAIMER.insights} /></div>
    </section>
  )
}
