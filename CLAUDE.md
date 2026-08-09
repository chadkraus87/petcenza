# CLAUDE.md — PetCenza

## What this project is
A household pet health record: vaccination boosters, medication schedules and
refill dates, vet appointments, and weight history across every pet in a home,
rolled into one daily "does anything need attention today?" view.

- Repo: github.com/chadkraus87/petcenza (**public** — see Security below)
- Live: https://pawchart-zeta.vercel.app/
- Local directory is `pawchart`; the product name is PetCenza. Don't rename either.

## Architecture
- React 18 + TypeScript (strict) on Vite 5, Tailwind, no component library.
- `src/features/` — feature-first. Most work belongs here, not in `components/`.
- `src/components/` — shared presentational pieces only.
- `src/schemas/` — Zod schemas shared by client and server. Validation changes
  start here so both sides move together.
- `src/hooks/`, `src/lib/` — TanStack Query hooks and Supabase client wiring.
- `supabase/migrations/` — 20 versioned migrations. **Never edit an applied
  migration; add a new one.**
- `supabase/functions/` — 4 Deno edge functions (upload magic-byte verification,
  unauthenticated read-only vet share, transactional email).

## Non-negotiable rules
1. **RLS is the security boundary, not the client.** Every table has row-level
   security; per-pet roles (viewer/editor/co-owner) are enforced in the database.
   If a fix can be made in a policy or in the UI, make it in the policy.
2. **Policy recursion.** Helper functions are `SECURITY DEFINER` specifically to
   break recursive policy evaluation. If you add a policy that queries a table
   which itself has a policy referencing back, you will recurse — route it
   through a helper function instead.
3. **Never commit a service-role key.** The anon/publishable key is public by
   design and fine. `.env.production` holds only the Turnstile *sitekey*, which
   Cloudflare renders into the page anyway. Service-role keys live in Supabase
   and Vercel settings only.
4. **Offline-first is a real constraint.** Reads come from a persisted query
   cache; writes go through an IndexedDB outbox that replays on reconnect. Any
   new mutation must survive being queued offline — don't assume a live network.
5. **Uploads are validated by magic bytes, not extension.** Mismatched files are
   quarantined. Keep that check server-side in the edge function.

## Commands
```
npm run dev          # local dev
npm run typecheck    # TS strict — run before committing
npm run test         # Vitest unit/component
npm run test:e2e     # Playwright
npm run audit:prod   # production checks
npm run backup:storage
```
Run `typecheck` and `test` before any commit. `test:e2e` before anything touching
auth, sharing, or uploads.

## Security (repo is public)
Keep this file and the README free of anything operational: no project refs
paired with keys, no unfixed-vulnerability notes, no internal URLs. Describing
*how* the security model works is fine and intentional — that's the point of the
repo being public. Describing what is currently broken is not; fix it instead.
