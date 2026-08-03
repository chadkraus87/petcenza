#!/usr/bin/env node
/**
 * Storage backup for PetCenza.
 *
 * WHY THIS EXISTS: Supabase's daily database backups explicitly EXCLUDE Storage objects — the
 * database only holds metadata rows pointing at files. Without this script, a deleted or lost
 * pet photo / medical document is unrecoverable even after a full database restore.
 *
 * What it does: walks both private buckets and mirrors every object to a local directory,
 * preserving the {pet_id}/{file} layout. Idempotent — files already present with a matching
 * byte size are skipped, so re-runs are cheap and it can be scheduled.
 *
 * Usage:
 *   export SUPABASE_URL="https://<ref>.supabase.co"
 *   export SUPABASE_SERVICE_ROLE_KEY="<service role key>"   # secret — never commit this
 *   node scripts/backup-storage.mjs [--out ./backups/storage]
 *
 * The service-role key bypasses RLS (that is the point — it must read every user's files), so
 * treat it like a root password: keep it in your shell/secret manager, never in the repo.
 * The ./backups directory is gitignored because it contains real medical records.
 */
import { mkdir, writeFile, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const BUCKETS = ['pet-photos', 'pet-documents']
const PAGE_SIZE = 100

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\nSee the header of this file for usage.')
  process.exit(1)
}

const outArgIndex = process.argv.indexOf('--out')
const outRoot = outArgIndex !== -1 ? process.argv[outArgIndex + 1] : './backups/storage'

const headers = { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' }

/** List a single folder level. Supabase returns folders as entries with a null id. */
async function listFolder(bucket, prefix) {
  const items = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const res = await fetch(`${url}/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ prefix, limit: PAGE_SIZE, offset, sortBy: { column: 'name', order: 'asc' } })
    })
    if (!res.ok) throw new Error(`list ${bucket}/${prefix} failed: ${res.status} ${await res.text()}`)
    const page = await res.json()
    items.push(...page)
    if (page.length < PAGE_SIZE) break
  }
  return items
}

/** Depth-first walk yielding every object path in the bucket. */
async function walk(bucket, prefix = '') {
  const out = []
  for (const entry of await listFolder(bucket, prefix)) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.id === null) out.push(...await walk(bucket, path))   // folder
    else out.push({ path, size: entry.metadata?.size ?? null })
  }
  return out
}

async function alreadyBackedUp(dest, size) {
  if (size == null) return false
  try {
    const s = await stat(dest)
    return s.size === size
  } catch {
    return false
  }
}

async function download(bucket, path, dest) {
  const res = await fetch(`${url}/storage/v1/object/${bucket}/${encodeURI(path)}`, { headers })
  if (!res.ok) throw new Error(`download ${bucket}/${path} failed: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await mkdir(dirname(dest), { recursive: true })
  await writeFile(dest, buf)
  return buf.length
}

let saved = 0, skipped = 0, failed = 0, bytes = 0

for (const bucket of BUCKETS) {
  process.stdout.write(`\n${bucket}: listing…`)
  let objects
  try {
    objects = await walk(bucket)
  } catch (e) {
    console.error(`\n  ! ${e.message}`)
    failed++
    continue
  }
  console.log(` ${objects.length} object(s)`)

  for (const { path, size } of objects) {
    const dest = join(outRoot, bucket, path)
    if (await alreadyBackedUp(dest, size)) { skipped++; continue }
    try {
      bytes += await download(bucket, path, dest)
      saved++
      console.log(`  ✓ ${path}`)
    } catch (e) {
      failed++
      console.error(`  ! ${path}: ${e.message}`)
    }
  }
}

console.log(
  `\nDone → ${outRoot}\n  downloaded: ${saved}\n  up to date: ${skipped}\n  failed:     ${failed}\n  bytes:      ${(bytes / 1024).toFixed(0)} KB`
)
process.exit(failed > 0 ? 1 : 0)
