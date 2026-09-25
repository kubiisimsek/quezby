import type { AdminLeaguesQuery } from '@quezby/types';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useApi } from '@/lib/api';
import { keys } from '@/lib/query-keys';

export function useLeagues(query: AdminLeaguesQuery) {
  const api = useApi();
  return useQuery({ queryKey: keys.leagues(query), queryFn: () => api.leagues.list(query), placeholderData: keepPreviousData });
}

export function useLeagueGroup(id: number) {
  const api = useApi();
  return useQuery({ queryKey: keys.league(id), queryFn: () => api.leagues.group(id), enabled: Number.isFinite(id) });
}
