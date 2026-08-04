// scan-upload — server-side magic-byte verification for uploaded files.
//
// The storage buckets already restrict declared MIME + size, and RLS scopes writes to the
// owner's folder. This adds defense-in-depth: it reads the file's actual leading bytes and, if
// they don't match a genuine PDF/JPEG/PNG/WebP, deletes the object AND its DB row and records a
// security event. Call it right after an upload with { bucket, path }. A caller can only scan a
// file inside their own {user_id}/... folder (enforced from the JWT).
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const ALLOWED_BUCKETS = new Set(['pet-photos', 'pet-documents'])

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

function detectType(b: Uint8Array): string | null {
  if (b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'application/pdf' // %PDF
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'image/png'
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && // RIFF
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp' // WEBP
  return null
}

const ALLOWED_BY_BUCKET: Record<string, Set<string>> = {
  'pet-photos': new Set(['image/jpeg', 'image/png', 'image/webp']),
  'pet-documents': new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authHeader = req.headers.get('Authorization') ?? ''

  // Identify the caller from their JWT.
  const asUser = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error: userErr } = await asUser.auth.getUser()
  if (userErr || !user) return json({ error: 'Unauthorized' }, 401)

  const admin = createClient(url, serviceKey)

  // Keyed to the account, not the IP: this route requires a JWT, so the account is the real
  // identity, and a household behind one address shouldn't share an allowance. Sized for a bulk
  // upload of an album (each file triggers one scan) while capping runaway automation.
  const limit = await checkRateLimit(admin, 'scan-upload', user.id, 120, 300)
  if (!limit.ok) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { ...cors, 'Content-Type': 'application/json', 'Retry-After': String(limit.retryAfter) }
    })
  }

  let body: { bucket?: string; path?: string }
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
  const { bucket, path } = body
  if (!bucket || !path || !ALLOWED_BUCKETS.has(bucket)) return json({ error: 'Bad request' }, 400)

  // Paths are pet-scoped ({pet_id}/{uuid}.{ext}). Authorise by pet membership rather than by
  // owner id, so collaborators can scan their own uploads — and nobody can scan another pet's.
  const petId = path.split('/')[0]
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(petId)) {
    return json({ error: 'Bad request' }, 400)
  }
  const { data: allowed, error: accessErr } = await asUser
    .rpc('can_access_pet', { p_pet_id: petId, p_min_role: 'editor' })
  if (accessErr || allowed !== true) return json({ error: 'Forbidden' }, 403)

  const { data: blob, error: dlErr } = await admin.storage.from(bucket).download(path)
  if (dlErr || !blob) return json({ error: 'File not found' }, 404)

  const head = new Uint8Array(await blob.slice(0, 16).arrayBuffer())
  const detected = detectType(head)
  const ok = detected !== null && ALLOWED_BY_BUCKET[bucket].has(detected)

  if (!ok) {
    // Quarantine: remove the object and its DB row, then log a security event.
    await admin.storage.from(bucket).remove([path])
    const table = bucket === 'pet-photos' ? 'pet_photos' : 'documents'
    // Scoped by storage_path alone — editor access to this pet was already verified above,
    // and the row may legitimately have been authored by a different member.
    await admin.from(table).delete().eq('storage_path', path)
    await admin.from('activity_logs').insert({
      user_id: user.id, action: 'security.upload_rejected', entity: table,
      metadata: { bucket, path, detected: detected ?? 'unknown' }
    })
    return json({ ok: false, reason: 'content_type_mismatch', detected })
  }

  return json({ ok: true, detected })
})
