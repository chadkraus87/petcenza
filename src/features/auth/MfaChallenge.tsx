import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listTotpFactors, verifyChallenge } from './mfa'
import { useAuth } from './AuthProvider'

/**
 * Second-factor gate. Reached after a password sign-in when the account has a verified TOTP
 * factor (session is AAL1 but AAL2 is required). Verifying elevates the session to AAL2.
 */
export default function MfaChallenge() {
  const nav = useNavigate()
  const { signOut } = useAuth()
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    listTotpFactors()
      .then(fs => {
        const verified = fs.find(f => f.status === 'verified')
        if (verified) setFactorId(verified.id)
        else nav('/', { replace: true }) // nothing to challenge
      })
      .catch(() => setError('Could not load your authenticator. Try signing in again.'))
  }, [nav])

  async function submit() {
    if (!factorId) return
    setBusy(true); setError(null)
    const err = await verifyChallenge(factorId, code.trim())
    setBusy(false)
    if (err) { setError(err); setCode('') } else nav('/', { replace: true })
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-sm bg-card rounded-card border border-line p-8">
        <h1 className="text-2xl mb-1">Two-factor verification</h1>
        <p className="text-sm text-ink/60 mb-6">Enter the 6-digit code from your authenticator app.</p>
        {error && <p role="alert" className="text-sm text-alert mb-4">{error}</p>}
        <label className="block text-sm mb-1" htmlFor="code">Authentication code</label>
        <input id="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6}
          value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
          onKeyDown={e => e.key === 'Enter' && code.length === 6 && submit()}
          className="w-full mb-4 rounded-md border border-line px-3 py-2 tracking-widest text-center text-lg" />
        <button onClick={submit} disabled={busy || code.length !== 6}
          className="w-full rounded-md bg-ink text-paper py-2 font-medium disabled:opacity-50">
          {busy ? 'Verifying…' : 'Verify'}
        </button>
        <button onClick={() => { void signOut(); nav('/auth/sign-in', { replace: true }) }}
          className="w-full mt-3 text-sm text-ink/50 underline">
          Cancel and sign out
        </button>
      </div>
    </main>
  )
}
