import { QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

// Offline-first reads: query cache persists to localStorage; the service worker additionally
// caches Supabase REST GETs. Mutations queue while offline via the outbox (lib/outbox.ts).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24 * 7,
      retry: 2,
      networkMode: 'offlineFirst'
    },
    mutations: { networkMode: 'offlineFirst' }
  }
})

export const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'petcenza-query-cache'
})
