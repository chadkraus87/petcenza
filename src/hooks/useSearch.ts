import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { SearchHit } from '@/types/db'

export function useGlobalSearch(q: string) {
  return useQuery({
    queryKey: ['search', q],
    queryFn: async (): Promise<SearchHit[]> => {
      const { data, error } = await supabase.rpc('global_search', { q })
      if (error) throw error
      return data
    },
    enabled: q.trim().length >= 2,
    staleTime: 10_000
  })
}
