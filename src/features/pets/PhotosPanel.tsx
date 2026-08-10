import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Star, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { validateUpload } from '@/schemas/records'
import { scanUpload } from '@/lib/uploads'
import { useSetPrimaryPhoto, useDeletePhoto } from '@/hooks/usePetPhotos'
import { useCanEditPet } from '@/hooks/useSharing'
import type { PetPhoto } from '@/types/db'

export default function PhotosPanel({ petId }: { petId: string }) {
  const qc = useQueryClient()
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setPrimary = useSetPrimaryPhoto(petId)
  const del = useDeletePhoto(petId)
  // Viewers can see the album but not change it (RLS enforces this regardless; hiding the
  // controls keeps them from clicking something that would just quietly refuse).
  const { data: canEdit } = useCanEditPet(petId)

  const { data: photos } = useQuery({
    queryKey: ['pet_photos', petId],
    queryFn: async () => {
      const { data, error } = await supabase.from('pet_photos').select('*').eq('pet_id', petId).order('created_at', { ascending: false })
      if (error) throw error
      const rows = data as PetPhoto[]
      if (rows.length === 0) return []
      // One signing call for the whole album rather than one per photo.
      const { data: signed } = await supabase.storage.from('pet-photos')
        .createSignedUrls(rows.map(p => p.storage_path), 3600)
      const urlFor = new Map((signed ?? []).map(s => [s.path, s.signedUrl]))
      return rows.map(p => ({ ...p, url: urlFor.get(p.storage_path) ?? '' }))
    }
  })

  const upload = useCallback(async (files: FileList | File[]) => {
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    for (const file of Array.from(files)) {
      const invalid = validateUpload(file)
      if (invalid) { setError(`${file.name}: ${invalid}`); continue }
      // Pet-scoped path: access is decided by pet membership, not by who uploaded.
      const path = `${petId}/${crypto.randomUUID()}.${file.name.split('.').pop()?.toLowerCase()}`
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
        <p className="text-sm text-muted mb-2">Drag photos here, or</p>
        <label className="inline-block rounded-md bg-ink text-paper px-4 py-2 text-sm cursor-pointer">
          Choose photos
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only"
            onChange={e => e.target.files && void upload(e.target.files)} />
        </label>
      </div>
      {error && <p role="alert" className="text-sm text-alert mb-4">{error}</p>}
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {photos?.map(p => (
          <li key={p.id} className="relative group rounded-card overflow-hidden border border-line aspect-square bg-line">
            {p.url && <img src={p.url} alt={p.caption ?? 'Pet photo'} className="w-full h-full object-cover" loading="lazy" />}

            {p.is_primary && (
              <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-ink/80 text-paper px-2 py-0.5 text-xs">
                <Star size={11} fill="currentColor" aria-hidden /> Profile
              </span>
            )}

            {/* Always reachable by keyboard; the hover fade is only a visual nicety. */}
            {canEdit && (
            <div className="absolute bottom-0 inset-x-0 flex justify-end gap-1 p-2 bg-gradient-to-t from-ink/70 to-transparent
                            opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
              {!p.is_primary && (
                <button type="button" onClick={() => setPrimary.mutate(p.id)} disabled={setPrimary.isPending}
                  title="Use as profile photo" aria-label={`Use as profile photo`}
                  className="rounded-md bg-card/90 text-ink p-1.5 hover:bg-card disabled:opacity-50">
                  <Star size={14} aria-hidden />
                </button>
              )}
              <button type="button" disabled={del.isPending}
                onClick={() => {
                  if (confirm('Delete this photo? This cannot be undone.')) {
                    del.mutate({ id: p.id, storagePath: p.storage_path })
                  }
                }}
                title="Delete photo" aria-label="Delete photo"
                className="rounded-md bg-card/90 text-alert p-1.5 hover:bg-card disabled:opacity-50">
                <Trash2 size={14} aria-hidden />
              </button>
            </div>
            )}
          </li>
        ))}
      </ul>
      {(setPrimary.error || del.error) && (
        <p role="alert" className="text-sm text-alert mt-3">
          {(setPrimary.error ?? del.error)?.message}
        </p>
      )}
      {photos?.length === 0 && <p className="text-sm text-muted">No photos yet.</p>}
    </section>
  )
}
