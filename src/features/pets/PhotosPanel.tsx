import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { validateUpload } from '@/schemas/records'
import { scanUpload } from '@/lib/uploads'
import type { PetPhoto } from '@/types/db'

export default function PhotosPanel({ petId }: { petId: string }) {
  const qc = useQueryClient()
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: photos } = useQuery({
    queryKey: ['pet_photos', petId],
    queryFn: async () => {
      const { data, error } = await supabase.from('pet_photos').select('*').eq('pet_id', petId).order('created_at', { ascending: false })
      if (error) throw error
      const withUrls = await Promise.all((data as PetPhoto[]).map(async p => {
        const { data: signed } = await supabase.storage.from('pet-photos').createSignedUrl(p.storage_path, 3600)
        return { ...p, url: signed?.signedUrl ?? '' }
      }))
      return withUrls
    }
  })

  const upload = useCallback(async (files: FileList | File[]) => {
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    for (const file of Array.from(files)) {
      const invalid = validateUpload(file)
      if (invalid) { setError(`${file.name}: ${invalid}`); continue }
      const path = `${user.id}/${petId}/${crypto.randomUUID()}.${file.name.split('.').pop()?.toLowerCase()}`
      const { error: upErr } = await supabase.storage.from('pet-photos').upload(path, file, { contentType: file.type })
      if (upErr) { setError(upErr.message); continue }
      await supabase.from('pet_photos').insert({ user_id: user.id, pet_id: petId, storage_path: path })
      const scan = await scanUpload('pet-photos', path)
      if (!scan.ok) setError(`${file.name}: rejected — file content didn't match its type.`)
    }
    void qc.invalidateQueries({ queryKey: ['pet_photos', petId] })
  }, [petId, qc])

  return (
    <section>
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); void upload(e.dataTransfer.files) }}
        className={`rounded-card border-2 border-dashed p-8 text-center mb-4 ${dragOver ? 'border-moss bg-moss/5' : 'border-line'}`}>
        <p className="text-sm text-ink/60 mb-2">Drag photos here, or</p>
        <label className="inline-block rounded-md bg-ink text-paper px-4 py-2 text-sm cursor-pointer">
          Choose photos
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only"
            onChange={e => e.target.files && void upload(e.target.files)} />
        </label>
      </div>
      {error && <p role="alert" className="text-sm text-alert mb-4">{error}</p>}
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {photos?.map(p => (
          <li key={p.id} className="rounded-card overflow-hidden border border-line aspect-square bg-line">
            {p.url && <img src={p.url} alt={p.caption ?? 'Pet photo'} className="w-full h-full object-cover" loading="lazy" />}
          </li>
        ))}
      </ul>
      {photos?.length === 0 && <p className="text-sm text-ink/50">No photos yet.</p>}
    </section>
  )
}
