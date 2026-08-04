import { useMemo, useState } from 'react'
import {
  addDays, addMonths, addWeeks, eachDayOfInterval, endOfDay, endOfMonth, endOfWeek, format,
  isSameDay, isSameMonth, isToday, parseISO, startOfDay, startOfMonth, startOfWeek
} from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import RemindersPanel from './RemindersPanel'
import type { Reminder, VetVisit } from '@/types/db'

type CalItem = { id: string; date: Date; label: string; kind: string }
type View = 'month' | 'week' | 'day'

const kindColor: Record<string, string> = {
  feeding: 'bg-moss', medication: 'bg-signal', grooming: 'bg-calm',
  vaccination: 'bg-alert', birthday: 'bg-coral', vet_appointment: 'bg-ink', custom: 'bg-ink/60'
}

/** Visible date span for the current view — also the query window. */
function rangeFor(view: View, anchor: Date): { start: Date; end: Date } {
  if (view === 'day') return { start: startOfDay(anchor), end: endOfDay(anchor) }
  if (view === 'week') return { start: startOfWeek(anchor), end: endOfWeek(anchor) }
  return { start: startOfWeek(startOfMonth(anchor)), end: endOfWeek(endOfMonth(anchor)) }
}

export default function CalendarPage() {
  const [anchor, setAnchor] = useState(new Date())
  const [view, setView] = useState<View>('month')

  const { start, end } = useMemo(() => rangeFor(view, anchor), [view, anchor])

  const { data } = useQuery({
    queryKey: ['calendar', view, start.toISOString()],
    queryFn: async () => {
      const from = start.toISOString(), to = end.toISOString()
      const [reminders, visits, pets] = await Promise.all([
        supabase.from('reminders').select('*').gte('due_at', from).lte('due_at', to).is('completed_at', null),
        supabase.from('vet_visits').select('*').gte('visit_at', from).lte('visit_at', to),
        supabase.from('pets').select('id, name, birth_date').eq('archived', false)
      ])
      const items: CalItem[] = []
      for (const r of (reminders.data ?? []) as Reminder[]) items.push({ id: r.id, date: parseISO(r.due_at), label: r.title, kind: r.kind })
      for (const v of (visits.data ?? []) as VetVisit[]) items.push({ id: v.id, date: parseISO(v.visit_at), label: v.reason ?? 'Vet visit', kind: 'vet_appointment' })
      // The visible span can straddle two calendar years, so place each birthday in every year it
      // touches; the per-day filter keeps only the ones actually in range.
      const years = new Set([start.getFullYear(), end.getFullYear()])
      for (const p of pets.data ?? []) {
        if (!p.birth_date) continue
        const bd = parseISO(p.birth_date)
        for (const year of years) {
          items.push({ id: `bday-${p.id}-${year}`, date: new Date(year, bd.getMonth(), bd.getDate()), label: `${p.name}'s birthday`, kind: 'birthday' })
        }
      }
      return items
    }
  })

  const days = useMemo(() => eachDayOfInterval({ start, end }), [start, end])
  const itemsOn = (day: Date) => (data ?? []).filter(i => isSameDay(i.date, day))
                                             .sort((a, b) => a.date.getTime() - b.date.getTime())

  const step = (dir: 1 | -1) => setAnchor(a =>
    view === 'month' ? addMonths(a, dir) : view === 'week' ? addWeeks(a, dir) : addDays(a, dir))

  const heading = view === 'month' ? format(anchor, 'MMMM yyyy')
    : view === 'week' ? `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
    : format(anchor, 'EEEE, MMMM d, yyyy')

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-3xl">{heading}</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-line overflow-hidden" role="group" aria-label="Calendar view">
            {(['month','week','day'] as View[]).map(v => (
              <button key={v} onClick={() => setView(v)} aria-pressed={view === v}
                className={`px-3 py-1.5 text-sm capitalize ${view === v ? 'bg-ink text-paper' : 'bg-card hover:bg-wave'}`}>
                {v}
              </button>
            ))}
          </div>
          <button aria-label={`Previous ${view}`} onClick={() => step(-1)} className="rounded-md border border-line px-3 py-1.5">←</button>
          <button onClick={() => setAnchor(new Date())} className="rounded-md border border-line px-3 py-1.5 text-sm">Today</button>
          <button aria-label={`Next ${view}`} onClick={() => step(1)} className="rounded-md border border-line px-3 py-1.5">→</button>
        </div>
      </div>

      {view === 'day' ? (
        <DayView items={itemsOn(anchor)} />
      ) : (
        <>
          <div className="grid grid-cols-7 text-xs uppercase tracking-wide text-ink/50 mb-1">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="px-2 py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-px bg-line rounded-card overflow-hidden border border-line">
            {days.map(day => {
              const items = itemsOn(day)
              // Week view has one row, so each cell can afford much more height.
              const cap = view === 'week' ? 8 : 3
              return (
                <div key={day.toISOString()}
                  className={`bg-card p-1.5 ${view === 'week' ? 'min-h-56' : 'min-h-24'} ${
                    view === 'month' && !isSameMonth(day, anchor) ? 'opacity-40' : ''}`}>
                  <span className={`text-xs ${isToday(day) ? 'inline-grid place-items-center w-5 h-5 rounded-full bg-moss text-paper' : 'text-ink/60'}`}>
                    {format(day, 'd')}
                  </span>
                  <ul className="mt-1 space-y-0.5">
                    {items.slice(0, cap).map(i => (
                      <li key={i.id} className="flex items-start gap-1 text-[11px] leading-tight">
                        <span className={`w-1.5 h-1.5 mt-1 rounded-full shrink-0 ${kindColor[i.kind] ?? 'bg-ink/60'}`} aria-hidden />
                        <span className={view === 'week' ? '' : 'truncate'}>
                          {view === 'week' && <time className="text-ink/40 mr-1">{format(i.date, 'HH:mm')}</time>}
                          {i.label}
                        </span>
                      </li>
                    ))}
                    {items.length > cap && <li className="text-[10px] text-ink/50">+{items.length - cap} more</li>}
                  </ul>
                </div>
              )
            })}
          </div>
        </>
      )}

      <RemindersPanel />
    </main>
  )
}

function DayView({ items }: { items: CalItem[] }) {
  if (items.length === 0) {
    return (
      <div className="bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-8 text-center">
        <p className="text-ink/50">Nothing scheduled. Enjoy the quiet.</p>
      </div>
    )
  }
  return (
    <ul className="bg-card rounded-card border border-line shadow-sm shadow-ink/5 divide-y divide-line overflow-hidden">
      {items.map(i => (
        <li key={i.id} className="flex items-center gap-3 p-4">
          <time className="text-sm text-ink/60 w-16 shrink-0">{format(i.date, 'HH:mm')}</time>
          <span className={`w-2 h-2 rounded-full shrink-0 ${kindColor[i.kind] ?? 'bg-ink/60'}`} aria-hidden />
          <span className="flex-1 min-w-0">{i.label}</span>
          <span className="text-xs text-ink/40 capitalize shrink-0">{i.kind.replace('_', ' ')}</span>
        </li>
      ))}
    </ul>
  )
}
