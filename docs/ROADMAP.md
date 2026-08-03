# Roadmap

## Done in the review/QA passes ✅
- **Live Supabase backend** (project `petcenza`): migrations 0001–0006 applied, RLS suite passed live,
  storage buckets, advisors clean (0 security / 0 perf warnings) — see docs/SUPABASE_SETUP.md
- **Reminder recurrence** trigger (completing a recurring reminder auto-creates the next) — migration 0004
- **Upload magic-byte scanning** edge function `scan-upload`, wired into photo + document uploads
- UI panels for nutrition, feeding, grooming, behavior, documents, notes (tabs in PetDetail)
- MFA (TOTP) enrollment + challenge screens, AAL2 gate in sign-in + Protected route
- Vet dropdowns linking meds/vaccinations/visits to saved veterinarians
- Care-team CRUD (vets + emergency contacts) feeding the Emergency screen
- Emergency pet-identity/microchip block; weight-change (>10%) clinical alert
- Production security headers as committed config (vercel.json + public/_headers)
- Playwright E2E for the public surface

## Near-term (personal-use polish)
1. A "mark complete" / snooze control on reminders in the calendar (the recurrence trigger already
   regenerates the next occurrence when `completed_at` is set)
2. Weekly/day calendar views, drag-to-reschedule (dnd-kit)
3. Notification settings screen wired to `notification_settings` table
4. Tags UI (pet_tags many-to-many) + filter pets by tag
5. Show the linked vet's name on med/vaccination/visit cards (join or lookup)

## Mid-term (multi-device hardening)
6. Background Sync API + periodic sync for the outbox
7. Conflict-review UI for retained outbox conflicts
8. Device/session list (revoke individual sessions) — **needs Supabase admin**

## Commercial track
9. ~~Households (shared pets)~~ — **done**, as per-pet shares rather than households (finer grained:
   share one pet with a sitter without exposing the rest). Migrations 0007–0012.
10. ~~Vet-share links (read-only signed access)~~ — **done**, migration 0011 + `vet-share` edge function.
11. Billing (Stripe), plan gating on pet count/storage

## Sharing follow-ups (deliberately deferred)
- Collaborators see their **own** vets/emergency contacts, not the owner's. Consider sharing the
  care team alongside the pet, or attaching vets to pets rather than users.
- Ownership **transfer** (owner → editor promotion to owner). Invitations intentionally cannot
  grant `owner` today (`invitation_role_not_owner` check).
- Email delivery for invitations — currently copy-a-link, which needs no mail provider.
- A "shared with me" filter/badge on the pet list.
- Realtime is now unfiltered and leans on RLS for delivery; if row volume grows, move to
  per-pet channels.
