import { useEffect, useRef } from 'react'

/**
 * Cloudflare Turnstile widget.
 *
 * Renders only when VITE_TURNSTILE_SITEKEY is set, so local dev, unit tests and E2E runs work
 * without a captcha (and without silently breaking auth). The sitekey is public by design — the
 * matching *secret* lives only in Supabase's dashboard and is never in this bundle.
 *
 * Turnstile tokens are SINGLE USE: once Supabase consumes one, a retry needs a fresh token.
 * Bump `resetSignal` after any failed auth attempt to re-arm the widget.
 */

const SITEKEY = import.meta.env.VITE_TURNSTILE_SITEKEY as string | undefined
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

/** True when a sitekey is configured; forms use this to decide whether a token is required. */
export const captchaEnabled = Boolean(SITEKEY)

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  reset: (id: string) => void
  remove: (id: string) => void
}
declare global {
  interface Window { turnstile?: TurnstileApi }
}

let scriptPromise: Promise<void> | null = null
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT_URL
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load Turnstile'))
    document.head.appendChild(s)
  })
  return scriptPromise
}

export default function Captcha({
  onToken,
  resetSignal = 0
}: {
  onToken: (token: string | null) => void
  resetSignal?: number
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  // Keep the latest callback without re-rendering the widget on every parent render.
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken

  useEffect(() => {
    if (!SITEKEY || !hostRef.current) return
    let cancelled = false
    const host = hostRef.current

    loadScript()
      .then(() => {
        if (cancelled || !window.turnstile) return
        widgetId.current = window.turnstile.render(host, {
          sitekey: SITEKEY,
          callback: (token: string) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
          theme: 'light'
        })
      })
      .catch(() => {
        // If the challenge can't load, surface it as "no token" rather than hanging silently.
        if (!cancelled) onTokenRef.current(null)
      })

    return () => {
      cancelled = true
      if (widgetId.current && window.turnstile) {
        try { window.turnstile.remove(widgetId.current) } catch { /* already gone */ }
        widgetId.current = null
      }
    }
  }, [])

  // Re-arm after a failed attempt (the previous token is spent).
  useEffect(() => {
    if (resetSignal === 0) return
    if (widgetId.current && window.turnstile) {
      window.turnstile.reset(widgetId.current)
      onTokenRef.current(null)
    }
  }, [resetSignal])

  if (!SITEKEY) return null
  return <div ref={hostRef} className="mb-3" aria-label="Security challenge" />
}
