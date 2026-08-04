// send-invite — emails a pet invitation link to the address it's locked to.
//
// Sharing has always been link-based; this is an optional convenience on top, and the copy-link
// flow remains the fallback. Two things matter for safety:
//
//   1. This is an outbound mail path in a consumer app, i.e. a spam relay if left open. The
//      recipient is NEVER caller-supplied — it is read from the stored invitation row, which only
//      the pet's owner could have written. There is no way to make this send to an arbitrary
//      address, and it is rate limited per account on top of that.
//   2. The invitation row is read through the CALLER's JWT, so RLS decides authorisation. A user
//      who can't see the invitation can't mail it; no ownership check is reimplemented here.
//
// Requires a RESEND_API_KEY secret. Without it the function reports not_configured and the UI
// quietly falls back to "copy link" rather than showing an error.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Escape anything interpolated into the HTML body. Pet names are free text set by users. */
function esc(s: string): string {
  return s.replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function buildEmail(petName: string, inviterName: string, role: string, url: string, expires: string) {
  const pet = esc(petName)
  const who = esc(inviterName)
  const access = role === 'editor'
    ? 'add and edit records — medications, weights, vet visits, photos'
    : 'view everything about them, without making changes'

  const text =
`${who} shared ${petName}'s health records with you on PetCenza.

You'll be able to ${role === 'editor'
  ? 'add and edit records - medications, weights, vet visits, photos'
  : 'view everything about them, without making changes'}.

Open this link to accept:
${url}

This invitation expires on ${expires}. If you weren't expecting it, you can ignore this email.`

  const html =
`<!doctype html>
<html><body style="margin:0;padding:24px;background:#EFF6F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#154A5C">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#FFFFFF;border:1px solid #CFE3EA;border-radius:16px">
    <tr><td style="padding:32px">
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:600">${who} shared ${pet} with you</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6">
        You've been invited to ${pet}'s health records on PetCenza. You'll be able to ${access}.
      </p>
      <p style="margin:0 0 24px">
        <a href="${url}" style="display:inline-block;background:#154A5C;color:#EFF6F9;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px">
          Accept invitation
        </a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:#154A5CB3;line-height:1.6">
        Or paste this into your browser:<br>
        <span style="word-break:break-all">${url}</span>
      </p>
      <p style="margin:16px 0 0;font-size:13px;color:#154A5CB3;line-height:1.6">
        This invitation expires on ${esc(expires)}. If you weren't expecting it, you can ignore this email.
      </p>
    </td></tr>
  </table>
</body></html>`

  return { text, html }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const fromAddr = Deno.env.get('INVITE_FROM_EMAIL') ?? 'PetCenza <onboarding@resend.dev>'
  const appOrigin = Deno.env.get('APP_ORIGIN') ?? 'https://pawchart-zeta.vercel.app'

  const asUser = createClient(url, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }
  })
  const { data: { user }, error: userErr } = await asUser.auth.getUser()
  if (userErr || !user) return json({ error: 'Unauthorized' }, 401)

  // Report the missing-secret case only to an authenticated caller, so the deployment's
  // configuration isn't discoverable by anonymous probing.
  if (!resendKey) return json({ ok: false, reason: 'not_configured' }, 200)

  const admin = createClient(url, serviceKey)

  // Outbound mail is the abuse-sensitive part: cap it per account regardless of how many pets or
  // invitations they have.
  const limit = await checkRateLimit(admin, 'send-invite', user.id, 20, 3600)
  if (!limit.ok) {
    return json({ ok: false, reason: 'rate_limited', retryAfter: limit.retryAfter }, 429)
  }

  let body: { invitationId?: string }
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
  const invitationId = body.invitationId
  if (!invitationId || !UUID_RE.test(invitationId)) return json({ error: 'Bad request' }, 400)

  // Read through the caller's JWT: RLS restricts pet_invitations to the pet's owner, so a
  // successful read IS the authorisation check.
  const { data: inv, error: invErr } = await asUser
    .from('pet_invitations')
    .select('id, pet_id, token, role, invited_email, expires_at, accepted_at, revoked_at')
    .eq('id', invitationId)
    .maybeSingle()
  if (invErr || !inv) return json({ error: 'Not found' }, 404)

  // The recipient comes from the stored row, never from the request — this is what stops the
  // endpoint being used to mail arbitrary strangers.
  if (!inv.invited_email) return json({ ok: false, reason: 'no_email' }, 400)
  if (inv.revoked_at) return json({ ok: false, reason: 'revoked' }, 400)
  if (inv.accepted_at) return json({ ok: false, reason: 'already_used' }, 400)
  if (new Date(inv.expires_at) <= new Date()) return json({ ok: false, reason: 'expired' }, 400)

  const { data: pet } = await asUser.from('pets').select('name').eq('id', inv.pet_id).maybeSingle()
  const { data: profile } = await asUser.from('profiles').select('display_name').eq('id', user.id).maybeSingle()
  const inviterName = profile?.display_name?.trim() || user.email?.split('@')[0] || 'Someone'
  const expires = new Date(inv.expires_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  const acceptUrl = `${appOrigin}/invite/${inv.token}`
  const { text, html } = buildEmail(pet?.name ?? 'their pet', inviterName, inv.role, acceptUrl, expires)

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: fromAddr,
      to: [inv.invited_email],
      subject: `${inviterName} shared ${pet?.name ?? 'a pet'} with you on PetCenza`,
      html,
      text
    })
  })

  if (!res.ok) {
    // Log the status only. The response body can echo the recipient address, and the invite URL
    // must never reach a log line — it is the capability itself.
    console.error('resend rejected the send', res.status)
    return json({ ok: false, reason: 'send_failed' }, 502)
  }

  await admin.rpc('mark_invitation_emailed', { p_id: inv.id })

  return json({ ok: true, sentTo: inv.invited_email })
})
