import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid } from 'recharts'
import { weightSchema } from '@/schemas/records'
import { toRow } from '@/schemas/pet'
import { usePetCollection, useSaveRow } from '@/hooks/usePetRecords'
import { AlertTriangle } from 'lucide-react'
import { TextField } from '@/components/ui/Field'
import { fmtDate, kgToLb, weightChangePct, WEIGHT_ALERT_PCT } from '@/lib/format'
import type { WeightEntry } from '@/types/db'

type Form = z.infer<typeof weightSchema>

export default function WeightPanel({ petId, goalKg }: { petId: string; goalKg: number | null }) {
  const { data: entries } = usePetCollection<WeightEntry>('weight_entries', petId, { column: 'measured_on', ascending: true })
  const save = useSaveRow('weight_entries', petId)
  const [adding, setAdding] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({ resolver: zodResolver(weightSchema) })

  const onSubmit = handleSubmit(async v => { await save.mutateAsync({ values: toRow(v) }); reset(); setAdding(false) })

  const chartData = entries?.map(e => ({ date: fmtDate(e.measured_on), kg: Number(e.weight_kg) })) ?? []
  const latest = entries?.at(-1)
  const prev = entries?.at(-2)
  const delta = latest && prev ? Number(latest.weight_kg) - Number(prev.weight_kg) : null
  const pct = weightChangePct((entries ?? []).map(e => Number(e.weight_kg)))
  const notable = pct !== null && Math.abs(pct) >= WEIGHT_ALERT_PCT

  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl">Weight history</h2>
          {latest && (
            <p className="text-sm text-ink/60">
              Latest: {latest.weight_kg} kg ({kgToLb(Number(latest.weight_kg))} lb)
              {delta !== null && <span className={delta > 0 ? 'text-signal' : 'text-moss'}> · {delta > 0 ? '+' : ''}{delta.toFixed(1)} kg since last</span>}
            </p>
          )}
        </div>
        <button onClick={() => setAdding(a => !a)} className="rounded-md bg-ink text-paper px-4 py-2 text-sm">{adding ? 'Close' : 'Log weight'}</button>
      </div>

      {notable && pct !== null && (
        <div role="alert" className="mb-4 flex items-center gap-2 rounded-card border border-signal bg-signal/5 p-3 text-sm">
          <AlertTriangle size={16} className="text-signal shrink-0" aria-hidden />
          <span>
            {pct > 0 ? 'Gained' : 'Lost'} {Math.abs(pct).toFixed(0)}% since the last weigh-in
            — a change over {WEIGHT_ALERT_PCT}% is worth mentioning to your vet.
          </span>
        </div>
      )}

      {adding && (
        <form onSubmit={onSubmit} className="flex flex-wrap gap-3 items-end bg-card rounded-card border border-line p-5 mb-6" noValidate>
          <TextField label="Date" type="date" error={errors.measured_on} {...register('measured_on')} />
          <TextField label="Weight (kg)" type="number" step="0.1" error={errors.weight_kg} {...register('weight_kg')} />
          <TextField label="Body condition (1–9)" type="number" error={errors.body_condition as never} {...register('body_condition')} />
          <button type="submit" className="rounded-md bg-moss text-paper px-5 py-2">Save</button>
        </form>
      )}

      {chartData.length >= 2 ? (
        <div className="bg-card rounded-card border border-line p-4 h-72" role="img" aria-label={`Weight trend chart with ${chartData.length} measurements`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="#DDE3DD" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={40} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} unit=" kg" />
              <Tooltip />
              {goalKg && <ReferenceLine y={goalKg} stroke="#D89A2B" strokeDasharray="4 4" label={{ value: 'Goal', fontSize: 11, fill: '#D89A2B' }} />}
              <Line type="monotone" dataKey="kg" stroke="#4A6B5D" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-ink/50">Log at least two weights to see the trend chart.</p>
      )}
    </section>
  )
}
