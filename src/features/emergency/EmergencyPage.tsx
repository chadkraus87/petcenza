import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Phone, Siren } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { EmergencyContact, Veterinarian, Allergy } from '@/types/db'
import SeverityBadge from '@/components/ui/SeverityBadge'

type EmergencyPet = { id: string; name: string; species: string; breed: string | null; color: string | null; microchip_no: string | null }

export default function EmergencyPage() {
  const { data } = useQuery({
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

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl mb-1 flex items-center gap-2"><Siren className="text-alert" aria-hidden /> Emergency</h1>
      <p className="text-ink/60 mb-6">Everything you need in a crisis, one screen, works offline.</p>

      {data && data.allergies.length > 0 && (
        <section className="mb-6 rounded-card border-2 border-alert bg-alert/5 p-4">
          <h2 className="text-lg text-alert mb-2">Critical allergies</h2>
          <ul className="space-y-2">
            {data.allergies.map(a => (
              <li key={a.id} className="text-sm">
                <span className="font-medium">{petName(a.pet_id)}</span>: {a.allergen} <SeverityBadge severity={a.severity} />
                {a.emergency_treatment && <span className="block text-alert">→ {a.emergency_treatment}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {data && data.pets.length > 0 && (
        <section className="mb-6 rounded-card border border-line bg-card p-4">
          <h2 className="text-lg mb-2">Pet identity</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {data.pets.map(p => (
              <li key={p.id} className="text-sm">
                <span className="font-medium">{p.name}</span>
                <span className="text-ink/60"> · {p.breed ?? p.species}{p.color ? `, ${p.color}` : ''}</span>
                {p.microchip_no
                  ? <span className="block text-xs">Microchip: <code className="text-ink">{p.microchip_no}</code></span>
                  : <span className="block text-xs text-ink/40">No microchip on file</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {primary && <ContactCard title="Primary veterinarian" name={`${primary.name}${primary.clinic ? ` · ${primary.clinic}` : ''}`} phone={primary.phone} address={primary.address} />}
        {erClinic && <ContactCard title="Emergency clinic" name={erClinic.clinic ?? erClinic.name} phone={erClinic.phone} address={erClinic.address} urgent />}
        {data?.contacts.map(c => (
          <ContactCard key={c.id} title={c.label} name={c.name} phone={c.phone} />
        ))}
      </div>
      {data && !primary && !erClinic && data.contacts.length === 0 && (
        <p className="text-sm text-ink/50 mt-4">
          No emergency contacts yet.{' '}
          <Link to="/care-team" className="text-moss underline">Add your vet and an emergency clinic</Link>{' '}
          so they're ready when you need them.
        </p>
      )}
    </main>
  )
}

function ContactCard({ title, name, phone, address, urgent }: { title: string; name: string; phone: string | null; address?: string | null; urgent?: boolean }) {
  return (
    <section className={`bg-card rounded-card border p-4 ${urgent ? 'border-alert' : 'border-line'}`}>
      <h2 className="text-xs uppercase tracking-wide text-ink/50 mb-1">{title}</h2>
      <p className="font-medium">{name}</p>
      {address && <p className="text-sm text-ink/60">{address}</p>}
      {phone && (
        <a href={`tel:${phone.replace(/[^+\d]/g, '')}`} className="mt-2 inline-flex items-center gap-2 rounded-md bg-ink text-paper px-3 py-1.5 text-sm">
          <Phone size={14} aria-hidden /> {phone}
        </a>
      )}
    </section>
  )
}
