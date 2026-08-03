# Supabase Backend — Live Setup

**Project:** `pawchart` · ref `ccvjqnljijlyxxecwryd` · org Kraus Haus Technologies · region us-east-2
**API URL:** https://ccvjqnljijlyxxecwryd.supabase.co

## Done (applied to the live project)
- ✅ Migrations `0001`–`0006` applied (schema, RLS, storage, reminder recurrence, function-grant hardening, RLS perf).
- ✅ 22 tables, all with RLS enabled + forced. RLS isolation suite (`tests/rls.test.sql`) run live — **passed**.
- ✅ Storage buckets `pet-photos` (10 MB) and `pet-documents` (25 MB), private, per-user folder policies.
- ✅ Edge function `scan-upload` deployed (magic-byte upload verification, JWT-gated).
- ✅ Reminder recurrence trigger verified (completing a recurring reminder creates the next).
- ✅ Advisors: **security 0**, **performance 0 warnings** (only expected INFO on the empty DB).
- ✅ `.env.local` wired with the live URL + anon key; sign-up → trigger → profile/settings verified end-to-end.

## Dashboard configuration — status

Completed in the dashboard (2026-08-02):

1. ✅ **Auth → Sign In / Providers → Email**: "Confirm email" ON; **minimum password length 6 → 12**
   (matches the app's own rule); **password requirements** = lowercase + uppercase + digits + symbols;
   **require current password when updating** ON.
2. ✅ **Auth → Multi-Factor**: **TOTP already Enabled** (default) — the in-app 2FA enroll/challenge flow
   works as-is. "Limit duration of AAL1 sessions" is ON (recommended).
3. ✅ **Auth → URL Configuration**: Site URL corrected `http://localhost:3000` → **`http://localhost:5178`**
   (the old value pointed at a dead port). Redirect URLs added (were **empty**, which would have broken
   password reset + OAuth return entirely):
   - `http://localhost:5178/auth/callback` · `http://localhost:5178/auth/reset`
   - `http://localhost:5173/auth/callback` · `http://localhost:5173/auth/reset` (vite's default port)
4. ✅ **Auth → Attack Protection**: **leaked-password protection ENABLED** (HaveIBeenPwned).
5. ✅ **Database → Backups**: **daily backups already active** and included with Pro (no action needed).

### Still to do — these need YOUR hands (credentials or spend)

- ⏳ **Google OAuth** (free): in Google Cloud Console → APIs & Services → OAuth consent screen, then
  Credentials → Create OAuth client ID → **Web application**. Add this authorized redirect URI:
  `https://ccvjqnljijlyxxecwryd.supabase.co/auth/v1/callback`
  Then paste the Client ID + Client Secret into Auth → Providers → Google and enable it.
  *(Claude will not enter secrets — paste these yourself.)*
- ⏳ **Apple OAuth**: same flow, but needs a paid Apple Developer account ($99/yr). Optional.
- ⏳ **When you deploy**: add `https://<your-domain>/auth/callback` and `/auth/reset` to Redirect URLs,
  and change Site URL to the production domain.
- ⏳ **Optional — Captcha** (Auth → Attack Protection): needs an hCaptcha/Turnstile secret key plus
  client-side integration. Worth it only once the app is publicly reachable.
- ⏳ **Optional — PITR** (Database → Backups → Point in time): a **paid add-on** on top of Pro. Daily
  backups already cover you; add PITR only if you want sub-day recovery granularity.
## Storage backups (the gap DB backups don't cover)

Supabase's daily backups cover the **database only** — Storage objects (pet photos, medical
documents) are explicitly excluded, so a full DB restore would come back with metadata rows
pointing at files that no longer exist.

`scripts/backup-storage.mjs` closes that gap by mirroring both buckets to a local folder:

```bash
export SUPABASE_URL="https://ccvjqnljijlyxxecwryd.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service role key from Dashboard → Settings → API>"
npm run backup:storage            # writes ./backups/storage/<bucket>/<user>/<pet>/<file>
```

- Idempotent — files already downloaded at the same size are skipped, so it's cheap to re-run.
- `./backups/` is gitignored (it contains real medical records).
- The **service-role key bypasses RLS by design** (it has to read every user's files). Treat it
  like a root password: keep it in your shell or a secret manager, never in the repo.
- To automate, add a cron/launchd entry, e.g. daily at 02:00:
  `0 2 * * * cd /path/to/pawchart && SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run backup:storage`
- For off-machine durability, point `--out` at a synced folder (iCloud/Dropbox) or an external disk.
- ⏳ **Optional — `scan-upload` as a Storage webhook**: the client already calls it after each upload.
  For defense in depth, add a webhook on `objects insert` for `pet-photos`/`pet-documents` that POSTs
  `{bucket, path}` to the function, so files get scanned even if a client skips the call.

## Notes
- The anon key in `.env.local` is a public client key (safe in the browser bundle), not a secret.
- Accepted advisor INFO items: `unindexed_foreign_keys` / `unused_index` — deliberately not adding 21 FK
  indexes to a low-write, single-owner-per-account app where queries are already `pet_id`-indexed; revisit
  if usage patterns change. `auth_db_connections_absolute` is a pool-tuning note for larger instances.
