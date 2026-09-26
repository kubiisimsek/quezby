import type { AdminAnalyticsQuery } from '@quezby/types';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useApi } from '@/lib/api';
import { keys } from '@/lib/query-keys';

/** How the game is used — the API keeps a minute-old copy, so asking every minute costs it nothing. */
export function useAnalytics(query: AdminAnalyticsQuery) {
  const api = useApi();
  return useQuery({
    queryKey: keys.analytics(query),
    queryFn: () => api.analytics.get(query),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}

/** One player's visits, days and firsts — asked for only while its tab is open. */
export function usePlayerActivity(id: string, { enabled = true }: { enabled?: boolean } = {}) {
  const api = useApi();
  return useQuery({ queryKey: keys.playerActivity(id), queryFn: () => api.players.activity(id), enabled });
}
