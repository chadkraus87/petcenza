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

## Local-cache hygiene
- On sign-out (single device or global) the in-memory React Query cache is cleared **and** the
  localStorage-persisted query cache (`pawchart-query-cache`) is removed, so pet records don't
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
