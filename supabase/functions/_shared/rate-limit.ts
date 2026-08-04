// Shared rate-limit helper for edge functions.
//
// Backed by consume_rate_limit() in Postgres rather than in-process state: edge functions are
// horizontally scaled, so a per-instance counter is bypassed by simply spraying requests across
// instances.
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

/** Hash the identifier before it leaves this process — raw IPs are never stored. */
async function hash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Client identity for throttling.
 *
 * cf-connecting-ip is authoritative: Cloudflare fronts supabase.co and sets this itself. Verified
 * against the live endpoint — a request that tries to supply its own cf-connecting-ip is rejected
 * by Cloudflare with a 403 before it ever reaches this function, and a spoofed x-forwarded-for is
 * stripped from the chain.
 *
 * The x-forwarded-for fallback deliberately takes the FIRST entry. The real chain here looks like
 * "<client>,<client>, 13.248.103.242" — that trailing address is an AWS load balancer that
 * ROTATES per request. Keying on the last entry scattered 65 requests from one machine across
 * nine separate counters and defeated the limit entirely.
 */
export function clientIp(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip')
  if (cf) return cf.trim()

  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  return 'unknown'
}

export interface RateLimitResult {
  ok: boolean
  retryAfter: number
}

/**
 * Consume one unit from `bucket` for `identifier`.
 *
 * Fails OPEN if the database call itself errors. A throttle that takes the whole endpoint down
 * whenever Postgres hiccups is a worse outcome than briefly not throttling; the limit is
 * defense-in-depth, not the only control on these routes.
 */
export async function checkRateLimit(
  admin: SupabaseClient,
  bucket: string,
  identifier: string,
  limit: number,
  windowSecs: number
): Promise<RateLimitResult> {
  try {
    const { data, error } = await admin.rpc('consume_rate_limit', {
      p_bucket: bucket,
      p_key_hash: await hash(identifier),
      p_limit: limit,
      p_window_secs: windowSecs
    })
    if (error) {
      console.error('rate limit check failed', error.message)
      return { ok: true, retryAfter: 0 }
    }
    return { ok: data === true, retryAfter: windowSecs }
  } catch (e) {
    console.error('rate limit check threw', e instanceof Error ? e.message : e)
    return { ok: true, retryAfter: 0 }
  }
}
