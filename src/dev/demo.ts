/**
 * DEV-ONLY demo backend. Lets every real page, hook and query run against realistic sample data
 * without a Supabase account — so the UI can be designed and reviewed screen by screen.
 *
 * How: the Supabase client gets `demoFetch` instead of the network, and a fake signed-in session
 * from `demoAuthStorage`. A tiny PostgREST emulator answers table reads/writes, RPCs, auth,
 * storage and edge-function calls from an in-memory dataset. Writes persist until reload.
 *
 * SAFETY: only wired in when `import.meta.env.DEV && VITE_DEMO === '1'` (`npm run dev:demo`).
 * `vite build` sets DEV=false, the branch folds away, and this module is tree-shaken out — the
 * build is checked for that. Nothing here runs at import time, which is what lets that happen.
 */

type Row = Record<string, unknown>
type DB = Record<string, Row[]>

const USER_ID = '0de30000-0000-4000-8000-000000000001'
const PARTNER_ID = '0de30000-0000-4000-8000-000000000002'

function iso(days = 0, hours?: number, minutes = 0) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  if (hours !== undefined) { d.setHours(hours, minutes, 0, 0); return d.toISOString() }
  return d.toISOString().slice(0, 10)
}
const id = (n: number) => `0de30000-0000-4000-8000-${String(n).padStart(12, '0')}`
const stamp = () => new Date().toISOString()

function seed(): DB {
  const [biscuit, mochi, juniper] = [id(101), id(102), id(103)]
  const vet = id(301), er = id(302)
  const base = { user_id: USER_ID, created_at: iso(-200, 9), updated_at: iso(-2, 9) }
  const pet = (o: Row) => ({
    ...base, nickname: null, is_mixed_breed: false, estimated_age_months: null, adoption_date: null,
    rescue_org: null, color: null, goal_weight_kg: null, height_cm: null, activity_level: 'moderate',
    insurance_provider: null, insurance_policy_no: null, registration_no: null, microchip_no: null,
    favorite_foods: null, favorite_toys: null, favorite_activities: null, archived: false, deceased_on: null, ...o
  })
  return {
    pets: [
      pet({ id: biscuit, name: 'Biscuit', species: 'dog', breed: 'Labrador Retriever mix', is_mixed_breed: true,
        sex: 'female_spayed', birth_date: '2015-04-12', color: 'Yellow', microchip_no: '985141000123456',
        goal_weight_kg: 30, activity_level: 'low', insurance_provider: 'Sample Pet Insurance' }),
      pet({ id: mochi, name: 'Mochi', species: 'cat', breed: 'Domestic Shorthair', sex: 'male_neutered',
        birth_date: '2020-09-01', color: 'Grey tabby', nickname: 'Moch' }),
      pet({ id: juniper, name: 'Juniper', species: 'dog', breed: 'Border Collie', sex: 'female',
        birth_date: '2022-02-20', color: 'Black and white', activity_level: 'very_high', rescue_org: 'Sample County Rescue' }),
      pet({ id: id(104), name: 'Pepper', species: 'rabbit', breed: 'Holland Lop', sex: 'female_spayed',
        birth_date: '2014-03-01', archived: true, deceased_on: iso(-120) })
    ],
    medications: [
      { id: id(201), pet_id: biscuit, user_id: USER_ID, name: 'Levothyroxine', dosage: '0.6 mg', frequency: 'Twice daily with food',
        starts_on: iso(-300), ends_on: null, instructions: 'Crush into wet food', prescriber_id: vet, pharmacy: 'Sample Vet Pharmacy',
        refill_due_on: iso(3), side_effects: null, notes: null, updated_at: iso(-3, 9) },
      { id: id(202), pet_id: biscuit, user_id: USER_ID, name: 'Carprofen', dosage: '75 mg', frequency: 'As needed for joint pain',
        starts_on: iso(-90), ends_on: null, instructions: 'Max once per day', prescriber_id: vet, pharmacy: null,
        refill_due_on: null, side_effects: null, notes: null, updated_at: iso(-3, 9) },
      { id: id(203), pet_id: mochi, user_id: USER_ID, name: 'Methimazole', dosage: '2.5 mg', frequency: 'BID',
        starts_on: iso(-40), ends_on: null, instructions: null, prescriber_id: vet, pharmacy: null,
        refill_due_on: iso(18), side_effects: null, notes: null, updated_at: iso(-3, 9) },
      { id: id(204), pet_id: juniper, user_id: USER_ID, name: 'NexGard Plus', dosage: '1 chew', frequency: 'Monthly',
        starts_on: iso(-150), ends_on: null, instructions: null, prescriber_id: null, pharmacy: null,
        refill_due_on: iso(40), side_effects: null, notes: null, updated_at: iso(-3, 9) }
    ],
    vaccinations: [
      { id: id(211), pet_id: mochi, user_id: USER_ID, vaccine: 'FVRCP', administered_on: iso(-375), next_due_on: iso(-10), veterinarian_id: vet, lot_no: null, notes: null },
      { id: id(212), pet_id: juniper, user_id: USER_ID, vaccine: 'Rabies (3-year)', administered_on: iso(-1075), next_due_on: iso(20), veterinarian_id: vet, lot_no: 'R-2291', notes: null },
      { id: id(213), pet_id: biscuit, user_id: USER_ID, vaccine: 'DHPP', administered_on: iso(-120), next_due_on: iso(245), veterinarian_id: vet, lot_no: null, notes: null }
    ],
    weight_entries: [
      ...[[-180, 31.8], [-120, 31.2], [-60, 30.9], [-5, 30.6]].map(([d, w], i) =>
        ({ id: id(221 + i), pet_id: biscuit, user_id: USER_ID, measured_on: iso(d), weight_kg: w, body_condition: 6, notes: null })),
      ...[[-150, 18.4], [-60, 18.1], [-4, 16.0]].map(([d, w], i) =>
        ({ id: id(231 + i), pet_id: juniper, user_id: USER_ID, measured_on: iso(d), weight_kg: w, body_condition: 4, notes: null }))
    ],
    vet_visits: [
      { id: id(241), pet_id: juniper, user_id: USER_ID, veterinarian_id: vet, visit_at: iso(5, 10, 30), reason: 'Weight check', diagnosis: null, treatment: null, followup: null, notes: null, updated_at: iso(-1, 9) },
      { id: id(242), pet_id: biscuit, user_id: USER_ID, veterinarian_id: vet, visit_at: iso(-30, 14), reason: 'Thyroid recheck', diagnosis: 'Hypothyroidism, stable', treatment: 'Continue levothyroxine', followup: 'Recheck T4 in 6 months', notes: null, updated_at: iso(-30, 15) }
    ],
    allergies: [
      { id: id(251), pet_id: mochi, user_id: USER_ID, allergy_type: 'medication', allergen: 'Penicillin', severity: 'severe', symptoms: 'Facial swelling', emergency_treatment: 'Antihistamine, see vet immediately' },
      { id: id(252), pet_id: biscuit, user_id: USER_ID, allergy_type: 'food', allergen: 'Chicken', severity: 'moderate', symptoms: 'Itchy skin', emergency_treatment: null }
    ],
    reminders: [
      { id: id(261), pet_id: biscuit, user_id: USER_ID, kind: 'medication', title: 'Biscuit — Levothyroxine', due_at: iso(0, 8), recurrence: 'daily', completed_at: null, snoozed_until: null },
      { id: id(262), pet_id: mochi, user_id: USER_ID, kind: 'vaccination', title: 'Mochi — FVRCP booster', due_at: iso(-10, 9), recurrence: 'none', completed_at: null, snoozed_until: null, source_table: 'vaccinations', source_id: id(211) },
      { id: id(263), pet_id: juniper, user_id: USER_ID, kind: 'grooming', title: 'Juniper — nail trim', due_at: iso(1, 17), recurrence: 'monthly', completed_at: null, snoozed_until: null },
      { id: id(264), pet_id: juniper, user_id: USER_ID, kind: 'vet_appointment', title: 'Juniper — weight check', due_at: iso(5, 10, 30), recurrence: 'none', completed_at: null, snoozed_until: null }
    ],
    veterinarians: [
      { id: vet, user_id: USER_ID, name: 'Dr. Alex Rivera', clinic: 'Sample Animal Clinic', address: '100 Example St', phone: '555-0100', email: null, is_primary: true, is_emergency_clinic: false, notes: null },
      { id: er, user_id: USER_ID, name: '24-hour ER', clinic: 'Sample Emergency Vets', address: '200 Example Ave', phone: '555-0199', email: null, is_primary: false, is_emergency_clinic: true, notes: 'Open overnight' }
    ],
    emergency_contacts: [
      { id: id(311), user_id: USER_ID, label: 'Neighbor', name: 'Jordan Lee', phone: '555-0142', notes: 'Has a spare key', sort_order: 0 }
    ],
    tags: [
      { id: id(401), user_id: USER_ID, name: 'Senior', color: '#A8641A' },
      { id: id(402), user_id: USER_ID, name: 'Daily meds', color: '#227695' }
    ],
    pet_tags: [
      { pet_id: biscuit, tag_id: id(401), user_id: USER_ID },
      { pet_id: biscuit, tag_id: id(402), user_id: USER_ID },
      { pet_id: mochi, tag_id: id(402), user_id: USER_ID }
    ],
    notification_settings: [{ user_id: USER_ID, browser_push: false, feeding: true, medication: true, grooming: true, vaccination: true, birthdays: true, vet_appointments: true, custom: true, quiet_hours_start: '22:00', quiet_hours_end: '07:00' }],
    nutrition_plans: [{ id: id(501), pet_id: biscuit, user_id: USER_ID, food_brand: 'Sample Senior Formula', formula: 'Salmon & rice', portion: '1.5 cups', calories_per_day: 950, supplements: 'Fish oil', treats: 'Carrot sticks', water_notes: null, foods_to_avoid: 'Chicken', updated_at: iso(-20, 9) }],
    feeding_schedules: [
      { id: id(511), pet_id: biscuit, user_id: USER_ID, label: 'Breakfast', feed_time: '07:30', portion: '3/4 cup', active: true },
      { id: id(512), pet_id: biscuit, user_id: USER_ID, label: 'Dinner', feed_time: '18:00', portion: '3/4 cup', active: true }
    ],
    grooming_logs: [{ id: id(521), pet_id: juniper, user_id: USER_ID, task: 'Nail trim', done_on: iso(-29), notes: null }],
    behavior_notes: [{ id: id(531), pet_id: juniper, user_id: USER_ID, category: 'Anxiety', content: 'Nervous during thunderstorms — calmer with the crate covered.', noted_on: iso(-14) }],
    notes: [{ id: id(541), pet_id: mochi, user_id: USER_ID, title: 'Pill trick', body: 'Hides the tablet in a lick of tuna paste.', pinned: true, created_at: iso(-12, 9), updated_at: iso(-12, 9) }],
    documents: [],
    pet_photos: [],
    pet_shares: [{ id: id(601), pet_id: biscuit, user_id: PARTNER_ID, role: 'owner', invited_by: USER_ID, expires_at: null, created_at: iso(-100, 9) }],
    pet_invitations: [{ id: id(611), pet_id: juniper, token: id(612), role: 'viewer', invited_email: 'sitter@example.com', invited_by: USER_ID, expires_at: iso(9, 9), accepted_at: null, accepted_by: null, revoked_at: null, email_sent_at: null, email_send_count: 0, created_at: iso(-5, 9) }],
    pet_share_links: [{ id: id(621), pet_id: mochi, token: id(622), label: 'Dr. Rivera — thyroid follow-up', created_by: USER_ID, expires_at: iso(4, 9), revoked_at: null, last_viewed_at: iso(-1, 16), view_count: 2, created_at: iso(-3, 9) }],
    activity_logs: []
  }
}

let db: DB | null = null
const data = () => (db ??= seed())

// ------------------------------------------------------------------ PostgREST emulation

/** Split on commas that aren't inside parentheses — for select lists and or=() groups. */
function splitTop(s: string) {
  const out: string[] = []; let depth = 0; let cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) { out.push(cur); cur = '' } else cur += ch
  }
  if (cur) out.push(cur)
  return out
}

function test(value: unknown, expr: string): boolean {
  const negate = expr.startsWith('not.')
  if (negate) expr = expr.slice(4)
  const dot = expr.indexOf('.')
  const op = expr.slice(0, dot); const raw = expr.slice(dot + 1)
  const num = (x: unknown) => typeof x === 'number' ? x : Number(x)
  const cmp = (a: unknown, b: string) =>
    typeof a === 'number' ? num(a) - num(b) : String(a ?? '').localeCompare(b)
  let r: boolean
  switch (op) {
    case 'eq': r = String(value) === raw; break
    case 'neq': r = String(value) !== raw; break
    case 'gt': r = value != null && cmp(value, raw) > 0; break
    case 'gte': r = value != null && cmp(value, raw) >= 0; break
    case 'lt': r = value != null && cmp(value, raw) < 0; break
    case 'lte': r = value != null && cmp(value, raw) <= 0; break
    case 'is': r = raw === 'null' ? value == null : String(value) === raw; break
    case 'in': r = raw.replace(/^\(|\)$/g, '').split(',').map(v => v.replace(/^"|"$/g, '')).includes(String(value)); break
    case 'like': case 'ilike': {
      const re = new RegExp('^' + raw.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/[*%]/g, '.*') + '$', op === 'ilike' ? 'i' : '')
      r = re.test(String(value ?? '')); break
    }
    default: r = true // unknown operator: don't filter rather than hide data
  }
  return negate ? !r : r
}

function matches(row: Row, params: URLSearchParams) {
  for (const [key, val] of params) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(key)) continue
    if (key === 'or') {
      const any = splitTop(val.replace(/^\(|\)$/g, '')).some(cond => {
        const dot = cond.indexOf('.')
        return test(row[cond.slice(0, dot)], cond.slice(dot + 1))
      })
      if (!any) return false
    } else if (!test(row[key], val)) return false
  }
  return true
}

function project(rows: Row[], select: string | null) {
  if (!select || select === '*') return rows
  const parts = splitTop(select).map(s => s.trim())
  return rows.map(row => {
    const out: Row = {}
    for (const p of parts) {
      const embed = p.match(/^(?:\w+:)?(\w+)\((.*)\)$/)
      if (embed) {
        const [, table] = embed
        const fk = `${table.replace(/s$/, '')}_id`
        out[table] = (data()[table] ?? []).find(r => r.id === row[fk]) ?? null
      } else if (p === '*') Object.assign(out, row)
      else { const col = p.split('::')[0].split(':').pop()!; out[col] = row[col] }
    }
    return out
  })
}

function order(rows: Row[], spec: string | null) {
  if (!spec) return rows
  const keys = spec.split(',').map(s => { const [col, dir] = s.split('.'); return { col, desc: dir === 'desc' } })
  return [...rows].sort((a, b) => {
    for (const { col, desc } of keys) {
      const c = String(a[col] ?? '').localeCompare(String(b[col] ?? ''), undefined, { numeric: true })
      if (c) return desc ? -c : c
    }
    return 0
  })
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(body === null ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })

function rest(method: string, table: string, params: URLSearchParams, headers: Headers, body: unknown) {
  const rows = (data()[table] ??= [])
  const wantsObject = headers.get('Accept')?.includes('vnd.pgrst.object')
  const prefer = headers.get('Prefer') ?? ''
  const reply = (result: Row[], status = 200) => {
    const shaped = project(result, params.get('select'))
    if (wantsObject) return shaped.length ? json(shaped[0], status) : json({ code: 'PGRST116', message: 'no rows' }, 406)
    const range = { 'Content-Range': `0-${Math.max(shaped.length - 1, 0)}/${shaped.length}` }
    return json(prefer.includes('return=minimal') ? null : shaped, status, range)
  }

  if (method === 'GET' || method === 'HEAD') {
    let result = order(rows.filter(r => matches(r, params)), params.get('order'))
    const offset = Number(params.get('offset') ?? 0)
    const limit = params.get('limit') ? Number(params.get('limit')) : undefined
    result = result.slice(offset, limit ? offset + limit : undefined)
    if (method === 'HEAD') return new Response(null, { status: 200, headers: { 'Content-Range': `0-0/${result.length}` } })
    return reply(result)
  }
  if (method === 'POST') {
    const incoming = (Array.isArray(body) ? body : [body]) as Row[]
    const conflict = params.get('on_conflict')?.split(',')
    const written = incoming.map(r => {
      const existing = conflict && rows.find(x => conflict.every(k => x[k] === r[k]))
      if (existing) return Object.assign(existing, r, { updated_at: stamp() })
      const row = { id: crypto.randomUUID(), user_id: USER_ID, created_at: stamp(), updated_at: stamp(), ...r }
      rows.push(row); return row
    })
    return reply(written, 201)
  }
  if (method === 'PATCH') {
    const hit = rows.filter(r => matches(r, params))
    hit.forEach(r => Object.assign(r, body as Row, { updated_at: stamp() }))
    return reply(hit)
  }
  if (method === 'DELETE') {
    const hit = rows.filter(r => matches(r, params))
    data()[table] = rows.filter(r => !hit.includes(r))
    return reply(hit)
  }
  return json({ message: 'unsupported' }, 405)
}

function rpc(name: string, args: Row) {
  const d = data()
  switch (name) {
    case 'can_access_pet': case 'is_pet_owner': case 'is_primary_pet_owner': return json(true)
    case 'accept_pet_invitation': case 'transfer_pet_ownership': return json('ok')
    case 'pet_members': return json([
      { user_id: USER_ID, display_name: 'Demo Owner', email: 'demo@example.com', role: 'owner', expires_at: null, is_owner: true },
      ...d.pet_shares.filter(s => s.pet_id === args.p_pet_id).map(s => ({
        user_id: s.user_id, display_name: 'Sam (partner)', email: 'sam@example.com', role: s.role, expires_at: s.expires_at, is_owner: false
      }))
    ])
    case 'global_search': {
      const q = String(args.q ?? args.query ?? '').toLowerCase()
      const hits = [
        ...d.pets.map(p => ({ entity: 'pet', id: p.id, pet_id: p.id, title: p.name, snippet: String(p.breed ?? '') })),
        ...d.medications.map(m => ({ entity: 'medication', id: m.id, pet_id: m.pet_id, title: m.name, snippet: `${m.dosage} — ${m.frequency}` })),
        ...d.notes.map(n => ({ entity: 'note', id: n.id, pet_id: n.pet_id, title: n.title ?? 'Note', snippet: n.body }))
      ].filter(h => `${h.title} ${h.snippet}`.toLowerCase().includes(q))
      return json(hits)
    }
    case 'export_my_account': return json({ exported_at: stamp(), format_version: 1, ...d })
    default: return json(null)
  }
}

// ------------------------------------------------------------------ auth

function b64url(o: unknown) {
  return btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function user() {
  return {
    id: USER_ID, aud: 'authenticated', role: 'authenticated', email: 'demo@example.com',
    app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { display_name: 'Demo Owner' },
    created_at: iso(-200, 9), factors: []
  }
}

function session() {
  const exp = Math.floor(Date.now() / 1000) + 365 * 86400
  const access = `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({
    sub: USER_ID, role: 'authenticated', aal: 'aal1', amr: [{ method: 'password', timestamp: exp - 3600 }], exp
  })}.demo`
  return { access_token: access, refresh_token: 'demo', token_type: 'bearer', expires_in: 3600, expires_at: exp, user: user() }
}

let signedOut = false

/** Stands in for the real auth storage adapter: always "signed in" until the user signs out. */
export const demoAuthStorage = {
  getItem: (key: string) => (key.endsWith('-auth-token') && !signedOut ? JSON.stringify(session()) : null),
  setItem: (key: string) => { if (key.endsWith('-auth-token')) signedOut = false },
  removeItem: (key: string) => { if (key.endsWith('-auth-token')) signedOut = true }
}

// ------------------------------------------------------------------ router

export async function demoFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const url = new URL(href)
  const method = (init.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
  const headers = new Headers(init.headers)
  const body = typeof init.body === 'string' && init.body ? JSON.parse(init.body) : undefined
  const path = url.pathname

  await new Promise(r => setTimeout(r, 120)) // a little latency, so loading states are visible

  if (path.startsWith('/rest/v1/rpc/')) return rpc(path.slice('/rest/v1/rpc/'.length), body ?? {})
  if (path.startsWith('/rest/v1/')) return rest(method, path.slice('/rest/v1/'.length), url.searchParams, headers, body)
  if (path === '/auth/v1/user') return json(user())
  if (path === '/auth/v1/token') return json(session())
  if (path === '/auth/v1/logout') return new Response(null, { status: 204 })
  if (path.startsWith('/storage/v1/object/sign/')) {
    const paths = (body as { paths?: string[] })?.paths ?? []
    return json(paths.map(p => ({ path: p, signedURL: null, error: 'Demo mode has no stored files' })))
  }
  if (path.startsWith('/functions/v1/send-invite')) return json({ ok: false, reason: 'not_configured' })
  if (path.startsWith('/functions/v1/')) return json({ error: 'Demo mode: server functions are disabled' }, 400)
  return json({ message: `Demo mode: ${method} ${path} is not emulated` }, 400)
}
