import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, X, Heart } from 'lucide-react'
import { usePets, useRememberedPets } from '@/hooks/usePets'
import { useTags, useAllPetTags } from '@/hooks/useTags'
import { useAuth } from '@/features/auth/AuthProvider'
import { petAge } from '@/lib/format'

export default function PetList() {
  const { data: pets, isLoading } = usePets()
  const { data: tags } = useTags()
  const { data: petTags } = useAllPetTags()
  const { data: remembered } = useRememberedPets()
  const { user } = useAuth()
  const [activeTag, setActiveTag] = useState<string | null>(null)

  if (isLoading) return <p className="p-6 text-ink/50">Loading…</p>

  // Only offer tags that are actually in use — an empty filter chip is just noise.
  const usedTagIds = new Set(petTags?.map(pt => pt.tag_id))
  const filterTags = tags?.filter(t => usedTagIds.has(t.id)) ?? []

  const taggedPetIds = activeTag
    ? new Set(petTags?.filter(pt => pt.tag_id === activeTag).map(pt => pt.pet_id))
    : null
  const visible = taggedPetIds ? (pets ?? []).filter(p => taggedPetIds.has(p.id)) : (pets ?? [])

  // pets now includes anything shared with this account, so say which are which.
  const owned = visible.filter(p => p.user_id === user?.id)
  const shared = visible.filter(p => p.user_id !== user?.id)

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl">Your pets</h1>
        <Link to="/pets/new" className="rounded-md bg-ink text-paper px-4 py-2 text-sm">Add pet</Link>
      </div>

      {filterTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-5" role="group" aria-label="Filter by tag">
          {filterTags.map(t => {
            const on = activeTag === t.id
            return (
              <button key={t.id} onClick={() => setActiveTag(on ? null : t.id)} aria-pressed={on}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs transition ${
                  on ? 'text-paper' : 'text-ink/70 border border-line bg-card hover:border-moss'}`}
                style={on ? { backgroundColor: t.color } : undefined}>
                {t.name}
                {on && <X size={11} aria-hidden />}
              </button>
            )
          })}
        </div>
      )}

      {pets?.length === 0 && (
        <p className="text-ink/60">No pets yet. Add your first pet to start their chart.</p>
      )}
      {pets && pets.length > 0 && visible.length === 0 && (
        <p className="text-ink/60">No pets carry that tag.</p>
      )}

      <PetGrid pets={owned} />

      {shared.length > 0 && (
        <>
          <h2 className="text-xl mt-8 mb-3 flex items-center gap-2">
            <Users size={18} className="text-moss" aria-hidden /> Shared with you
          </h2>
          <PetGrid pets={shared} shared />
        </>
      )}

      {/* Kept visible but set apart — the records stay, the care reminders don't. */}
      {remembered && remembered.length > 0 && !activeTag && (
        <>
          <h2 className="text-xl mt-10 mb-3 flex items-center gap-2">
            <Heart size={18} className="text-coral" aria-hidden /> Remembered
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {remembered.map(p => (
              <li key={p.id}>
                <Link to={`/pets/${p.id}`}
                  className="block bg-card/70 rounded-card border border-line shadow-sm shadow-ink/5 p-5 hover:border-coral">
                  <h3 className="text-lg">{p.name}</h3>
                  <p className="text-sm text-ink/50">
                    {p.breed ?? p.species}
                    {p.deceased_on && <> · {new Date(p.deceased_on).getFullYear()}</>}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  )
}

function PetGrid({ pets, shared = false }: { pets: NonNullable<ReturnType<typeof usePets>['data']>; shared?: boolean }) {
  if (pets.length === 0) return null
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {pets.map(p => (
        <li key={p.id}>
          <Link to={`/pets/${p.id}`}
            className="block bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-5 hover:border-moss">
            <h2 className="text-xl flex items-center gap-2">
              {p.name}
              {p.nickname && <span className="text-ink/50 text-base">“{p.nickname}”</span>}
              {shared && (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-wave text-ink/70 px-2 py-0.5 text-xs font-normal">
                  <Users size={11} aria-hidden /> Shared
                </span>
              )}
            </h2>
            <p className="text-sm text-ink/60">{p.breed ?? p.species} · {petAge(p.birth_date, p.estimated_age_months)}</p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
