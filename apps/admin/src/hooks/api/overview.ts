import { useQuery } from '@tanstack/react-query';

import { useApi } from '@/lib/api';
import { keys } from '@/lib/query-keys';

/** The front page's numbers, fresh every minute while it is open. */
export function useOverview() {
  const api = useApi();
  return useQuery({ queryKey: keys.overview, queryFn: () => api.overview.get(), refetchInterval: 60_000 });
}
