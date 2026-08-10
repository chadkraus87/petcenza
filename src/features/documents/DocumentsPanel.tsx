import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, Download, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { validateUpload } from '@/schemas/records'
import { scanUpload } from '@/lib/uploads'
import { fmtDate } from '@/lib/format'
import type { PetDocument } from '@/types/db'

const BUCKET = 'pet-documents'

export default function DocumentsPanel({ petId }: { petId: string }) {
  const qc = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const { data: docs } = useQuery({
    queryKey: ['documents', petId],
    queryFn: async () => {
      const { data, error } = await supabase.from('documents').select('*').eq('pet_id', petId).order('created_at', { ascending: false })
      if (error) throw error
      return data as PetDocument[]
    }
  })

  const upload = useCallback(async (files: FileList | File[]) => {
    setError(null); setBusy(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      for (const file of Array.from(files)) {
        const invalid = validateUpload(file)
        if (invalid) { setError(`${file.name}: ${invalid}`); continue }
        const ext = file.name.split('.').pop()?.toLowerCase()
        // Pet-scoped path: access is decided by pet membership, not by who uploaded.
        const path = `${petId}/${crypto.randomUUID()}.${ext}`
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type })
        if (upErr) { setError(upErr.message); continue }
        await supabase.from('documents').insert({
          user_id: user.id, pet_id: petId, storage_path: path,
          file_name: file.name, mime_type: file.type, size_bytes: file.size, kind: 'other'
        })
        // Server-side magic-byte scan; rejects (and removes) files whose content belies their type.
        const scan = await scanUpload(BUCKET, path)
        if (!scan.ok) setError(`${file.name}: rejected — file content didn't match its type.`)
      }
      void qc.invalidateQueries({ queryKey: ['documents', petId] })
    } finally { setBusy(false) }
  }, [petId, qc])

  async function open(doc: PetDocument) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(doc.storage_path, 300)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function remove(doc: PetDocument) {
    await supabase.storage.from(BUCKET).remove([doc.storage_path])
    await supabase.from('documents').delete().eq('id', doc.id)
    void qc.invalidateQueries({ queryKey: ['documents', petId] })
  }

  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl">Documents</h2>
        <label className="rounded-md bg-ink text-paper px-4 py-2 text-sm cursor-pointer">
          {busy ? 'Uploading…' : 'Upload file'}
          <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" multiple className="sr-only"
            onChange={e => e.target.files && void upload(e.target.files)} />
        </label>
      </div>
      <p className="text-xs text-muted mb-4">PDF, JPEG, PNG, or WebP · up to 25 MB. Files are private and opened via short-lived secure links.</p>
      {error && <p role="alert" className="text-sm text-alert mb-4">{error}</p>}
      <ul className="space-y-2">
        {docs?.map(d => (
          <li key={d.id} className="bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-3 flex items-center gap-3">
            <FileText size={18} className="text-muted shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{d.file_name}</p>
              <p className="text-xs text-muted">{(d.size_bytes / 1024).toFixed(0)} KB · {fmtDate(d.created_at)}</p>
            </div>
            <button onClick={() => open(d)} className="text-moss" aria-label={`Open ${d.file_name}`}><Download size={16} /></button>
            <button onClick={() => remove(d)} className="text-alert" aria-label={`Delete ${d.file_name}`}><Trash2 size={16} /></button>
          </li>
        ))}
      </ul>
      {docs?.length === 0 && <p className="text-sm text-muted">No documents uploaded yet.</p>}
    </section>
  )
}
