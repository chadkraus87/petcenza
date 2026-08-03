import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { assuranceState } from './mfa'
import Captcha, { captchaEnabled } from '@/components/ui/Captcha'

export default function SignIn() {
  const { signIn, signInWithGoogle, signInWithApple } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  // Turnstile tokens are single-use — bumping this re-arms the widget after a failed attempt.
  const [captchaAttempt, setCaptchaAttempt] = useState(0)

  async function submit() {
    setBusy(true); setError(null)
    const err = await signIn(email, password, remember, captchaToken ?? undefined)
    if (err) {
      setBusy(false); setError(err)
      setCaptchaAttempt(n => n + 1) // spent token; get a fresh one for the retry
      return
    }
    // If the account has a verified second factor, complete the challenge before entering the app.
    const aal = await assuranceState()
    setBusy(false)
    nav(aal === 'needs_mfa' ? '/auth/mfa' : '/')
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-sm bg-card rounded-card border border-line p-8">
        <h1 className="text-2xl mb-1">PawChart</h1>
        <p className="text-sm text-ink/60 mb-6">Sign in to your pets' records.</p>
        {error && <p role="alert" className="text-sm text-alert mb-4">{error}</p>}
        <label className="block text-sm mb-1" htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
          className="w-full mb-3 rounded-md border border-line px-3 py-2" />
        <label className="block text-sm mb-1" htmlFor="password">Password</label>
        <input id="password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}
          className="w-full mb-3 rounded-md border border-line px-3 py-2" />
        <label className="flex items-center gap-2 text-sm mb-4">
          <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
          Remember me on this device
        </label>
        <Captcha onToken={setCaptchaToken} resetSignal={captchaAttempt} />
        <button onClick={submit} disabled={busy || (captchaEnabled && !captchaToken)}
          className="w-full rounded-md bg-ink text-paper py-2 font-medium disabled:opacity-50">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <div className="my-4 flex items-center gap-3 text-xs text-ink/40"><hr className="flex-1 border-line" />or<hr className="flex-1 border-line" /></div>
        <button onClick={signInWithGoogle} className="w-full rounded-md border border-line py-2 mb-2 text-sm">Continue with Google</button>
        <button onClick={signInWithApple} className="w-full rounded-md border border-line py-2 text-sm">Continue with Apple</button>
        <p className="text-sm mt-5 flex justify-between">
          <Link className="text-moss underline" to="/auth/forgot">Forgot password</Link>
          <Link className="text-moss underline" to="/auth/sign-up">Create account</Link>
        </p>
      </div>
    </main>
  )
}
