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

/**
 * Queries whose cached value is a short-lived storage capability rather than data.
 *
 * These hold Supabase signed URLs, which grant read access to a private photo or document for one
 * hour without any auth. Persisting them is wrong twice over: the cache lives for seven days, so
 * a rehydrated entry renders as broken images until the refetch lands, and it writes access
 * tokens to localStorage for no benefit — they're expired long before the cache is.
 */
const EPHEMERAL_QUERY_KEYS = new Set(['primary_photos', 'pet_photos', 'documents'])

export const dehydrateOptions = {
  shouldDehydrateQuery: (query: { queryKey: readonly unknown[]; state: { status: string } }) =>
    query.state.status === 'success' && !EPHEMERAL_QUERY_KEYS.has(String(query.queryKey[0]))
}
