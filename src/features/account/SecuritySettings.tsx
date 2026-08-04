import { useCallback, useEffect, useState } from 'react'
import { ShieldCheck, ShieldAlert, Trash2 } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { listTotpFactors, enrollTotp, verifyEnrollment, unenrollTotp, type TotpFactor, type EnrollResult } from '@/features/auth/mfa'
import NotificationSettings from './NotificationSettings'

export default function SecuritySettings() {
  const { user, signOut, signOutEverywhere } = useAuth()
  const [factors, setFactors] = useState<TotpFactor[] | null>(null)
  const [enroll, setEnroll] = useState<EnrollResult | null>(null)
  const [friendlyName, setFriendlyName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(() => { listTotpFactors().then(setFactors).catch(() => setFactors([])) }, [])
  useEffect(() => { refresh() }, [refresh])

  const verified = factors?.filter(f => f.status === 'verified') ?? []
  const mfaOn = verified.length > 0

  async function startEnroll() {
    setError(null); setBusy(true)
    try {
      setEnroll(await enrollTotp(friendlyName.trim() || 'Authenticator app'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start enrollment')
    } finally { setBusy(false) }
  }

  async function confirmEnroll() {
    if (!enroll) return
    setBusy(true); setError(null)
    const err = await verifyEnrollment(enroll.factorId, code.trim())
    setBusy(false)
    if (err) { setError(err); setCode(''); return }
    setEnroll(null); setCode(''); setFriendlyName(''); refresh()
  }

  async function cancelEnroll() {
    if (enroll) await unenrollTotp(enroll.factorId).catch(() => {}) // discard the unverified factor
    setEnroll(null); setCode(''); setError(null)
  }

  async function remove(factorId: string) {
    setError(null)
    const err = await unenrollTotp(factorId)
    if (err) setError(err); else refresh()
  }

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl mb-1">Settings</h1>
      <p className="text-ink/60 mb-6">{user?.email}</p>

      <div className="mb-6"><NotificationSettings /></div>

      <section className="bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-6 mb-6">
        <div className="flex items-center gap-2 mb-1">
          {mfaOn ? <ShieldCheck className="text-moss" aria-hidden /> : <ShieldAlert className="text-signal" aria-hidden />}
          <h2 className="text-xl">Two-factor authentication</h2>
        </div>
        <p className="text-sm text-ink/60 mb-4">
          {mfaOn
            ? 'Two-factor authentication is on. You\'ll enter a code from your authenticator app each time you sign in.'
            : 'Add a time-based one-time password (TOTP) app like Google Authenticator, 1Password, or Authy for a second layer of protection.'}
        </p>
        {error && <p role="alert" className="text-sm text-alert mb-4">{error}</p>}

        {verified.length > 0 && (
          <ul className="mb-4 space-y-2">
            {verified.map(f => (
              <li key={f.id} className="flex items-center justify-between rounded-md border border-line px-3 py-2">
                <span className="text-sm flex items-center gap-2"><ShieldCheck size={16} className="text-moss" aria-hidden /> {f.friendlyName || 'Authenticator app'}</span>
                <button onClick={() => remove(f.id)} className="text-alert" aria-label="Remove this authenticator"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        )}

        {!enroll ? (
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-48">
              <label htmlFor="fname" className="block text-sm mb-1">Device name (optional)</label>
              <input id="fname" value={friendlyName} onChange={e => setFriendlyName(e.target.value)}
                placeholder="My phone" className="w-full rounded-md border border-line px-3 py-2" />
            </div>
            <button onClick={startEnroll} disabled={busy} className="rounded-md bg-ink text-paper px-5 py-2 disabled:opacity-50">
              {busy ? 'Starting…' : mfaOn ? 'Add another' : 'Turn on 2FA'}
            </button>
          </div>
        ) : (
          <div className="rounded-card border border-line p-4">
            <p className="text-sm mb-3">1. Scan this QR code with your authenticator app (or enter the key manually).</p>
            <div className="flex flex-wrap items-center gap-4 mb-4">
              {/* Supabase returns the QR as an SVG data URI — rendered as an image. */}
              <img src={enroll.qrCode} alt="Two-factor QR code" width={160} height={160} className="rounded-md border border-line bg-white p-2" />
              <div className="text-xs">
                <p className="text-ink/50 uppercase tracking-wide mb-1">Manual key</p>
                <code className="break-all">{enroll.secret}</code>
              </div>
            </div>
            <label htmlFor="otp" className="block text-sm mb-1">2. Enter the 6-digit code it shows</label>
            <div className="flex gap-2">
              <input id="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6}
                value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                className="rounded-md border border-line px-3 py-2 tracking-widest text-center w-32" />
              <button onClick={confirmEnroll} disabled={busy || code.length !== 6} className="rounded-md bg-moss text-paper px-5 py-2 disabled:opacity-50">
                {busy ? 'Verifying…' : 'Verify & enable'}
              </button>
              <button onClick={cancelEnroll} className="rounded-md border border-line px-4 py-2 text-sm">Cancel</button>
            </div>
          </div>
        )}
      </section>

      <section className="bg-card rounded-card border border-line shadow-sm shadow-ink/5 p-6">
        <h2 className="text-xl mb-1">Sessions</h2>
        <p className="text-sm text-ink/60 mb-4">Signed in on another device you no longer trust? Sign out everywhere to revoke all sessions.</p>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => void signOut()} className="rounded-md border border-line px-5 py-2 text-sm">
            Sign out
          </button>
          <button onClick={() => void signOutEverywhere()} className="rounded-md border border-alert text-alert px-5 py-2 text-sm">
            Sign out of all devices
          </button>
        </div>
      </section>
    </main>
  )
}
