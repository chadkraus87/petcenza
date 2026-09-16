import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Trash2, Undo2 } from 'lucide-react'
import { useMarkDeceased, useDeletePet } from '@/hooks/usePets'
import { useIsPetOwner } from '@/hooks/useSharing'
import { fmtDate } from '@/lib/format'
import type { Pet } from '@/types/db'

/**
 * Passing-away and deletion controls.
 *
 * These are deliberately separate ideas. Marking a pet as passed keeps every record and simply
 * stops the app behaving as though they're still under care — a refill notification for a pet
 * that died last week is a genuinely upsetting bug, so a trigger cancels pending reminders.
 * Deletion is the irreversible one and is gated behind typing the pet's name.
 */
export default function PetDangerZone({ pet }: { pet: Pet }) {
  const nav = useNavigate()
  const { data: isOwner } = useIsPetOwner(pet.id)
  const markDeceased = useMarkDeceased()
  const del = useDeletePet()

  const [showPassed, setShowPassed] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [confirmName, setConfirmName] = useState('')
  const [showDelete, setShowDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOwner) {
    return (
      <p className="text-sm text-muted">
        Only {pet.name}'s owner can archive or delete this profile.
      </p>
    )
  }

  const passed = pet.deceased_on !== null

  async function restore() {
    setError(null)
    try { await markDeceased.mutateAsync({ id: pet.id, on: null }) }
    catch { setError('Could not update. Please try again.') }
  }

  async function confirmPassed() {
    setError(null)
    try { await markDeceased.mutateAsync({ id: pet.id, on: date }); setShowPassed(false) }
    catch { setError('Could not update. Please try again.') }
  }

  async function confirmDelete() {
    setError(null)
    try { await del.mutateAsync(pet.id); nav('/pets', { replace: true }) }
    catch { setError('Could not delete. Please try again.') }
  }

  return (
    <section className="space-y-4">
      {error && <p role="alert" className="text-sm text-alert">{error}</p>}

      {/* ------------------------------------------------------- memorial */}
      {passed ? (
        <div className="rounded-card border border-line bg-card p-4">
          <p className="flex items-center gap-2 font-medium">
            <Heart size={16} className="text-coral" aria-hidden />
            {pet.name} passed away on {fmtDate(pet.deceased_on!)}
          </p>
          <p className="text-sm text-muted mt-1">
            Their records are kept in full, and reminders have stopped. You'll find {pet.name} under
            “Remembered” on the pets page.
          </p>
          <button onClick={restore} disabled={markDeceased.isPending}
            className="btn btn-secondary mt-3 gap-1.5">
            <Undo2 size={14} aria-hidden /> Undo — {pet.name} is still with us
          </button>
        </div>
      ) : (
        <div className="rounded-card border border-line bg-card p-4">
          <h3 className="font-medium flex items-center gap-2">
            <Heart size={16} className="text-coral" aria-hidden /> If {pet.name} has passed away
          </h3>
          <p className="text-sm text-muted mt-1">
            Nothing is deleted. {pet.name}'s full history stays available, and PetCenza stops
            sending reminders about their care.
          </p>
          {!showPassed ? (
            <button onClick={() => setShowPassed(true)}
              className="btn btn-secondary mt-3">
              Mark as passed away
            </button>
          ) : (
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="deceased-on" className="block text-sm mb-1">Date they passed</label>
                <input id="deceased-on" type="date" value={date} max={new Date().toISOString().slice(0, 10)}
                  onChange={e => setDate(e.target.value)}
                  className="field w-auto" />
              </div>
              <button onClick={confirmPassed} disabled={markDeceased.isPending}
                className="btn btn-primary">
                {markDeceased.isPending ? 'Saving…' : 'Confirm'}
              </button>
              <button onClick={() => setShowPassed(false)}
                className="btn btn-secondary">Cancel</button>
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------- delete */}
      <div className="rounded-card border-2 border-alert bg-alert/5 p-4">
        <h3 className="font-medium text-alert">Delete {pet.name} permanently</h3>
        <p className="text-sm text-muted mt-1">
          This erases every medication, allergy, vaccination, weight, visit, note, document and
          photo for {pet.name}, for everyone it's shared with. It cannot be undone. If {pet.name} has
          passed away, use the option above instead — it keeps the history.
        </p>
        {!showDelete ? (
          <button onClick={() => setShowDelete(true)}
            className="btn btn-danger-outline mt-3 gap-1.5">
            <Trash2 size={14} aria-hidden /> Delete permanently
          </button>
        ) : (
          <div className="mt-3">
            <label htmlFor="confirm-name" className="block text-sm mb-1">
              Type <strong>{pet.name}</strong> to confirm
            </label>
            <div className="flex flex-wrap gap-2">
              <input id="confirm-name" value={confirmName} onChange={e => setConfirmName(e.target.value)}
                autoComplete="off" className="field w-auto" />
              <button onClick={confirmDelete}
                disabled={confirmName !== pet.name || del.isPending}
                className="btn btn-danger">
                {del.isPending ? 'Deleting…' : 'Delete forever'}
              </button>
              <button onClick={() => { setShowDelete(false); setConfirmName('') }}
                className="btn btn-secondary">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
