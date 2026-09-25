import type { AdminLoginRequest, AdminPasswordRequest } from '@quezby/types';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useApi } from '@/lib/api';
import { keys } from '@/lib/query-keys';
import { useSession } from '@/stores/session';

/**
 * Who is signed in, as the API sees it now — a role changed by an owner, or
 * an account switched off, reaches an open panel here.
 */
export function useMe() {
  const api = useApi();
  const update = useSession((state) => state.update);
  const query = useQuery({ queryKey: keys.me, queryFn: () => api.me.get(), staleTime: 60_000 });

  useEffect(() => {
    if (query.data) update(query.data.admin);
  }, [query.data, update]);

  return query;
}

export function useLogin() {
  const api = useApi();
  return useMutation({ mutationFn: (input: AdminLoginRequest) => api.auth.login(input) });
}

export function useChangePassword() {
  const api = useApi();
  return useMutation({ mutationFn: (input: AdminPasswordRequest) => api.me.changePassword(input) });
}
