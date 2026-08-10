import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { Star, Siren, Trash2 } from 'lucide-react'
import { vetSchema, emergencyContactSchema } from '@/schemas/records'
import { toRow } from '@/schemas/pet'
import { useUserCollection, useSaveUserRow, useDeleteUserRow } from '@/hooks/useUserRecords'
import { TextField, TextArea } from '@/components/ui/Field'
import type { Veterinarian, EmergencyContact } from '@/types/db'

type VetForm = z.infer<typeof vetSchema>
type ContactForm = z.infer<typeof emergencyContactSchema>

export default function CareTeamPage() {
  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl mb-1">Care team</h1>
      <p className="text-muted mb-6">Your vets and emergency contacts power the Emergency screen — add them here.</p>
      <VetsSection />
      <div className="h-8" />
      <ContactsSection />
    </main>
  )
}

function VetsSection() {
  const qc = useQueryClient()
  const { data: vets } = useUserCollection<Veterinarian>('veterinarians', { column: 'is_primary', ascending: false })
  const save = useSaveUserRow('veterinarians')
  const remove = useDeleteUserRow('veterinarians')
  const [adding, setAdding] = useState(false)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<VetForm>({ resolver: zodResolver(vetSchema) })

  const refreshEmergency = () => qc.invalidateQueries({ queryKey: ['emergency'] })
  const onSubmit = handleSubmit(async v => {
    await save.mutateAsync({ values: toRow(v) }); refreshEmergency(); reset(); setAdding(false)
  })

  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl">Veterinarians</h2>
        <button onClick={() => setAdding(a => !a)} className="rounded-md bg-ink text-paper px-4 py-2 text-sm">
          {adding ? 'Close' : 'Add vet'}
        </button>
      </div>
      {adding && (
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-5 mb-6" noValidate>
          <TextField label="Vet name" error={errors.name} {...register('name')} />
          <TextField label="Clinic" error={errors.clinic} {...register('clinic')} />
          <TextField label="Phone" type="tel" error={errors.phone} {...register('phone')} />
          <TextField label="Email" type="email" error={errors.email} {...register('email')} />
          <div className="sm:col-span-2"><TextField label="Address" error={errors.address} {...register('address')} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('is_primary')} /> Primary vet</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('is_emergency_clinic')} /> Emergency clinic</label>
          <div className="sm:col-span-2"><TextArea label="Notes" error={errors.notes} {...register('notes')} /></div>
          <button type="submit" disabled={isSubmitting} className="rounded-md bg-moss text-paper px-5 py-2 w-fit disabled:opacity-50">Save vet</button>
        </form>
      )}
      <ul className="space-y-3">
        {vets?.map(v => (
          <li key={v.id} className="bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-4 flex justify-between gap-3">
            <div>
              <p className="font-medium flex items-center gap-2">
                {v.name}
                {v.is_primary && <span className="inline-flex items-center gap-1 text-xs text-moss"><Star size={12} aria-hidden /> Primary</span>}
                {v.is_emergency_clinic && <span className="inline-flex items-center gap-1 text-xs text-alert"><Siren size={12} aria-hidden /> ER</span>}
              </p>
              {v.clinic && <p className="text-sm text-muted">{v.clinic}</p>}
              {v.phone && <p className="text-sm text-muted">{v.phone}</p>}
              {v.address && <p className="text-sm text-muted">{v.address}</p>}
            </div>
            <button aria-label={`Delete ${v.name}`} onClick={() => { remove.mutate(v.id); refreshEmergency() }} className="text-alert self-start"><Trash2 size={16} /></button>
          </li>
        ))}
      </ul>
      {vets?.length === 0 && <p className="text-sm text-muted">No veterinarians added yet.</p>}
    </section>
  )
}

function ContactsSection() {
  const qc = useQueryClient()
  const { data: contacts } = useUserCollection<EmergencyContact>('emergency_contacts', { column: 'sort_order' })
  const save = useSaveUserRow('emergency_contacts')
  const remove = useDeleteUserRow('emergency_contacts')
  const [adding, setAdding] = useState(false)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<ContactForm>({ resolver: zodResolver(emergencyContactSchema) })

  const refreshEmergency = () => qc.invalidateQueries({ queryKey: ['emergency'] })
  const onSubmit = handleSubmit(async v => {
    await save.mutateAsync({ values: toRow(v) }); refreshEmergency(); reset(); setAdding(false)
  })

  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl">Emergency contacts</h2>
        <button onClick={() => setAdding(a => !a)} className="rounded-md bg-ink text-paper px-4 py-2 text-sm">
          {adding ? 'Close' : 'Add contact'}
        </button>
      </div>
      {adding && (
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-5 mb-6" noValidate>
          <TextField label="Label (e.g. Pet sitter)" error={errors.label} {...register('label')} />
          <TextField label="Name" error={errors.name} {...register('name')} />
          <TextField label="Phone" type="tel" error={errors.phone} {...register('phone')} />
          <div className="sm:col-span-2"><TextArea label="Notes" error={errors.notes} {...register('notes')} /></div>
          <button type="submit" disabled={isSubmitting} className="rounded-md bg-moss text-paper px-5 py-2 w-fit disabled:opacity-50">Save contact</button>
        </form>
      )}
      <ul className="space-y-3">
        {contacts?.map(c => (
          <li key={c.id} className="bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-4 flex justify-between gap-3">
            <div>
              <p className="font-medium">{c.label} <span className="font-normal text-muted">— {c.name}</span></p>
              <p className="text-sm text-muted">{c.phone}</p>
              {c.notes && <p className="text-sm text-muted">{c.notes}</p>}
            </div>
            <button aria-label={`Delete ${c.label}`} onClick={() => { remove.mutate(c.id); refreshEmergency() }} className="text-alert self-start"><Trash2 size={16} /></button>
          </li>
        ))}
      </ul>
      {contacts?.length === 0 && <p className="text-sm text-muted">No emergency contacts yet.</p>}
    </section>
  )
}
