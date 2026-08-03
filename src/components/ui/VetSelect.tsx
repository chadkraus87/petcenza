import type { UseFormRegisterReturn } from 'react-hook-form'
import { useUserCollection } from '@/hooks/useUserRecords'
import type { Veterinarian } from '@/types/db'

/**
 * Dropdown of the user's saved veterinarians for linking records (prescriber, visiting vet…).
 * Value is the vet id or '' (→ null after toRow). Empty when no vets exist yet.
 */
export default function VetSelect({ label, registration }: { label: string; registration: UseFormRegisterReturn }) {
  const { data: vets } = useUserCollection<Veterinarian>('veterinarians', { column: 'name', ascending: true })
  return (
    <div>
      <label className="block text-sm mb-1">{label}</label>
      <select className="w-full rounded-md border border-line px-3 py-2 bg-card" {...registration}>
        <option value="">— None —</option>
        {vets?.map(v => (
          <option key={v.id} value={v.id}>{v.name}{v.clinic ? ` · ${v.clinic}` : ''}</option>
        ))}
      </select>
    </div>
  )
}
