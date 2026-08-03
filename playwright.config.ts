import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests for the public (unauthenticated) surface. These run against the Vite dev
 * server with placeholder Supabase env — they don't require a live backend, so they exercise
 * routing, the auth pages, and the offline/PWA shell. Add authenticated specs once a test
 * Supabase project + seeded user are available (see docs/TESTING.md).
 *
 * Run: npm run test:e2e  (first time: npx playwright install chromium)
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5178',
    trace: 'on-first-retry'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- --port 5178',
    url: 'http://localhost:5178',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      VITE_SUPABASE_URL: 'https://demo.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e2e-placeholder.signature'
    }
  }
})
