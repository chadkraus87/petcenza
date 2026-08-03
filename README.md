# PawChart — Pet Health & Management Platform

A single-owner (SaaS-ready) pet health record system: profiles, medical history, medications, allergies, vaccinations, weight trends, vet visits, reminders, calendar, emergency card — offline-capable PWA with cross-device sync, built on React + TypeScript + Vite + Supabase.

## Stack
React 18 · TypeScript (strict) · Vite · Tailwind · React Router · TanStack Query (persisted) · React Hook Form + Zod · Recharts · Supabase (Postgres, Auth, RLS, Storage, Realtime) · vite-plugin-pwa (Workbox)

## Setup

1. **Supabase project** — create one at supabase.com (or `supabase start` locally).
2. **Migrations** — run in order via SQL editor or CLI:
   ```
   supabase db push        # applies supabase/migrations/0001..0003
   ```
3. **Auth providers** — in Dashboard → Authentication:
   - Enable Email (with "Confirm email" ON).
   - Enable Google and Apple OAuth (add client IDs/secrets).
   - Optional: enable MFA (TOTP) — the client SDK supports `supabase.auth.mfa.*`; see docs/ROADMAP.md for the enrollment UI task.
   - Set Site URL + redirect URLs (`/auth/callback`, `/auth/reset`).
4. **Env** — `cp .env.example .env.local` and fill in URL + anon key.
5. **Seed (dev only)** — create a dev user through the app sign-up, grab its UUID from `auth.users`, substitute in `supabase/seed.sql`, run it with `psql`.
6. **Run** — `npm install && npm run dev`.

## Scripts
| command | purpose |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | typecheck + production build (PWA assets generated) |
| `npm run typecheck` | strict TS check |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright E2E (public routes; `npx playwright install chromium` first) |
| `npm run audit:prod` | dependency audit of shipped deps only |
| `psql < tests/rls.test.sql` | RLS isolation tests against local Supabase |

## Architecture notes
- **Ownership model**: every row carries `user_id`; RLS enforces `user_id = auth.uid()` for all four verbs on every table, plus a trigger (`assert_pet_owner`) that blocks attaching child rows to another user's pet — closing the classic RLS privilege-escalation gap.
- **Offline**: Workbox caches app shell + Supabase REST GETs (NetworkFirst); TanStack Query cache persists to localStorage; offline writes queue in an IndexedDB outbox (`src/lib/outbox.ts`) and replay on reconnect with an `updated_at` conflict guard (conflicting items are retained for review, never silently dropped).
- **Cross-device sync**: Supabase Realtime `postgres_changes` filtered to the signed-in user invalidates query caches (`src/hooks/useRealtime.ts`).
- **Uploads**: MIME + extension cross-check client-side (`validateUpload`), enforced server-side by bucket `allowed_mime_types` + size limits + per-user folder policies. Buckets are private; images served via short-lived signed URLs.
- **Security headers**: CSP is set in `index.html` for dev; set the same header (plus HSTS, X-Content-Type-Options, frame-ancestors) at the hosting layer in production — see docs/SECURITY.md.

## Honest status
See docs/STATUS.md for exactly what is implemented, what is scaffolded, and what remains. Since the last review pass, MFA (TOTP), the nutrition/feeding/grooming/behavior/notes/documents panels, vet linking, weight-change alerts, Playwright E2E, and committed production security headers are all done. Remaining: passkeys, tags UI, drag-and-drop calendar rescheduling, and the Supabase-side items (RLS test run, reminder recurrence Edge Function, upload scanning).
