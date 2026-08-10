import { useState } from 'react'
import { Download, AlertTriangle, Check } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useExportAccount, useDeleteAccount } from '@/hooks/useAccountData'

/**
 * Export and account closure.
 *
 * Deliberately in that order: someone who has come here to delete their account should walk past
 * a working export button on the way. Deletion is immediate and permanent, so the last chance to
 * keep a copy needs to be right in front of them, not in a help article.
 */
export default function AccountData() {
  const { user, signOut } = useAuth()
  const exportAccount = useExportAccount()
  const del = useDeleteAccount()

  const [armed, setArmed] = useState(false)
  const [typed, setTyped] = useState('')
  const [done, setDone] = useState<string | null>(null)

  const emailMatches = typed.trim().toLowerCase() === (user?.email ?? '').toLowerCase()

  async function doDelete() {
    try {
      await del.mutateAsync(typed.trim())
      // The account no longer exists; drop every local cache before the session is torn down.
      await signOut()
    } catch {
      /* surfaced via del.error below */
    }
  }

  return (
    <section className="space-y-8">
      {/* -------------------------------------------------------------- export */}
      <div className="bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-5">
        <h2 className="text-xl mb-1">Your data</h2>
        <p className="text-sm text-muted mb-4">
          Download everything PetCenza holds for you — every pet, every record, and links to your
          uploaded photos and documents — as a single file. Your records are yours, always, whether
          or not you are paying us.
        </p>
        <button
          onClick={() => exportAccount.mutate(undefined, {
            onSuccess: r => setDone(`${r.filename} — ${r.records} records, ${r.files} files`)
          })}
          disabled={exportAccount.isPending}
          className="inline-flex items-center gap-2 rounded-md bg-ink text-paper px-4 py-2 text-sm disabled:opacity-50">
          <Download size={15} aria-hidden />
          {exportAccount.isPending ? 'Preparing…' : 'Download my data'}
        </button>
        {done && (
          <p role="status" className="text-sm text-moss mt-3 flex items-center gap-1">
            <Check size={14} aria-hidden /> Downloaded {done}
          </p>
        )}
        {exportAccount.error && (
          <p role="alert" className="text-sm text-alert mt-3">
            Could not build the export. Check your connection and try again.
          </p>
        )}
        <p className="text-xs text-muted mt-3">
          File download links inside the export expire after 24 hours. Re-export any time for fresh
          ones.
        </p>
      </div>

      {/* ------------------------------------------------------------ deletion */}
      <div className="rounded-card border-2 border-alert/30 bg-alert/5 p-5">
        <h2 className="text-xl mb-1 flex items-center gap-2">
          <AlertTriangle size={18} className="text-alert" aria-hidden /> Delete your account
        </h2>
        <p className="text-sm text-muted mb-3">
          This is permanent and takes effect immediately. There is no grace period and no undo.
        </p>

        <ul className="text-sm text-muted space-y-1 mb-4 list-disc pl-5">
          <li>Pets only you own are deleted, along with every record, photo and document.</li>
          <li>
            <strong>Pets you co-own are handed to the other owner</strong>, with their history
            intact — closing your account never destroys records someone else still relies on.
          </li>
          <li>Pets shared with you simply lose your access. They are not affected.</li>
          <li>
            Deleted data is removed from encrypted backups within 30 days, after which it cannot be
            recovered by anyone, including us.
          </li>
        </ul>

        {!armed ? (
          <button onClick={() => setArmed(true)}
            className="rounded-md border border-alert text-alert px-4 py-2 text-sm hover:bg-alert hover:text-paper transition">
            Delete my account
          </button>
        ) : (
          <div className="space-y-3">
            <div>
              <label htmlFor="confirm-email" className="block text-sm mb-1">
                Type <strong>{user?.email}</strong> to confirm
              </label>
              <input id="confirm-email" type="email" value={typed} autoComplete="off"
                onChange={e => setTyped(e.target.value)}
                aria-describedby="confirm-help"
                className="w-full max-w-md rounded-md border border-line px-3 py-2 bg-card" />
              <p id="confirm-help" className="text-xs text-muted mt-1">
                We ask for this so an accidental click can't close your account.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={doDelete} disabled={!emailMatches || del.isPending}
                className="rounded-md bg-alert text-paper px-4 py-2 text-sm disabled:opacity-40">
                {del.isPending ? 'Deleting…' : 'Permanently delete'}
              </button>
              <button onClick={() => { setArmed(false); setTyped('') }}
                className="rounded-md border border-line px-4 py-2 text-sm">
                Cancel
              </button>
            </div>
            {del.error && (
              <p role="alert" className="text-sm text-alert">{del.error.message}</p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
