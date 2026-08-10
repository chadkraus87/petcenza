import { useState } from 'react'
import { Tag as TagIcon, X, Plus } from 'lucide-react'
import { useTags, usePetTags, useCreateTag, useAssignTag, useUnassignTag, TAG_COLORS } from '@/hooks/useTags'

/** Compact tag editor shown on a pet's Overview — assign existing tags or create one inline. */
export default function TagEditor({ petId, canEdit }: { petId: string; canEdit: boolean }) {
  const { data: allTags } = useTags()
  const { data: petTags } = usePetTags(petId)
  const create = useCreateTag()
  const assign = useAssignTag(petId)
  const unassign = useUnassignTag(petId)

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(TAG_COLORS[0])
  const [error, setError] = useState<string | null>(null)

  const assigned = new Set(petTags?.map(t => t.id))
  const available = allTags?.filter(t => !assigned.has(t.id)) ?? []

  async function addNew() {
    setError(null)
    const trimmed = name.trim()
    if (!trimmed) return
    try {
      const tag = await create.mutateAsync({ name: trimmed, color })
      await assign.mutateAsync(tag.id)
      setName(''); setOpen(false)
    } catch (e) {
      // The unique(user_id, name) constraint is the common failure here.
      setError(e instanceof Error && /duplicate|unique/i.test(e.message)
        ? `You already have a tag called “${trimmed}”.`
        : 'Could not create that tag.')
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <TagIcon size={14} className="text-muted" aria-hidden />
        {petTags?.map(t => (
          <span key={t.id}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs text-paper"
            style={{ backgroundColor: t.color }}>
            {t.name}
            {canEdit && (
              <button onClick={() => unassign.mutate(t.id)} aria-label={`Remove tag ${t.name}`}
                className="hover:opacity-70">
                <X size={11} />
              </button>
            )}
          </span>
        ))}
        {petTags?.length === 0 && <span className="text-xs text-muted">No tags</span>}

        {canEdit && (
          <button onClick={() => setOpen(o => !o)}
            className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-0.5 text-xs text-muted hover:border-moss hover:text-moss">
            <Plus size={11} aria-hidden /> Tag
          </button>
        )}
      </div>

      {canEdit && open && (
        <div className="mt-3 rounded-card border border-line bg-card p-3">
          {error && <p role="alert" className="text-xs text-alert mb-2">{error}</p>}

          {available.length > 0 && (
            <>
              <p className="text-xs text-muted mb-1.5">Add an existing tag</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {available.map(t => (
                  <button key={t.id} onClick={() => { assign.mutate(t.id); setOpen(false) }}
                    className="rounded-full px-2.5 py-0.5 text-xs text-paper hover:opacity-80"
                    style={{ backgroundColor: t.color }}>
                    {t.name}
                  </button>
                ))}
              </div>
            </>
          )}

          <p className="text-xs text-muted mb-1.5">Or create a new one</p>
          <div className="flex flex-wrap items-center gap-2">
            <input value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addNew()}
              placeholder="Senior, Anxious, Indoor…" maxLength={40}
              aria-label="New tag name"
              className="rounded-md border border-line px-2.5 py-1.5 text-sm flex-1 min-w-40" />
            <div className="flex gap-1" role="group" aria-label="Tag colour">
              {TAG_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} aria-label={`Colour ${c}`}
                  aria-pressed={color === c}
                  className={`w-5 h-5 rounded-full ${color === c ? 'ring-2 ring-offset-1 ring-ink' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <button onClick={addNew} disabled={!name.trim() || create.isPending}
              className="rounded-md bg-moss text-paper px-3 py-1.5 text-sm disabled:opacity-50">
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
