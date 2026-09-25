import type { AdminBoardKeysQuery, AdminBoardQuery } from '@quezby/types';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useApi } from '@/lib/api';
import { keys } from '@/lib/query-keys';

export function useBoard(query: AdminBoardQuery, { enabled = true }: { enabled?: boolean } = {}) {
  const api = useApi();
  return useQuery({ queryKey: keys.boards(query), queryFn: () => api.boards.get(query), placeholderData: keepPreviousData, enabled });
}

export function useBoardKeys(query: AdminBoardKeysQuery) {
  const api = useApi();
  return useQuery({ queryKey: keys.boardKeys(query), queryFn: () => api.boards.keys(query) });
}
