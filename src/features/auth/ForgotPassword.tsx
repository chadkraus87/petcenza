import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import Captcha, { captchaEnabled } from '@/components/ui/Captcha'

export default function ForgotPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaAttempt, setCaptchaAttempt] = useState(0)

  async function submit() {
    setBusy(true); setError(null)
    const err = await resetPassword(email, captchaToken ?? undefined)
    setBusy(false)
    // Always show the same confirmation to avoid revealing which emails have accounts.
    if (err) {
      setError(err)
      setCaptchaAttempt(n => n + 1) // single-use token is spent
    } else setSent(true)
  }

  if (sent) return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="max-w-sm text-center">
        <h1 className="text-xl mb-2">Check your email</h1>
        <p className="text-sm text-muted">If an account exists for {email}, we sent a link to reset your password.</p>
        <p className="text-sm mt-4"><Link className="text-moss underline" to="/auth/sign-in">Back to sign in</Link></p>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-sm bg-card/85 backdrop-blur-md shadow-lg shadow-ink/5 rounded-card border border-line p-8">
        <h1 className="text-2xl mb-1">Reset your password</h1>
        <p className="text-sm text-muted mb-6">Enter your email and we'll send you a reset link.</p>
        {error && <p role="alert" className="text-sm text-alert mb-4">{error}</p>}
        <label className="block text-sm mb-1" htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
          className="w-full mb-4 rounded-md border border-line px-3 py-2" />
        <Captcha onToken={setCaptchaToken} resetSignal={captchaAttempt} />
        <button onClick={submit} disabled={busy || !email || (captchaEnabled && !captchaToken)}
          className="w-full rounded-md bg-ink text-paper py-2 font-medium disabled:opacity-50">
          {busy ? 'Sending…' : 'Send reset link'}
        </button>
        <p className="text-sm mt-5"><Link className="text-moss underline" to="/auth/sign-in">Back to sign in</Link></p>
      </div>
    </main>
  )
}
