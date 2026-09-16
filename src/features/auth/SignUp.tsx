import { useState } from 'react'
import { ConsentNotice } from '@/features/legal/LegalPage'
import { Link } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import Captcha, { captchaEnabled } from '@/components/ui/Captcha'

export default function SignUp() {
  const { signUp } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaAttempt, setCaptchaAttempt] = useState(0)

  async function submit() {
    setError(null)
    if (password.length < 12) { setError('Use at least 12 characters.'); return }
    const err = await signUp(email, password, name, captchaToken ?? undefined)
    if (err) {
      setError(err)
      setCaptchaAttempt(n => n + 1) // single-use token is spent
    } else setSent(true)
  }

  if (sent) return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="max-w-sm text-center">
        <h1 className="text-2xl mb-2">Check your email</h1>
        <p className="text-sm text-muted">We sent a verification link to {email}. Open it to activate your account.</p>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-sm bg-card/85 backdrop-blur-md shadow-lg shadow-ink/5 rounded-card border border-line p-8">
        <h1 className="text-2xl mb-6">Create your account</h1>
        {error && <p role="alert" className="text-sm text-alert mb-4">{error}</p>}
        <label className="block text-sm mb-1" htmlFor="name">Your name</label>
        <input id="name" value={name} onChange={e => setName(e.target.value)} className="field w-full mb-3" />
        <label className="block text-sm mb-1" htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="field w-full mb-3" />
        <label className="block text-sm mb-1" htmlFor="password">Password (12+ characters)</label>
        <input id="password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className="field w-full mb-4" />
        <Captcha onToken={setCaptchaToken} resetSignal={captchaAttempt} />
        <ConsentNotice />
        <button onClick={submit} disabled={captchaEnabled && !captchaToken}
          className="btn btn-primary w-full">Create account</button>
        <p className="text-sm mt-4"><Link className="text-moss underline" to="/auth/sign-in">Back to sign in</Link></p>
      </div>
    </main>
  )
}
