// delete-account — permanently closes the caller's account.
//
// Three things have to happen and only the first can be done from the browser:
//   1. Postgres side — delete_my_account() runs as the CALLER, so auth.uid() decides whose
//      account dies. It is structurally incapable of touching anyone else's. It also hands any
//      co-owned pet (and the records authored on it) to the co-owner rather than destroying
//      history someone else still depends on, and returns the storage paths it orphaned.
//   2. Storage objects — not reachable from Postgres, so they are purged here.
//   3. The auth.users row — needs the admin API, i.e. the service role.
//
// Deletion is immediate and permanent. There is no grace period: a user who asks to be forgotten
// should be forgotten, and a soft-deleted account is still an account. The UI makes them type
// their email and offers an export first.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const asUser = createClient(url, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }
  })
  const { data: { user }, error: userErr } = await asUser.auth.getUser()
  if (userErr || !user) return json({ error: 'Unauthorized' }, 401)

  // Re-confirm intent server-side. The client asks the user to type their email; requiring it
  // here too means a stray POST from a bookmarklet or a mis-wired button cannot close an account.
  let body: { confirmEmail?: string }
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
  const typed = (body.confirmEmail ?? '').trim().toLowerCase()
  if (!typed || typed !== (user.email ?? '').toLowerCase()) {
    return json({ error: 'confirmation_mismatch' }, 400)
  }

  // Postgres first. If this throws, nothing has been destroyed yet — the whole function body is
  // one transaction, so a failure leaves the account exactly as it was.
  const { data: result, error: rpcErr } = await asUser.rpc('delete_my_account')
  if (rpcErr) {
    console.error('delete_my_account failed', rpcErr.message)
    return json({ error: 'delete_failed' }, 500)
  }

  const admin = createClient(url, serviceKey)
  const r = result as { pets_deleted?: number; photo_paths?: string[]; document_paths?: string[] }
  const photos = r?.photo_paths ?? []
  const docs = r?.document_paths ?? []

  // Storage and auth cleanup are best-effort and deliberately do NOT fail the request: the
  // records are already gone, and reporting failure would invite the user to retry a deletion
  // that has, in the way that matters, already happened. Orphans are logged for manual sweeping.
  if (photos.length > 0) {
    const { error } = await admin.storage.from('pet-photos').remove(photos)
    if (error) console.error('orphaned pet-photos objects', photos.length, error.message)
  }
  if (docs.length > 0) {
    const { error } = await admin.storage.from('pet-documents').remove(docs)
    if (error) console.error('orphaned pet-documents objects', docs.length, error.message)
  }

  const { error: authErr } = await admin.auth.admin.deleteUser(user.id)
  if (authErr) console.error('auth user not removed', authErr.message)

  return json({
    ok: true,
    petsDeleted: r?.pets_deleted ?? 0,
    filesRemoved: photos.length + docs.length
  })
})
