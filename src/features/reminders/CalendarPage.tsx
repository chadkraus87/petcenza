import { useMemo, useState } from 'react'
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import RemindersPanel from './RemindersPanel'
import type { Reminder, VetVisit } from '@/types/db'

type CalItem = { id: string; date: Date; label: string; kind: string }

const kindColor: Record<string, string> = {
  feeding: 'bg-moss', medication: 'bg-signal', grooming: 'bg-calm',
  vaccination: 'bg-alert', birthday: 'bg-moss', vet_appointment: 'bg-ink', custom: 'bg-ink/60'
}

export default function CalendarPage() {
  const [month, setMonth] = useState(new Date())

  const { data } = useQuery({
    queryKey: ['calendar', format(month, 'yyyy-MM')],
    queryFn: async () => {
      const from = startOfWeek(startOfMonth(month)).toISOString()
      const to = endOfWeek(endOfMonth(month)).toISOString()
      const [reminders, visits, pets] = await Promise.all([
        supabase.from('reminders').select('*').gte('due_at', from).lte('due_at', to).is('completed_at', null),
        supabase.from('vet_visits').select('*').gte('visit_at', from).lte('visit_at', to),
        supabase.from('pets').select('id, name, birth_date').eq('archived', false)
      ])
      const items: CalItem[] = []
      for (const r of (reminders.data ?? []) as Reminder[]) items.push({ id: r.id, date: parseISO(r.due_at), label: r.title, kind: r.kind })
      for (const v of (visits.data ?? []) as VetVisit[]) items.push({ id: v.id, date: parseISO(v.visit_at), label: v.reason ?? 'Vet visit', kind: 'vet_appointment' })
      // The visible grid can span two calendar years (leading/trailing spillover weeks), so place
      // each birthday in every year the grid touches; the day-cell filter keeps only in-range ones.
      const gridYears = new Set([parseISO(from).getFullYear(), parseISO(to).getFullYear()])
      for (const p of pets.data ?? []) {
        if (!p.birth_date) continue
        const bd = parseISO(p.birth_date)
        for (const year of gridYears) {
          items.push({ id: `bday-${p.id}-${year}`, date: new Date(year, bd.getMonth(), bd.getDate()), label: `${p.name}'s birthday`, kind: 'birthday' })
        }
      }
      return items
    }
  })

  const days = useMemo(() => eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) }), [month])

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl">{format(month, 'MMMM yyyy')}</h1>
        <div className="flex gap-2">
          <button aria-label="Previous month" onClick={() => setMonth(m => addMonths(m, -1))} className="rounded-md border border-line px-3 py-1.5">←</button>
          <button onClick={() => setMonth(new Date())} className="rounded-md border border-line px-3 py-1.5 text-sm">Today</button>
          <button aria-label="Next month" onClick={() => setMonth(m => addMonths(m, 1))} className="rounded-md border border-line px-3 py-1.5">→</button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-xs uppercase tracking-wide text-ink/50 mb-1">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="px-2 py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-px bg-line rounded-card overflow-hidden border border-line">
        {days.map(day => {
          const items = data?.filter(i => isSameDay(i.date, day)) ?? []
          return (
            <div key={day.toISOString()} className={`bg-card min-h-24 p-1.5 ${!isSameMonth(day, month) ? 'opacity-40' : ''}`}>
              <span className={`text-xs ${isToday(day) ? 'inline-grid place-items-center w-5 h-5 rounded-full bg-moss text-paper' : 'text-ink/60'}`}>
                {format(day, 'd')}
              </span>
              <ul className="mt-1 space-y-0.5">
                {items.slice(0, 3).map(i => (
                  <li key={i.id} className="flex items-center gap-1 text-[11px] leading-tight truncate">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${kindColor[i.kind] ?? 'bg-ink/60'}`} aria-hidden />
                    {i.label}
                  </li>
                ))}
                {items.length > 3 && <li className="text-[10px] text-ink/50">+{items.length - 3} more</li>}
              </ul>
            </div>
          )
        })}
      </div>

      <RemindersPanel />
    </main>
  )
}
