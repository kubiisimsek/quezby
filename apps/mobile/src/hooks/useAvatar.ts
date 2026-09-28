import type { Me } from '@quezby/types';
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { api } from '@/api/client';
import { rememberMe } from '@/hooks/useMe';
import { squeeze, type CropRect } from '@/lib/avatar';

/** Every board, league and card that draws the player's own photo. */
function refreshPhoto(client: QueryClient, user: Me): void {
  rememberMe(user);
  for (const key of ['leaderboard', 'league', 'friends', 'search']) {
    void client.invalidateQueries({ queryKey: [key] });
  }
}

/** The framed square, squeezed to fit and sent; the API answers with the account and its new photo. */
export function useSaveAvatar() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ uri, rect }: { uri: string; rect: CropRect }) =>
      api.me.updateAvatar(await squeeze(uri, rect)),
    onSuccess: ({ user }) => refreshPhoto(client, user),
  });
}

/** No photo: the initials again. */
export function useRemoveAvatar() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.me.removeAvatar(),
    onSuccess: ({ user }) => refreshPhoto(client, user),
  });
}
