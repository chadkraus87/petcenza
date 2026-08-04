import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertTriangle, PawPrint, Printer } from 'lucide-react'
import { fetchVetShare } from '@/hooks/useSharing'
import { fmtDate, fmtDateTime, kgToLb, petAge } from '@/lib/format'
import SeverityBadge from '@/components/ui/SeverityBadge'
import type { VetShareSnapshot } from '@/types/db'

/**
 * Public read-only view of a pet's clinical summary (/share/:token).
 *
 * Renders entirely from the vet-share edge function — no Supabase session, no app chrome, and
 * nothing interactive. Deliberately printable, since a vet is likely to want it on paper.
 */

const ERRORS: Record<string, string> = {
  invalid: 'This link is not valid. Ask the pet owner for a new one.',
  expired: 'This link has expired. Ask the pet owner for a new one.',
  revoked: 'The pet owner has revoked this link.',
  unavailable: 'This summary is temporarily unavailable. Please try again shortly.'
}

export default function VetShareView() {
  const { token = '' } = useParams()
  const [data, setData] = useState<VetShareSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetchVetShare(token)
      .then(d => { if (active) setData(d) })
      .catch((e: Error) => { if (active) setError(ERRORS[e.message] ?? ERRORS.unavailable) })
    return () => { active = false }
  }, [token])

  if (error) return (
    <main className="min-h-screen grid place-items-center p-6 text-center">
      <div className="max-w-sm">
        <PawPrint className="mx-auto mb-3 text-ink/30" aria-hidden />
        <h1 className="text-xl mb-2">Summary unavailable</h1>
        <p className="text-sm text-ink/70">{error}</p>
      </div>
    </main>
  )

  if (!data) return <main className="min-h-screen grid place-items-center text-ink/50">Loading summary…</main>

  const { pet } = data
  const severe = data.allergies.filter(a => a.severity === 'severe' || a.severity === 'life_threatening')

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <header className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink/50 mb-1">Shared pet summary</p>
          <h1 className="text-3xl">{pet.name}</h1>
          <p className="text-ink/60">
            {pet.breed ?? pet.species} · {petAge(pet.birth_date)} · {pet.sex.replace('_', ', ')}
            {pet.color && <> · {pet.color}</>}
          </p>
          {pet.microchip_no && (
            <p className="text-sm text-ink/60">Microchip: <code>{pet.microchip_no}</code></p>
          )}
        </div>
        <button onClick={() => window.print()}
          className="print:hidden rounded-md border border-line px-3 py-2 text-sm inline-flex items-center gap-2 shrink-0">
          <Printer size={14} aria-hidden /> Print
        </button>
      </header>

      {severe.length > 0 && (
        <section role="alert" className="mb-6 rounded-card border-2 border-alert bg-alert/5 p-4">
          <h2 className="text-lg text-alert mb-2 flex items-center gap-2">
            <AlertTriangle size={18} aria-hidden /> Critical allergies
          </h2>
          <ul className="space-y-2">
            {severe.map((a, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium">{a.allergen}</span> <SeverityBadge severity={a.severity} />
                {a.emergency_treatment && <span className="block text-alert">→ {a.emergency_treatment}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Section title="Allergies" empty="None recorded." rows={data.allergies.length}>
        <ul className="space-y-2">
          {data.allergies.map((a, i) => (
            <li key={i} className="text-sm">
              <span className="font-medium">{a.allergen}</span> <SeverityBadge severity={a.severity} />
              <span className="text-ink/50"> · {a.type}</span>
              {a.symptoms && <span className="block text-ink/70">Symptoms: {a.symptoms}</span>}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Current medications" empty="No active medications." rows={data.medications.length}>
        <ul className="space-y-2">
          {data.medications.map((m, i) => (
            <li key={i} className="text-sm">
              <span className="font-medium">{m.name}</span> {m.dosage} — {m.frequency}
              <span className="block text-ink/60 text-xs">
                Started {fmtDate(m.starts_on)}{m.ends_on ? ` · ends ${fmtDate(m.ends_on)}` : ' · ongoing'}
              </span>
              {m.instructions && <span className="block text-ink/70">{m.instructions}</span>}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Vaccinations" empty="None recorded." rows={data.vaccinations.length}>
        <ul className="space-y-1">
          {data.vaccinations.map((v, i) => (
            <li key={i} className="text-sm">
              <span className="font-medium">{v.vaccine}</span>
              {v.administered_on && <span className="text-ink/60"> · given {fmtDate(v.administered_on)}</span>}
              {v.next_due_on && <span className="text-signal"> · next due {fmtDate(v.next_due_on)}</span>}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Recent weights" empty="None recorded." rows={data.weights.length}>
        <ul className="space-y-1">
          {data.weights.map((w, i) => (
            <li key={i} className="text-sm">
              {fmtDate(w.measured_on)} — {w.weight_kg} kg ({kgToLb(Number(w.weight_kg))} lb)
              {w.body_condition && <span className="text-ink/60"> · BCS {w.body_condition}/9</span>}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Recent visits" empty="None recorded." rows={data.visits.length}>
        <ul className="space-y-3">
          {data.visits.map((v, i) => (
            <li key={i} className="text-sm">
              <span className="font-medium">{v.reason ?? 'Vet visit'}</span>
              <time className="block text-xs text-moss">{fmtDateTime(v.visit_at)}</time>
              {v.diagnosis && <span className="block">Diagnosis: {v.diagnosis}</span>}
              {v.treatment && <span className="block">Treatment: {v.treatment}</span>}
              {v.followup && <span className="block text-signal">Follow-up: {v.followup}</span>}
            </li>
          ))}
        </ul>
      </Section>

      <footer className="mt-8 pt-4 border-t border-line text-xs text-ink/50">
        Read-only summary shared by the pet's owner. This link expires {fmtDate(data.expires_at)}.
      </footer>
    </main>
  )
}

function Section({ title, empty, rows, children }: {
  title: string; empty: string; rows: number; children: React.ReactNode
}) {
  return (
    <section className="bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-4 mb-4">
      <h2 className="text-lg mb-2">{title}</h2>
      {rows === 0 ? <p className="text-sm text-ink/50">{empty}</p> : children}
    </section>
  )
}
