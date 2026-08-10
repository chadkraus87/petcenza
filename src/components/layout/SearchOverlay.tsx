import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGlobalSearch } from '@/hooks/useSearch'

const routeFor = (petId: string | null) => (petId ? `/pets/${petId}` : '/pets')

export default function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const { data, isFetching } = useGlobalSearch(q)
  const nav = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div role="dialog" aria-modal="true" aria-label="Search everything"
      className="fixed inset-0 bg-ink/40 z-50 flex items-start justify-center pt-24 px-4" onClick={onClose}>
      <div className="bg-card w-full max-w-lg rounded-card border border-line overflow-hidden" onClick={e => e.stopPropagation()}>
        <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search pets, records, meds, notes…"
          className="w-full px-4 py-3 border-b border-line outline-none" />
        <ul className="max-h-80 overflow-y-auto divide-y divide-line">
          {isFetching && <li className="px-4 py-3 text-sm text-muted">Searching…</li>}
          {data?.map(hit => (
            <li key={`${hit.entity}-${hit.id}`}>
              <button className="w-full text-left px-4 py-3 hover:bg-paper"
                onClick={() => { nav(routeFor(hit.pet_id)); onClose() }}>
                <span className="text-xs uppercase tracking-wide text-moss mr-2">{hit.entity.replace('_', ' ')}</span>
                <span className="font-medium">{hit.title}</span>
                {hit.snippet && <span className="block text-sm text-muted truncate">{hit.snippet}</span>}
              </button>
            </li>
          ))}
          {q.length >= 2 && !isFetching && data?.length === 0 && (
            <li className="px-4 py-3 text-sm text-muted">No matches. Try a pet name, medication, or diagnosis.</li>
          )}
        </ul>
      </div>
    </div>
  )
}
