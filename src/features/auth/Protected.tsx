import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { assuranceState, type AalState } from './mfa'

export default function Protected() {
  const { user, loading } = useAuth()
  const loc = useLocation()
  const [aal, setAal] = useState<AalState | null>(null)

  useEffect(() => {
    let active = true
    if (!user) { setAal(null); return }
    assuranceState().then(s => { if (active) setAal(s) })
    return () => { active = false }
  }, [user])

  if (loading) return <div className="min-h-screen grid place-items-center text-ink/50">Loading…</div>
  if (!user) return <Navigate to="/auth/sign-in" replace />
  // Wait for the AAL check before deciding, so we don't flash protected content to a user
  // who still owes a second factor.
  if (aal === null) return <div className="min-h-screen grid place-items-center text-ink/50">Loading…</div>
  if (aal === 'needs_mfa' && loc.pathname !== '/auth/mfa') return <Navigate to="/auth/mfa" replace />
  return <Outlet />
}
