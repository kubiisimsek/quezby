import type { AdminContentQuery } from '@quezby/types';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useApi } from '@/lib/api';
import { keys } from '@/lib/query-keys';

export function useContent(query: AdminContentQuery) {
  const api = useApi();
  return useQuery({ queryKey: keys.content(query), queryFn: () => api.content.list(query), placeholderData: keepPreviousData });
}
