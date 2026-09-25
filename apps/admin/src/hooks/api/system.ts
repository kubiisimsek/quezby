import type { AdminSystemAction } from '@quezby/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApi } from '@/lib/api';
import { keys } from '@/lib/query-keys';

export function useSystem() {
  const api = useApi();
  return useQuery({ queryKey: keys.system, queryFn: () => api.system.get() });
}

/** Runs a chore; what it changed shows everywhere. */
export function useSystemAction() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: AdminSystemAction) => api.system.run(action),
    onSettled: () =>
      Promise.all(['system', 'audit', 'overview', 'runs', 'counts'].map((resource) => queryClient.invalidateQueries({ queryKey: [resource] }))),
  });
}
