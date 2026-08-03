import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PawPrint } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { acceptInvitation } from '@/hooks/useSharing'

/**
 * Redeems an invite link (/invite/:token).
 *
 * Sits OUTSIDE the Protected route so a signed-out invitee reaches a real page
 * instead of being bounced to sign-in with no explanation. The token is stashed
 * so it survives the round trip through sign-in/sign-up, and redemption retries
 * automatically once a session exists.
 */

const PENDING_KEY = 'petcenza-pending-invite'

const MESSAGES: Record<string, string> = {
  invalid: "This invite link isn't valid. Ask for a fresh one.",
  revoked: 'This invitation was revoked by the pet owner.',
  already_used: 'This invitation has already been used. Ask for a fresh link.',
  expired: 'This invitation has expired. Ask the owner to send a new one.',
  wrong_account: 'This invitation was issued to a different email address. Sign in with that account.',
  already_owner: "You already own this pet — there's nothing to accept."
}

export default function AcceptInvite() {
  const { token = '' } = useParams()
  const { user, loading } = useAuth()
  const nav = useNavigate()
  const [status, setStatus] = useState<'working' | 'error'>('working')
  const [message, setMessage] = useState<string | null>(null)
  const attempted = useRef(false)

  useEffect(() => {
    if (loading) return

    if (!user) {
      // Remember the token, then send them to sign in and come back.
      try { sessionStorage.setItem(PENDING_KEY, token) } catch { /* storage disabled */ }
      nav('/auth/sign-in', { replace: true, state: { from: `/invite/${token}` } })
      return
    }

    if (attempted.current) return
    attempted.current = true

    acceptInvitation(token)
      .then(result => {
        try { sessionStorage.removeItem(PENDING_KEY) } catch { /* noop */ }
        if (result === 'ok' || result === 'already_owner') {
          nav('/pets', { replace: true })
        } else {
          setStatus('error')
          setMessage(MESSAGES[result] ?? 'This invitation could not be accepted.')
        }
      })
      .catch(() => {
        setStatus('error')
        setMessage('Something went wrong accepting this invitation. Try the link again.')
      })
  }, [user, loading, token, nav])

  return (
    <main className="min-h-screen grid place-items-center p-6 text-center">
      <div className="max-w-sm">
        <PawPrint className="mx-auto mb-3 text-moss" aria-hidden />
        {status === 'working' ? (
          <p className="text-ink/60">Accepting your invitation…</p>
        ) : (
          <>
            <h1 className="text-xl mb-2">Invitation not accepted</h1>
            <p className="text-sm text-ink/70 mb-4">{message}</p>
            <Link className="text-moss underline text-sm" to="/pets">Go to your pets</Link>
          </>
        )}
      </div>
    </main>
  )
}

/** Token saved when an invite link was opened while signed out, if any. */
export function takePendingInvite(): string | null {
  try {
    const t = sessionStorage.getItem(PENDING_KEY)
    if (t) sessionStorage.removeItem(PENDING_KEY)
    return t
  } catch {
    return null
  }
}
