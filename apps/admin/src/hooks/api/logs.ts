import type { AdminLogRange, AdminLogsQuery } from '@quezby/types';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useApi } from '@/lib/api';
import { keys } from '@/lib/query-keys';

export function useLogs(query: AdminLogsQuery) {
  const api = useApi();
  return useQuery({ queryKey: keys.logs(query), queryFn: () => api.logs.list(query), placeholderData: keepPreviousData });
}

export function useLogSummary(range: AdminLogRange) {
  const api = useApi();
  return useQuery({ queryKey: keys.logSummary(range), queryFn: () => api.logs.summary(range), placeholderData: keepPreviousData });
}
