# Testing

## Implemented
- `npm test` — Vitest unit tests (28): Zod schemas (pet, meds incl. vet-link uuid, allergy, weight,
  vet, emergency contact, feeding, grooming, behavior, note), upload validation (incl.
  spoofed-extension case), formatters, and the weight-change/alert helper.
- `npm run test:e2e` — **Playwright E2E** (6) over the public surface: sign-in renders, the
  forgot-password regression, reset-password gating, sign-up password minimum, catch-all
  fallback, and protected-route bounce. Uses placeholder Supabase env (no live backend).
  First run: `npx playwright install chromium`.
- `tests/rls.test.sql` — RLS isolation + cross-user escalation attempts against local Supabase.
- `npm run audit:prod` — dependency audit of **shipped** deps only (`npm audit --omit=dev`).

## CI recommendation (GitHub Actions)
typecheck → lint → unit tests → e2e → `npm run audit:prod` (gate high on runtime deps) → build

## To add (roadmap)
- Authenticated E2E once a test Supabase project + seeded user exist: pet CRUD, offline
  write→reconnect replay, photo/document upload, MFA enroll+challenge — run on
  chromium/firefox/webkit projects; add Android/iOS device profiles.
- @axe-core/playwright accessibility assertions on each route.
- Lighthouse CI budget: perf ≥ 95, a11y ≥ 95.
