#!/usr/bin/env node
/**
 * Writes public/third-party-licenses.txt from the production dependency tree.
 *
 * MIT, BSD and Apache-2.0 all require their copyright and licence notices to accompany copies of
 * the code — and the built bundle IS a copy. Runs before every build so the file can never drift
 * from what actually ships.
 */
import { execSync } from 'node:child_process'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

let out
try {
  out = execSync('npm ls --omit=dev --all --parseable', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
} catch (e) {
  out = e.stdout ?? '' // npm ls exits non-zero on harmless tree warnings; the listing is still valid
}
const [root, ...dirs] = out.trim().split('\n')

const seen = new Map()
for (const dir of dirs) {
  let pkg
  try { pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) } catch { continue }
  const id = `${pkg.name}@${pkg.version}`
  if (seen.has(id)) continue
  const noticeFiles = readdirSync(dir).filter(f => /^(licen[cs]e|copying|notice)/i.test(f)).sort()
  const text = noticeFiles.map(f => readFileSync(join(dir, f), 'utf8').trim()).join('\n\n')
  const license = typeof pkg.license === 'string' ? pkg.license : pkg.license?.type ?? 'UNKNOWN'
  seen.set(id, { license, text })
}

const body = [...seen.entries()].sort(([a], [b]) => a.localeCompare(b))
  .map(([id, { license, text }]) => `${'='.repeat(78)}\n${id}\nLicense: ${license}\n\n${text || '(no licence file shipped with this package)'}`)
  .join('\n\n')

writeFileSync(join(root, 'public/third-party-licenses.txt'),
  `PetCenza includes the following open-source software.\n\n${body}\n`)
console.log(`third-party-licenses.txt: ${seen.size} packages`)
