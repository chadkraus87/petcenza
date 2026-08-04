// vet-share — serves a read-only clinical snapshot for a share token.
//
// This is the ONLY route by which an unauthenticated visitor can read pet data, and it is
// deliberately narrow: verify_jwt is off (vets have no account), but the function never touches
// a caller-supplied table or column. It passes the token to vet_share_snapshot(), which returns
// a fixed JSON shape or an error string. There is no way to enumerate pets, reach another pet,
// or write anything. Tokens are unguessable v4 UUIDs, expire, and are revocable.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { checkRateLimit, clientIp } from '../_shared/rate-limit.ts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Tokens are v4 UUIDs (~122 bits), so guessing one is infeasible regardless. This caps the cost
// of trying: a clinic reloading a snapshot a few times an hour never notices, while a scripted
// enumeration attempt is stopped dead. Generous enough that a shared clinic NAT isn't punished.
const RATE_LIMIT = 60
const RATE_WINDOW_SECS = 300

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      'Content-Type': 'application/json',
      // Medical data: never cache in a shared proxy or the browser.
      'Cache-Control': 'no-store, private'
    }
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Throttle before parsing or touching the database, so a flood costs as little as possible.
  const limit = await checkRateLimit(admin, 'vet-share', clientIp(req), RATE_LIMIT, RATE_WINDOW_SECS)
  if (!limit.ok) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429,
      headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store, private',
                 'Retry-After': String(limit.retryAfter) }
    })
  }

  // Token may arrive as ?token= (GET) or in a JSON body (POST).
  let token: string | null = new URL(req.url).searchParams.get('token')
  if (!token && req.method === 'POST') {
    try { token = (await req.json())?.token ?? null } catch { /* fall through */ }
  }
  if (!token || !UUID_RE.test(token)) return json({ error: 'invalid' }, 400)

  const { data, error } = await admin.rpc('vet_share_snapshot', { p_token: token })
  if (error) return json({ error: 'unavailable' }, 500)

  // The RPC reports its own validation failures; surface them as 404 so a probe
  // can't distinguish "revoked" from "never existed" by status code alone.
  if (data?.error) return json({ error: data.error }, 404)

  return json(data)
})
