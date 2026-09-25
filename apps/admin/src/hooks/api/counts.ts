import { useQuery } from '@tanstack/react-query';

import { useApi } from '@/lib/api';
import { keys } from '@/lib/query-keys';

/** What the sidebar's badges count — held runs, every minute. */
export function useCounts() {
  const api = useApi();
  return useQuery({
    queryKey: keys.counts,
    queryFn: () => api.overview.counts(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
