# Security Summary

## Threat model
Single-owner personal health data for pets; primary risks are cross-tenant data exposure, account takeover, and malicious file upload.

## Controls in place
| Area | Control |
|---|---|
| AuthZ | RLS on every table, all four verbs, `force row level security`; owner trigger prevents attaching child rows to foreign pets (privilege-escalation review item #4 of the spec) |
| AuthN | Supabase Auth PKCE flow; refresh-token rotation (SDK default); email verification; password reset; **MFA (TOTP)** with enrollment + sign-in challenge, AAL2 enforced in the Protected route; global sign-out revokes all refresh tokens; 12-char minimum at sign-up |
| SQLi | No dynamic SQL from client; PostgREST parameterization; search via `security invoker` SQL function that itself filters on `auth.uid()` |
| XSS | React escaping everywhere; no `dangerouslySetInnerHTML`; CSP restricting script/style/connect sources |
| CSRF | Token-bearing API (Authorization header), no cookie-auth endpoints; SameSite defaults apply to Supabase auth cookies if enabled |
| Uploads | Client extension↔MIME cross-check; server-side bucket `allowed_mime_types` + file size caps; private buckets; per-user folder path policy; signed URLs (1 h TTL) |
| Rate limiting | Supabase Auth built-in limits on sign-in/reset; add PostgREST/edge rate limits before public launch |
| Audit | `activity_logs` append-only (update/delete policies dropped) for auth + sensitive events |
| Headers | CSP in index.html **and** committed host config (`vercel.json` + `public/_headers`) setting full CSP, HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, and `frame-ancestors 'none'` — see docs/DEPLOYMENT.md (incl. nginx snippet) |

## Sharing model (per-pet)

A pet has one true owner (`pets.user_id`) plus members in `pet_shares`. Access to every
pet-scoped row is decided by **membership**, not authorship.

| Capability | viewer | editor | owner |
|---|:--:|:--:|:--:|
| Read pet + all records | ✅ | ✅ | ✅ |
| Add / edit / delete records | — | ✅ | ✅ |
| Edit the pet profile | — | ✅ | ✅ |
| Delete the pet | — | — | ✅ |
| Invite, change roles, revoke | — | — | ✅ |
| Leave the pet themselves | ✅ | ✅ | n/a |

- `user_id` on child tables means **author**, not owner. INSERT policies still pin it to
  `auth.uid()` so authorship cannot be forged; UPDATE/DELETE are governed by membership so an
  editor can correct the owner's records.
- Shares support `expires_at` — ideal for a pet sitter. Expiry revokes read *and* write instantly.
- **Care team is readable by collaborators** (migration 0013). If you hold a live share on any of
  my pets you can *read* my veterinarians and emergency contacts — otherwise a sitter opens the
  Emergency screen mid-crisis and finds it empty, which defeats the point of that screen. Writes
  stay owner-only, so a collaborator can never edit or delete them. Scope is "the owner's care
  team", not "vets linked to this pet", because poison control and the ER clinic matter whether
  or not they happen to be referenced by a record on that particular animal.
- **Not shared:** tags, notes/documents/reminders with no `pet_id`, and activity logs. These stay
  personal to each account.

### Why the helpers are SECURITY DEFINER
`can_access_pet()` / `is_pet_owner()` must bypass RLS: policies on `pets` consult `pet_shares` and
vice versa, so an RLS-respecting lookup would recurse infinitely. Both are read-only, take a pet
id the caller already holds, and return only a boolean.

`authenticated` **must** retain EXECUTE on them — RLS policy expressions evaluate as the calling
role, so revoking it breaks every pet-scoped policy. EXECUTE is revoked from `PUBLIC` and `anon`
(note: `revoke ... from anon` alone is a no-op, because Postgres grants new functions to PUBLIC).

Accepted advisor lint: `0029_authenticated_security_definer_function_executable` on
`can_access_pet`, `is_pet_owner`, `shares_pet_with`, `accept_pet_invitation` and `pet_members`.
All five are required by design and self-guarding — `accept_pet_invitation` validates
token/email/expiry, `pet_members` gates on `can_access_pet`, and the three predicates return only
a boolean about an id the caller already holds. There are **no** `anon` findings; verified by
active probe (every one of those RPCs 404s for `anon`, and every table returns `[]`).

### Vet-share links (no account required)
`pet_share_links` grants a read-only clinical snapshot to someone without an account. This does
**not** open RLS to `anon`: the table has no anon policy, and `vet_share_snapshot()` has EXECUTE
revoked from every role including `authenticated`. The only path in is the `vet-share` edge
function, which uses the service role and returns a fixed JSON shape for a validated token.
Tokens are unguessable v4 UUIDs, expire, are revocable, and record view count / last view.
Responses are `Cache-Control: no-store, private`. Failure modes all return 404 so a probe cannot
distinguish "revoked" from "never existed".

## Local-cache hygiene
- On sign-out (single device or global) the in-memory React Query cache is cleared **and** the
  localStorage-persisted query cache (`petcenza-query-cache`) is removed, so pet records don't
  linger on a shared device after logout (`AuthProvider.clearLocalCaches`).
- "Remember me" is enforced by a real storage adapter (`lib/supabase.ts`): opting out routes the
  session to `sessionStorage` (this tab only); opting in uses `localStorage`.

## Dependency posture (npm audit)
- Runtime (shipped) dependencies: `react-router-dom` is pinned to **7.18.x**, which patches the
  client-side open-redirect (GHSA-wrjc-x8rr-h8h6) present in ≤7.17 / all 6.x. The remaining
  advisory on 7.18 (GHSA-qwww-vcr4-c8h2) applies **only to React Server Components mode**, which
  this client-only SPA does not use — no exposure. Re-evaluate when a clean 8.x line stabilises.
- All other advisories are in **build-time dev tooling** (vite, vitest, esbuild, eslint,
  workbox-build) that never reaches a user's browser. Gate `npm audit --omit=dev` in CI.

## Known gaps before commercial launch
- Passkeys/WebAuthn; optional org-level MFA *enforcement* (per-user MFA is implemented)
- Server-side content scanning of uploads (e.g., magic-byte verification in an Edge Function)
- Formal pen test; dependency scanning in CI (`npm run audit:prod` gate is configured in docs/TESTING.md)
