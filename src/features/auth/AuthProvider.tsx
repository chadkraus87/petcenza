import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, setRememberPreference } from '@/lib/supabase'
import { queryClient, persister } from '@/lib/queryClient'
import { logActivity } from '@/lib/activity'

type AuthCtx = {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string, remember: boolean, captchaToken?: string) => Promise<string | null>
  signUp: (email: string, password: string, displayName: string, captchaToken?: string) => Promise<string | null>
  signInWithGoogle: () => Promise<void>
  signInWithApple: () => Promise<void>
  resetPassword: (email: string, captchaToken?: string) => Promise<string | null>
  updatePassword: (password: string) => Promise<string | null>
  signOut: () => Promise<void>
  signOutEverywhere: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

// Wipe all locally cached data (in-memory + the localStorage-persisted query cache) so a
// signed-out or next user on a shared device can't read the previous session's pet records.
async function clearLocalCaches() {
  queryClient.clear()
  try { await persister.removeClient() } catch { /* noop */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const value: AuthCtx = {
    user: session?.user ?? null,
    session,
    loading,
    async signIn(email, password, remember, captchaToken) {
      // Record the preference before sign-in so the storage adapter routes the new session
      // to localStorage (remembered) or sessionStorage (this tab only).
      setRememberPreference(remember)
      const { error } = await supabase.auth.signInWithPassword({
        email, password,
        options: { captchaToken }
      })
      if (!error) void logActivity('auth.sign_in')
      return error?.message ?? null
    },
    async signUp(email, password, displayName, captchaToken) {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: `${location.origin}/auth/callback`,
          captchaToken
        }
      })
      return error?.message ?? null
    },
    async signInWithGoogle() {
      await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/auth/callback` } })
    },
    async signInWithApple() {
      await supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: `${location.origin}/auth/callback` } })
    },
    async resetPassword(email, captchaToken) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/auth/reset`,
        captchaToken
      })
      return error?.message ?? null
    },
    async updatePassword(password) {
      const { error } = await supabase.auth.updateUser({ password })
      if (!error) void logActivity('auth.password_updated')
      return error?.message ?? null
    },
    async signOut() {
      // Log before the token is revoked, then clear local caches so nothing lingers on the device.
      await logActivity('auth.sign_out')
      await supabase.auth.signOut()
      await clearLocalCaches()
    },
    async signOutEverywhere() {
      await logActivity('auth.sign_out_all_devices')
      await supabase.auth.signOut({ scope: 'global' }) // revokes all refresh tokens
      await clearLocalCaches()
    }
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
