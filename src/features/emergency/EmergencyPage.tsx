import { useQuery } from '@tanstack/react-query'
import { Phone, Siren } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { EmergencyContact, Veterinarian, Allergy } from '@/types/db'
import SeverityBadge from '@/components/ui/SeverityBadge'
import { DISCLAIMER } from '@/components/Disclaimer'
import { ButtonLink, Card, EmptyState, PageSkeleton } from '@/components/ui/primitives'

type EmergencyPet = { id: string; name: string; species: string; breed: string | null; color: string | null; microchip_no: string | null }

export default function EmergencyPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['emergency'],
    queryFn: async () => {
      const [vets, contacts, allergies, pets] = await Promise.all([
        supabase.from('veterinarians').select('*').order('is_primary', { ascending: false }),
        supabase.from('emergency_contacts').select('*').order('sort_order'),
        supabase.from('allergies').select('*').in('severity', ['severe', 'life_threatening']),
        supabase.from('pets').select('id, name, species, breed, color, microchip_no').eq('archived', false)
      ])
      return {
        vets: (vets.data ?? []) as Veterinarian[],
        contacts: (contacts.data ?? []) as EmergencyContact[],
        allergies: (allergies.data ?? []) as Allergy[],
        pets: (pets.data ?? []) as EmergencyPet[]
      }
    }
  })

  const petName = (id: string) => data?.pets.find(p => p.id === id)?.name ?? 'Pet'
  const primary = data?.vets.find(v => v.is_primary)
  const erClinic = data?.vets.find(v => v.is_emergency_clinic)

  if (isLoading) return <PageSkeleton />
  if (error && !data) {
    return (
      <main className="px-4 py-6 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <h1 className="mb-4 flex items-center gap-2"><Siren className="text-alert" aria-hidden /> Emergency</h1>
        <Card className="p-5 border-alert/40">
          <p className="font-medium mb-1">Your saved contacts couldn't load.</p>
          <p className="text-muted mb-4">If your pet needs help now, call your vet or the nearest emergency animal hospital directly.</p>
          <button onClick={() => void refetch()} className="btn btn-secondary">Try again</button>
        </Card>
      </main>
    )
  }

  const nobody = !primary && !erClinic && (data?.contacts.length ?? 0) === 0

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <h1 className="mb-1 flex items-center gap-2"><Siren className="text-alert" aria-hidden /> Emergency</h1>
      {/* Order is deliberate: the numbers come first. In a crisis nobody should scroll past
          allergies and microchips to reach the 24-hour clinic. */}
      <p className="text-muted mb-4">{DISCLAIMER.emergency}</p>

      {nobody ? (
        <Card className="p-5 mb-6">
          <EmptyState title="No emergency numbers saved"
            action={<ButtonLink to="/care-team">Add your vet and an emergency clinic</ButtonLink>}>
            Save them now so they're one tap away when you need them.
          </EmptyState>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 mb-6">
          {erClinic && <ContactCard title="24-hour emergency clinic" name={erClinic.clinic ?? erClinic.name} phone={erClinic.phone} address={erClinic.address} urgent />}
          {primary && <ContactCard title="Your vet" name={`${primary.name}${primary.clinic ? `, ${primary.clinic}` : ''}`} phone={primary.phone} address={primary.address} />}
          {data?.contacts.map(c => (
            <ContactCard key={c.id} title={c.label} name={c.name} phone={c.phone} />
          ))}
        </div>
      )}

      {data && data.allergies.length > 0 && (
        <section className="mb-6 rounded-card border-2 border-alert bg-alert/5 p-4" aria-labelledby="allergy-heading">
          <h2 id="allergy-heading" className="text-lg text-alert mb-2">Critical allergies</h2>
          <ul className="space-y-2">
            {data.allergies.map(a => (
              <li key={a.id} className="text-sm">
                <span className="font-medium">{petName(a.pet_id)}</span>: {a.allergen} <SeverityBadge severity={a.severity} />
                {a.emergency_treatment && <span className="block text-alert">Treatment: {a.emergency_treatment}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {data && data.pets.length > 0 && (
        <section className="surface p-4 mb-6" aria-labelledby="identity-heading">
          <h2 id="identity-heading" className="text-lg mb-2">Pet identity</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.pets.map(p => (
              <li key={p.id} className="text-sm">
                <span className="font-medium">{p.name}</span>
                <span className="text-muted">, {p.breed ?? p.species}{p.color ? `, ${p.color}` : ''}</span>
                {p.microchip_no
                  ? <span className="block">Microchip: <code className="text-ink">{p.microchip_no}</code></span>
                  : <span className="block text-muted">No microchip on file</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-muted">Once you've opened this page, it's saved on this device and opens without a connection.</p>
    </main>
  )
}

function ContactCard({ title, name, phone, address, urgent }: { title: string; name: string; phone: string | null; address?: string | null; urgent?: boolean }) {
  return (
    <div className={`bg-card rounded-card border p-4 ${urgent ? 'border-2 border-alert' : 'border-line'}`}>
      <p className={`text-sm font-medium mb-0.5 ${urgent ? 'text-alert' : 'text-muted'}`}>{title}</p>
      <p className="font-medium">{name}</p>
      {address && <p className="text-sm text-muted">{address}</p>}
      {phone && (
        <a href={`tel:${phone.replace(/[^+\d]/g, '')}`} aria-label={`Call ${name}, ${phone}`}
          className={`btn mt-3 w-full ${urgent ? 'btn-danger' : 'btn-primary'}`}>
          <Phone size={16} aria-hidden /> Call {phone}
        </a>
      )}
    </div>
  )
}
