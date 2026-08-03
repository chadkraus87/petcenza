import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'

/**
 * Thin, typed wrappers around Supabase's TOTP MFA API. All calls require an authenticated
 * session. Enrollment returns a QR code (SVG data URI, safe under our img-src CSP) plus the
 * shared secret for manual entry; the factor is only usable after a successful verify.
 */

export type TotpFactor = { id: string; friendlyName: string | null; status: 'verified' | 'unverified' }

export type EnrollResult = { factorId: string; qrCode: string; secret: string; uri: string }

export async function listTotpFactors(): Promise<TotpFactor[]> {
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) throw error
  return (data.totp ?? []).map(f => ({ id: f.id, friendlyName: f.friendly_name ?? null, status: f.status }))
}

export async function enrollTotp(friendlyName: string): Promise<EnrollResult> {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName })
  if (error) throw error
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret, uri: data.totp.uri }
}

/** Confirm a freshly-enrolled factor with the first 6-digit code from the authenticator app. */
export async function verifyEnrollment(factorId: string, code: string): Promise<string | null> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
  if (error) return error.message
  void logActivity('auth.mfa_enrolled', 'mfa_factor', factorId)
  return null
}

export async function unenrollTotp(factorId: string): Promise<string | null> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId })
  if (error) return error.message
  void logActivity('auth.mfa_unenrolled', 'mfa_factor', factorId)
  return null
}

/** Satisfy an outstanding second-factor challenge (used at sign-in). */
export async function verifyChallenge(factorId: string, code: string): Promise<string | null> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
  if (error) return error.message
  void logActivity('auth.mfa_verified')
  return null
}

export type AalState = 'ok' | 'needs_mfa' | 'unknown'

/**
 * Decide whether the current session still owes a second factor.
 * currentLevel 'aal1' + nextLevel 'aal2' means the user has a verified factor but hasn't
 * satisfied it yet this session — the app should route them to the challenge.
 */
export async function assuranceState(): Promise<AalState> {
  try {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (error || !data) return 'unknown'
    if (data.currentLevel === 'aal1' && data.nextLevel === 'aal2') return 'needs_mfa'
    return 'ok'
  } catch {
    return 'unknown'
  }
}
