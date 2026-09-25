import type { AdminAuditQuery } from '@quezby/types';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useApi } from '@/lib/api';
import { keys } from '@/lib/query-keys';

export function useAudit(query: AdminAuditQuery) {
  const api = useApi();
  return useQuery({ queryKey: keys.audit(query), queryFn: () => api.audit.list(query), placeholderData: keepPreviousData });
}
