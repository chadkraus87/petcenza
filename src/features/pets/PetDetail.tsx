import { useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Heart, SearchX } from 'lucide-react'
import { EmptyState, PageSkeleton, ButtonLink } from '@/components/ui/primitives'
import { usePet } from '@/hooks/usePets'
import { usePetCollection } from '@/hooks/usePetRecords'
import { petAge, fmtDate } from '@/lib/format'
import { isMedicationActive, type Allergy, type Medication, type Vaccination, type WeightEntry } from '@/types/db'
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
import SharingPanel from '@/features/sharing/SharingPanel'
import PetDangerZone from './PetDangerZone'
import TagEditor from '@/features/tags/TagEditor'
import { useCanEditPet } from '@/hooks/useSharing'
import PhotosPanel from './PhotosPanel'

const TABS = ['Overview','Medications','Allergies','Vaccinations','Weight','Vet visits','Nutrition','Feeding','Grooming','Behavior','Notes','Documents','Photos','Sharing','Manage'] as const
type Tab = typeof TABS[number]
const slug = (t: Tab) => t.toLowerCase().replace(/\s+/g, '-')
const fromSlug = (v: string | null): Tab => TABS.find(t => slug(t) === v) ?? 'Overview'
const SEX_LABEL: Record<string, string> = {
  male: 'Male', female: 'Female', male_neutered: 'Male, neutered', female_spayed: 'Female, spayed', unknown: 'Sex unknown'
}

export default function PetDetail() {
  const { id = '' } = useParams()
  const { data: pet, isLoading } = usePet(id)
  const { data: allergies } = usePetCollection<Allergy>('allergies', id, { column: 'severity' })
  // The tab lives in the URL, so Back, reload and shared links return to the same section.
  const [params, setParams] = useSearchParams()
  const tab = fromSlug(params.get('tab'))
  const setTab = (t: Tab) => setParams(t === 'Overview' ? {} : { tab: slug(t) }, { replace: true })
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const { data: canEdit } = useCanEditPet(id)

  if (isLoading) return <PageSkeleton />
  if (!pet) {
    return (
      <main className="px-4 py-6 sm:px-6 lg:px-8 max-w-lg mx-auto">
        <EmptyState icon={<SearchX size={20} />} title="We couldn't find that pet"
          action={<ButtonLink to="/pets" variant="secondary">Back to your pets</ButtonLink>}>
          It may have been deleted, or it was shared with you and access has ended.
        </EmptyState>
      </main>
    )
  }

  const severe = allergies?.filter(a => a.severity === 'severe' || a.severity === 'life_threatening') ?? []

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <header className="mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1>{pet.name}</h1>
            <p className="text-muted">
              {pet.breed ?? pet.species}{pet.is_mixed_breed && !/\bmix/i.test(pet.breed ?? '') && ' mix'} · {petAge(pet.birth_date, pet.estimated_age_months)} · {SEX_LABEL[pet.sex] ?? pet.sex}
            </p>
          </div>
          <Link to={`/pets/${id}/edit`} className="btn btn-secondary shrink-0">Edit profile</Link>
        </div>
        <div className="mt-3"><TagEditor petId={id} canEdit={canEdit === true} /></div>
        {pet.deceased_on && (
          <p className="mt-3 flex items-center gap-2 rounded-lg bg-wave text-ink px-3 py-2 text-sm">
            <Heart size={16} className="text-coral shrink-0" aria-hidden />
            In memory of {pet.name} · {fmtDate(pet.deceased_on)}
          </p>
        )}
        {severe.length > 0 && (
          <p role="alert" className="mt-3 flex items-center gap-2 rounded-lg bg-alert text-paper px-3 py-2 text-sm">
            <AlertTriangle size={16} aria-hidden />
            Severe allergy: {severe.map(a => a.allergen).join(', ')} — see Allergies tab for emergency treatment.
          </p>
        )}
      </header>

      {/* WAI-ARIA tabs: arrow keys move between tabs, Home/End jump to the ends. */}
      <div role="tablist" aria-label="Pet sections"
        className="flex gap-1 overflow-x-auto md:overflow-visible md:flex-wrap snap-x border-b border-line mb-6 -mx-4 px-4 sm:mx-0 sm:px-0"
        onKeyDown={e => {
          const i = TABS.indexOf(tab)
          const next = e.key === 'ArrowRight' ? (i + 1) % TABS.length : e.key === 'ArrowLeft' ? (i - 1 + TABS.length) % TABS.length
            : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : -1
          if (next < 0) return
          e.preventDefault(); setTab(TABS[next]); tabRefs.current[next]?.focus()
        }}>
        {TABS.map((t, i) => (
          <button key={t} ref={el => { tabRefs.current[i] = el }} role="tab" id={`tab-${slug(t)}`}
            aria-selected={tab === t} aria-controls="pet-panel" tabIndex={tab === t ? 0 : -1}
            onClick={() => setTab(t)}
            className={`snap-start px-3 min-h-11 text-sm whitespace-nowrap border-b-2 -mb-px ${tab === t ? 'border-moss text-moss font-medium' : 'border-transparent text-muted'}`}>
            {t}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="pet-panel" aria-labelledby={`tab-${slug(tab)}`}>
      {tab === 'Overview' && <Overview pet={pet} onOpen={setTab} />}
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
      {tab === 'Sharing' && <SharingPanel petId={id} petName={pet.name} />}
      {tab === 'Manage' && <PetDangerZone pet={pet} />}
      </div>
    </main>
  )
}

function Overview({ pet, onOpen }: { pet: NonNullable<ReturnType<typeof usePet>['data']>; onOpen: (t: Tab) => void }) {
  const { data: meds } = usePetCollection<Medication>('medications', pet.id, { column: 'starts_on' })
  const { data: vax } = usePetCollection<Vaccination>('vaccinations', pet.id, { column: 'next_due_on', ascending: true })
  const { data: weights } = usePetCollection<WeightEntry>('weight_entries', pet.id, { column: 'measured_on' })
  const activeMeds = (meds ?? []).filter(isMedicationActive)
  const nextVax = (vax ?? []).filter(v => v.next_due_on).sort((a, b) => a.next_due_on!.localeCompare(b.next_due_on!))[0]
  const today = new Date().toISOString().slice(0, 10)
  const lastWeight = weights?.[0]

  // Health first: this is what a vet, a sitter or a worried owner opens the page for.
  const summary: { label: string; value: string; tone?: string; tab: Tab }[] = [
    { label: 'Current medications', tab: 'Medications',
      value: activeMeds.length ? activeMeds.map(m => m.name).join(', ') : 'None' },
    { label: 'Next vaccination', tab: 'Vaccinations',
      value: nextVax ? `${nextVax.vaccine}, ${nextVax.next_due_on! < today ? 'overdue since' : 'due'} ${fmtDate(nextVax.next_due_on!)}` : 'Nothing scheduled',
      tone: nextVax && nextVax.next_due_on! < today ? 'text-alert' : undefined },
    { label: 'Last weight', tab: 'Weight',
      value: lastWeight ? `${lastWeight.weight_kg} kg on ${fmtDate(lastWeight.measured_on)}` : 'Not recorded' }
  ]

  const rows: [string, string | null | undefined][] = [
    ['Birth date', pet.birth_date ? fmtDate(pet.birth_date) : null],
    ['Adopted', pet.adoption_date ? fmtDate(pet.adoption_date) : null],
    ['Rescue org', pet.rescue_org],
    ['Color', pet.color],
    ['Microchip', pet.microchip_no],
    ['Insurance', pet.insurance_provider && [pet.insurance_provider, pet.insurance_policy_no].filter(Boolean).join(' · ')],
    ['Registration', pet.registration_no],
    ['Activity level', pet.activity_level?.replace('_', ' ')],
    ['Favorite foods', pet.favorite_foods?.join(', ')],
    ['Favorite toys', pet.favorite_toys?.join(', ')],
    ['Favorite activities', pet.favorite_activities?.join(', ')]
  ]
  return (
    <>
    <section aria-label="Health summary" className="grid gap-3 sm:grid-cols-3 mb-4">
      {summary.map(({ label, value, tone, tab }) => (
        <button key={label} onClick={() => onOpen(tab)}
          className="surface p-4 text-left hover:border-moss transition">
          <span className="block text-sm text-muted">{label}</span>
          <span className={`block font-medium mt-0.5 ${tone ?? ''}`}>{value}</span>
        </button>
      ))}
    </section>
    <dl className="surface p-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
      {rows.filter(([, v]) => v).map(([k, v]) => (
        <div key={k}><dt className="text-xs uppercase tracking-wide text-muted">{k}</dt><dd>{v}</dd></div>
      ))}
      {rows.every(([, v]) => !v) && (
        <div className="sm:col-span-2">
          <EmptyState title="Nothing on file yet"
            action={<ButtonLink to={`/pets/${pet.id}/edit`} variant="secondary">Fill in the profile</ButtonLink>}>
            Birth date, microchip and insurance are the details a vet or sitter asks for first.
          </EmptyState>
        </div>
      )}
    </dl>
    </>
  )
}
