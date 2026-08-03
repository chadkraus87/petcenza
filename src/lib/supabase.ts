import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
if (!url || !anonKey) throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')

// "Remember me" is implemented with a real storage adapter (below). The user's preference is
// persisted in localStorage under REMEMBER_KEY; the adapter routes every auth read/write to
// sessionStorage (this tab only) when the user opted out of being remembered, and to
// localStorage (persists across restarts) when they opted in. Set the preference via
// setRememberPreference() BEFORE calling signInWithPassword.
const REMEMBER_KEY = 'petcenza-remember'

export function setRememberPreference(remember: boolean) {
  try { window.localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0') } catch { /* storage disabled */ }
}

function ephemeral(): boolean {
  try { return window.localStorage.getItem(REMEMBER_KEY) === '0' } catch { return false }
}

const authStorage = {
  getItem: (key: string) => (ephemeral() ? window.sessionStorage : window.localStorage).getItem(key),
  setItem: (key: string, value: string) => {
    if (ephemeral()) {
      window.sessionStorage.setItem(key, value)
      try { window.localStorage.removeItem(key) } catch { /* noop */ }
    } else {
      window.localStorage.setItem(key, value)
    }
  },
  removeItem: (key: string) => {
    try { window.sessionStorage.removeItem(key) } catch { /* noop */ }
    try { window.localStorage.removeItem(key) } catch { /* noop */ }
  }
}

// PKCE flow + auto refresh-token rotation. Session persistence is governed by authStorage.
export const supabase = createClient(url, anonKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: authStorage
  },
  realtime: { params: { eventsPerSecond: 5 } }
})
