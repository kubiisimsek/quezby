import type { AdminRunsQuery } from '@quezby/types';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { afterModeration } from '@/hooks/api/invalidate';
import { useApi } from '@/lib/api';
import { keys } from '@/lib/query-keys';

export function useRuns(query: AdminRunsQuery, { enabled = true }: { enabled?: boolean } = {}) {
  const api = useApi();
  return useQuery({ queryKey: keys.runs(query), queryFn: () => api.runs.list(query), placeholderData: keepPreviousData, enabled });
}

export function useRun(id: string) {
  const api = useApi();
  return useQuery({ queryKey: keys.run(id), queryFn: () => api.runs.get(id) });
}

/** The review queue's two answers; both refresh every list the run was on. */
export function useRunActions(id: string) {
  const api = useApi();
  const queryClient = useQueryClient();
  const onSuccess = () => afterModeration(queryClient);

  return {
    approve: useMutation({ mutationFn: () => api.runs.approve(id), onSuccess }),
    reject: useMutation({ mutationFn: (reason: string) => api.runs.reject(id, { reason }), onSuccess }),
  };
}
