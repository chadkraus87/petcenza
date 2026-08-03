import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'

/**
 * Landing page for the password-reset email link. Supabase's detectSessionInUrl consumes the
 * recovery token in the URL and emits a PASSWORD_RECOVERY event, which puts the user into a
 * temporary authenticated state just long enough to set a new password.
 */
export default function ResetPassword() {
  const { updatePassword } = useAuth()
  const nav = useNavigate()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Enable the form once a recovery session exists (either already established or via the event).
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function submit() {
    setError(null)
    if (password.length < 12) { setError('Use at least 12 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setBusy(true)
    const err = await updatePassword(password)
    setBusy(false)
    if (err) { setError(err); return }
    setDone(true)
    setTimeout(() => nav('/'), 1200)
  }

  if (done) return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="max-w-sm text-center">
        <h1 className="text-xl mb-2">Password updated</h1>
        <p className="text-sm text-ink/70">Taking you to your dashboard…</p>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-sm bg-card rounded-card border border-line p-8">
        <h1 className="text-2xl mb-1">Choose a new password</h1>
        <p className="text-sm text-ink/60 mb-6">
          {ready ? 'Enter a new password for your account.' : 'Validating your reset link…'}
        </p>
        {error && <p role="alert" className="text-sm text-alert mb-4">{error}</p>}
        <label className="block text-sm mb-1" htmlFor="password">New password (12+ characters)</label>
        <input id="password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)}
          disabled={!ready} className="w-full mb-3 rounded-md border border-line px-3 py-2 disabled:opacity-50" />
        <label className="block text-sm mb-1" htmlFor="confirm">Confirm new password</label>
        <input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)}
          disabled={!ready} className="w-full mb-4 rounded-md border border-line px-3 py-2 disabled:opacity-50" />
        <button onClick={submit} disabled={!ready || busy}
          className="w-full rounded-md bg-ink text-paper py-2 font-medium disabled:opacity-50">
          {busy ? 'Updating…' : 'Update password'}
        </button>
        <p className="text-sm mt-5"><Link className="text-moss underline" to="/auth/sign-in">Back to sign in</Link></p>
      </div>
    </main>
  )
}
