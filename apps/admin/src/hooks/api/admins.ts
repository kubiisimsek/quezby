import type { AdminCreateRequest, AdminUpdateRequest } from '@quezby/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApi } from '@/lib/api';
import { keys } from '@/lib/query-keys';

export function useAdmins() {
  const api = useApi();
  return useQuery({ queryKey: keys.admins, queryFn: () => api.admins.list() });
}

/** Add, change and re-key the panel's accounts; each refreshes the list and the log. */
export function useAdminActions() {
  const api = useApi();
  const queryClient = useQueryClient();
  const onSuccess = () =>
    Promise.all([queryClient.invalidateQueries({ queryKey: keys.admins }), queryClient.invalidateQueries({ queryKey: ['audit'] })]);

  return {
    create: useMutation({ mutationFn: (input: AdminCreateRequest) => api.admins.create(input), onSuccess }),
    update: useMutation({ mutationFn: ({ id, changes }: { id: string; changes: AdminUpdateRequest }) => api.admins.update(id, changes), onSuccess }),
    resetPassword: useMutation({ mutationFn: (id: string) => api.admins.resetPassword(id), onSuccess }),
  };
}
