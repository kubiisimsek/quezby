import type { AdminSuspectsQuery } from '@quezby/types';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useApi } from '@/lib/api';
import { keys } from '@/lib/query-keys';

export function useSuspects(query: AdminSuspectsQuery, { enabled = true }: { enabled?: boolean } = {}) {
  const api = useApi();
  return useQuery({ queryKey: keys.suspects(query), queryFn: () => api.suspects.list(query), placeholderData: keepPreviousData, enabled });
}
