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
import { mkdir, writeFile, stat, readdir, rename, rm } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'

const BUCKETS = ['pet-photos', 'pet-documents']
const PAGE_SIZE = 100
// The privacy policy promises deleted data leaves backups within 30 days. Files that vanish from a
// bucket are parked in .trash for this long (so an ACCIDENTAL deletion is still recoverable), then
// purged for good. Change this and the policy together.
const RETENTION_DAYS = 30

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

/** Every file under dir, as paths relative to it. Missing dir = nothing backed up yet. */
async function localFiles(dir) {
  try {
    const entries = await readdir(dir, { recursive: true, withFileTypes: true })
    return entries.filter(e => e.isFile()).map(e => relative(dir, join(e.parentPath, e.name)))
  } catch {
    return []
  }
}

let saved = 0, skipped = 0, failed = 0, bytes = 0, trashed = 0, purged = 0
const today = new Date().toISOString().slice(0, 10)

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

  // Park local copies of objects that no longer exist in the bucket.
  const remote = new Set(objects.map(o => o.path))
  const orphans = (await localFiles(join(outRoot, bucket))).filter(p => !remote.has(p))
  // An empty listing against a non-empty backup is far likelier to be an API hiccup than every
  // user deleting everything overnight. Refuse rather than trash the whole backup.
  if (remote.size === 0 && orphans.length > 0) {
    console.error(`  ! ${bucket}: bucket listed empty but ${orphans.length} local file(s) exist — not pruning`)
    failed++
    continue
  }
  for (const p of orphans) {
    const dest = join(outRoot, '.trash', today, bucket, p)
    await mkdir(dirname(dest), { recursive: true })
    await rename(join(outRoot, bucket, p), dest)
    trashed++
    console.log(`  → trash ${p}`)
  }
}

// Purge trash batches older than the retention window. Batches are named YYYY-MM-DD, so a plain
// string comparison against the cutoff date is exact.
const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString().slice(0, 10)
for (const batch of await readdir(join(outRoot, '.trash')).catch(() => [])) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(batch) && batch < cutoff) {
    await rm(join(outRoot, '.trash', batch), { recursive: true, force: true })
    purged++
    console.log(`  ✗ purged trash batch ${batch}`)
  }
}

console.log(
  `\nDone → ${outRoot}\n  downloaded: ${saved}\n  up to date: ${skipped}\n  trashed:    ${trashed}\n  purged:     ${purged} batch(es)\n  failed:     ${failed}\n  bytes:      ${(bytes / 1024).toFixed(0)} KB`
)
process.exit(failed > 0 ? 1 : 0)
