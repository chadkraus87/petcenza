import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt' rather than 'autoUpdate': with autoUpdate an open tab keeps serving the old
      // precache until it happens to reload, so a deploy looks like it silently didn't ship.
      // Prompting also avoids swapping content out from under someone mid-edit — this app holds
      // medical records, so a surprise refresh is worse than a visible "Update" button.
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'PetCenza — Pet Health & Care',
        short_name: 'PetCenza',
        description: 'Every record, reminder, and vet visit for your pets in one place.',
        theme_color: '#22382F',
        background_color: '#F6F7F4',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Read-through cache for Supabase REST GETs so views render offline.
            urlPattern: ({ url, request }) =>
              url.pathname.startsWith('/rest/v1/') && request.method === 'GET',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-rest',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 14 }
            }
          },
          {
            urlPattern: ({ url }) => url.pathname.includes('/storage/v1/object/'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'supabase-storage', expiration: { maxEntries: 200 } }
          }
        ]
      }
    })
  ],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: { charts: ['recharts'], vendor: ['react', 'react-dom', 'react-router-dom'] }
      }
    }
  },
  // Vitest runs unit/component tests only; Playwright E2E specs live under tests/e2e.
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    exclude: ['tests/e2e/**', '**/node_modules/**', '**/dist/**']
  }
})
