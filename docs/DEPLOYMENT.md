# Deployment

Recommended: Vercel (static) + Supabase (managed).

1. `npm run build` → deploy `dist/`.
2. Set env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` in the host.
3. **Security headers are now committed as config** — no manual step:
   - **Vercel** reads [`vercel.json`](../vercel.json) at the repo root.
   - **Netlify / Cloudflare Pages** read [`public/_headers`](../public/_headers) (copied to `dist/_headers` at build).
   - Both set: full CSP (incl. `frame-ancestors 'none'` — header-only, can't be set via `<meta>`),
     HSTS (2-year, preload), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
     `Referrer-Policy`, `Permissions-Policy`, and `Cross-Origin-Opener-Policy`.
   - **nginx** self-host equivalent:
     ```nginx
     add_header Content-Security-Policy "default-src 'self'; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; style-src 'self' 'unsafe-inline'; script-src 'self'; worker-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" always;
     add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
     add_header X-Content-Type-Options "nosniff" always;
     add_header X-Frame-Options "DENY" always;
     add_header Referrer-Policy "strict-origin-when-cross-origin" always;
     add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;
     ```
   - After deploy, verify with `curl -sI https://your-domain | grep -i -E 'content-security|strict-transport|x-content-type'` or securityheaders.com (target: A+).
4. Supabase: enable point-in-time recovery (backups), set Auth redirect URLs to the production domain (`/auth/callback`, `/auth/reset`), enable MFA (TOTP) under Authentication, restrict CORS if using edge functions.
5. PWA updates ship automatically (`registerType: autoUpdate`).
