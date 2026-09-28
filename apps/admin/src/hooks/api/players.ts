import type { AdminDeletePlayerRequest, AdminPlayersQuery } from '@quezby/types';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { afterModeration } from '@/hooks/api/invalidate';
import { useApi } from '@/lib/api';
import { keys } from '@/lib/query-keys';

export function usePlayers(query: AdminPlayersQuery) {
  const api = useApi();
  return useQuery({ queryKey: keys.players(query), queryFn: () => api.players.list(query), placeholderData: keepPreviousData });
}

export function usePlayer(id: string) {
  const api = useApi();
  return useQuery({ queryKey: keys.player(id), queryFn: () => api.players.get(id) });
}

/**
 * Ban, unban, rename, sign out, take a photo down, let reports go and
 * delete — every one refreshes what it touched.
 */
export function usePlayerActions(id: string) {
  const api = useApi();
  const queryClient = useQueryClient();
  const onSuccess = () => afterModeration(queryClient);

  return {
    ban: useMutation({ mutationFn: (reason: string) => api.players.ban(id, { reason }), onSuccess }),
    unban: useMutation({ mutationFn: () => api.players.unban(id), onSuccess }),
    rename: useMutation({ mutationFn: (reason: string) => api.players.rename(id, { reason }), onSuccess }),
    signOut: useMutation({ mutationFn: () => api.players.signOut(id), onSuccess }),
    removeAvatar: useMutation({ mutationFn: (reason: string) => api.players.removeAvatar(id, { reason }), onSuccess }),
    dismissReports: useMutation({ mutationFn: (reason: string) => api.players.dismissReports(id, { reason }), onSuccess }),
    remove: useMutation({
      mutationFn: (input: AdminDeletePlayerRequest) => api.players.remove(id, input),
      onSuccess: () => {
        queryClient.removeQueries({ queryKey: keys.player(id) });
        return afterModeration(queryClient);
      },
    }),
  };
}
