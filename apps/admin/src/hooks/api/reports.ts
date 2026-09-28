import type { AdminReportsQuery } from '@quezby/types';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useApi } from '@/lib/api';
import { keys } from '@/lib/query-keys';

/** What players reported about each other's photos and names, a row per reported player. */
export function useReports(query: AdminReportsQuery) {
  const api = useApi();
  return useQuery({ queryKey: keys.reports(query), queryFn: () => api.reports.list(query), placeholderData: keepPreviousData });
}
