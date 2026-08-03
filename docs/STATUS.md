# Implementation Status (honest ledger)

## Fully implemented
- Postgres schema for all 20+ entities, constraints, indexes, enums, triggers, migrations
- RLS: deny-by-default owner policies on every table + cross-row ownership trigger + SQL test suite
- Storage buckets (private) with per-user folder policies, MIME/size limits
- Auth: email/password (verify, forgot-password + reset pages, OAuth callback page), Google + Apple OAuth wiring, working remember-me (storage-adapter based), sign-out-everywhere (global token revocation) with local-cache wipe, audit logging of auth events
- Care team: veterinarians + emergency contacts CRUD (`/care-team`) that populates the Emergency screen
- PWA icons (192/512 + apple-touch) generated and referenced by the manifest
- Dashboard (due today, vax due, active meds, upcoming visits, severe-allergy alert)
- Pets: list, create/edit (RHF+Zod), detail with tabs, drag-and-drop photo upload via signed URLs
- Medications, Allergies (severity highlighted app-wide), Vaccinations (overdue/soon status), Weight (interactive chart + goal line), Vet visits
- Global search (SQL function across 6 entity types), ⌘K overlay
- Month calendar (reminders, visits, birthdays)
- Emergency page (offline-cached, tap-to-call)
- PWA: installable, precached shell, REST GET runtime cache, offline outbox with replay + conflict retention, online/offline UI, queued-changes indicator
- Realtime cross-device cache invalidation
- Browser notifications for due reminders (permission-gated)
- Unit tests (schemas, upload validation, formatters) + RLS SQL tests
- A11y floor: labels, aria-invalid/alerts, focus-visible, reduced-motion, keyboard-reachable nav

- **MFA (TOTP)**: enrollment (QR + manual key), verify, unenroll, list factors; second-factor
  challenge at sign-in; AAL2 enforced in the Protected route (also covers OAuth/refresh)
- Nutrition, feeding, grooming, behavior, notes, documents UI panels (tabs in PetDetail)
- Vet linking: prescriber/administering-vet/visiting-vet dropdowns on meds, vaccinations, visits
- Weight-change clinical alert (>10% swing between weigh-ins); Emergency pet-identity/microchip block
- Playwright E2E for the public surface (6 specs); production security headers as committed config

## Scaffolded (schema + hooks done, UI panel pending — copy MedicationsPanel pattern)
- Tags (pet_tags), medical_records timeline UI, notification settings screen

## Not yet implemented (roadmap)
- Passkeys/WebAuthn (Supabase support dependent)
- Device list management UI (global sign-out works today)
- Weekly/daily calendar views; drag-and-drop rescheduling
- Recurring-reminder auto-regeneration on completion (Edge Function stub in docs/ROADMAP.md)
- Authenticated E2E, axe automated a11y audit, Lighthouse CI
- Background Sync API registration (outbox currently replays on `online` event / app open)
