import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { usePet } from '@/hooks/usePets'
import { usePetCollection } from '@/hooks/usePetRecords'
import { petAge, fmtDate } from '@/lib/format'
import type { Allergy } from '@/types/db'
import MedicationsPanel from '@/features/medications/MedicationsPanel'
import AllergiesPanel from '@/features/allergies/AllergiesPanel'
import VaccinationsPanel from '@/features/vaccinations/VaccinationsPanel'
import WeightPanel from '@/features/weight/WeightPanel'
import VisitsPanel from '@/features/appointments/VisitsPanel'
import NutritionPanel from '@/features/nutrition/NutritionPanel'
import FeedingPanel from '@/features/feeding/FeedingPanel'
import GroomingPanel from '@/features/grooming/GroomingPanel'
import BehaviorPanel from '@/features/behavior/BehaviorPanel'
import NotesPanel from '@/features/notes/NotesPanel'
import DocumentsPanel from '@/features/documents/DocumentsPanel'
import PhotosPanel from './PhotosPanel'

const TABS = ['Overview','Medications','Allergies','Vaccinations','Weight','Vet visits','Nutrition','Feeding','Grooming','Behavior','Notes','Documents','Photos'] as const
type Tab = typeof TABS[number]

export default function PetDetail() {
  const { id = '' } = useParams()
  const { data: pet, isLoading } = usePet(id)
  const { data: allergies } = usePetCollection<Allergy>('allergies', id, { column: 'severity' })
  const [tab, setTab] = useState<Tab>('Overview')

  if (isLoading) return <p className="p-6 text-ink/50">Loading…</p>
  if (!pet) return <p className="p-6 text-alert">Pet not found.</p>

  const severe = allergies?.filter(a => a.severity === 'severe' || a.severity === 'life_threatening') ?? []

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <header className="mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl">{pet.name}</h1>
            <p className="text-ink/60">
              {pet.breed ?? pet.species}{pet.is_mixed_breed && ' mix'} · {petAge(pet.birth_date, pet.estimated_age_months)} · {pet.sex.replace('_', ', ')}
            </p>
          </div>
          <Link to={`/pets/${id}/edit`} className="rounded-md border border-line px-4 py-2 text-sm shrink-0">Edit profile</Link>
        </div>
        {severe.length > 0 && (
          <p role="alert" className="mt-3 flex items-center gap-2 rounded-md bg-alert text-paper px-3 py-2 text-sm">
            <AlertTriangle size={16} aria-hidden />
            Severe allergy: {severe.map(a => a.allergen).join(', ')} — see Allergies tab for emergency treatment.
          </p>
        )}
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-line mb-6" aria-label="Pet sections">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} aria-current={tab === t ? 'page' : undefined}
            className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px ${tab === t ? 'border-moss text-moss font-medium' : 'border-transparent text-ink/60'}`}>
            {t}
          </button>
        ))}
      </nav>

      {tab === 'Overview' && <Overview pet={pet} />}
      {tab === 'Medications' && <MedicationsPanel petId={id} />}
      {tab === 'Allergies' && <AllergiesPanel petId={id} />}
      {tab === 'Vaccinations' && <VaccinationsPanel petId={id} />}
      {tab === 'Weight' && <WeightPanel petId={id} goalKg={pet.goal_weight_kg} />}
      {tab === 'Vet visits' && <VisitsPanel petId={id} />}
      {tab === 'Nutrition' && <NutritionPanel petId={id} />}
      {tab === 'Feeding' && <FeedingPanel petId={id} />}
      {tab === 'Grooming' && <GroomingPanel petId={id} />}
      {tab === 'Behavior' && <BehaviorPanel petId={id} />}
      {tab === 'Notes' && <NotesPanel petId={id} />}
      {tab === 'Documents' && <DocumentsPanel petId={id} />}
      {tab === 'Photos' && <PhotosPanel petId={id} />}
    </main>
  )
}

function Overview({ pet }: { pet: NonNullable<ReturnType<typeof usePet>['data']> }) {
  const rows: [string, string | null | undefined][] = [
    ['Birth date', pet.birth_date ? fmtDate(pet.birth_date) : null],
    ['Adopted', pet.adoption_date ? fmtDate(pet.adoption_date) : null],
    ['Rescue org', pet.rescue_org],
    ['Color', pet.color],
    ['Microchip', pet.microchip_no],
    ['Insurance', pet.insurance_provider && `${pet.insurance_provider} · ${pet.insurance_policy_no ?? ''}`],
    ['Registration', pet.registration_no],
    ['Activity level', pet.activity_level?.replace('_', ' ')],
    ['Favorite foods', pet.favorite_foods?.join(', ')],
    ['Favorite toys', pet.favorite_toys?.join(', ')],
    ['Favorite activities', pet.favorite_activities?.join(', ')]
  ]
  return (
    <dl className="bg-card rounded-card border border-line p-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
      {rows.filter(([, v]) => v).map(([k, v]) => (
        <div key={k}><dt className="text-xs uppercase tracking-wide text-ink/50">{k}</dt><dd>{v}</dd></div>
      ))}
      {rows.every(([, v]) => !v) && <p className="text-sm text-ink/50 sm:col-span-2">Profile is mostly empty — use Edit profile to fill it in.</p>}
    </dl>
  )
}
