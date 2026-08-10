import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

/**
 * Redirect target for OAuth (Google/Apple) sign-in and email-verification links.
 * detectSessionInUrl exchanges the code/token in the URL for a session; we then forward the
 * user into the app. If no session materialises, we send them back to sign-in with a note.
 */
export default function AuthCallback() {
  const nav = useNavigate()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let done = false
    const finish = (session: unknown) => {
      if (done) return
      done = true
      if (session) nav('/', { replace: true })
      else setFailed(true)
    }
    supabase.auth.getSession().then(({ data }) => { if (data.session) finish(data.session) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { if (session) finish(session) })
    // Fallback: if nothing arrives shortly, surface a recoverable error instead of hanging.
    const t = setTimeout(() => finish(null), 8000)
    return () => { clearTimeout(t); sub.subscription.unsubscribe() }
  }, [nav])

  return (
    <main className="min-h-screen grid place-items-center p-6 text-center">
      {failed ? (
        <div className="max-w-sm">
          <h1 className="text-xl mb-2">Sign-in didn't complete</h1>
          <p className="text-sm text-muted mb-4">The link may have expired or already been used.</p>
          <Link className="text-moss underline text-sm" to="/auth/sign-in">Return to sign in</Link>
        </div>
      ) : (
        <p className="text-muted">Finishing sign-in…</p>
      )}
    </main>
  )
}
