import { Link } from 'react-router-dom'
import { usePets } from '@/hooks/usePets'
import { petAge } from '@/lib/format'

export default function PetList() {
  const { data: pets, isLoading } = usePets()
  if (isLoading) return <p className="p-6 text-ink/50">Loading…</p>
  return (
    <main className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl">Your pets</h1>
        <Link to="/pets/new" className="rounded-md bg-ink text-paper px-4 py-2 text-sm">Add pet</Link>
      </div>
      {pets?.length === 0 && (
        <p className="text-ink/60">No pets yet. Add your first pet to start their chart.</p>
      )}
      <ul className="grid gap-4 sm:grid-cols-2">
        {pets?.map(p => (
          <li key={p.id}>
            <Link to={`/pets/${p.id}`} className="block bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-5 hover:border-moss">
              <h2 className="text-xl">{p.name}{p.nickname && <span className="text-ink/50 text-base"> “{p.nickname}”</span>}</h2>
              <p className="text-sm text-ink/60">{p.breed ?? p.species} · {petAge(p.birth_date, p.estimated_age_months)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
