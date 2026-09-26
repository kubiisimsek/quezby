import type { Me, MeResponse, Ranks } from '@quezby/types';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { api } from '@/api/client';
import { queryClient } from '@/api/queryClient';
import { useSession } from '@/auth/session';
import { useSettings } from '@/stores/settings';

const meKey = (token: string | null) => ['me', token] as const;

/** The newest `/me` answer already copied into the session. */
let appliedAt = 0;

/**
 * Who the API says the player is. The session mirrors the answer so every
 * screen reads one `user`, and the account's settings win over the phone's —
 * but only for an answer newer than the last one applied: a screen mounting
 * later must not copy an old cached answer over a fresher session — and never
 * over an answer to usage analytics still on its way (`fromAccount`).
 */
export function useMe() {
  const token = useSession((state) => state.token);
  const query = useQuery({
    queryKey: meKey(token),
    queryFn: () => api.me.get(),
    enabled: Boolean(token),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!query.data || query.dataUpdatedAt <= appliedAt) return;
    appliedAt = query.dataUpdatedAt;
    useSession.getState().setMe(query.data.user, query.data.ranks);
    useSettings.getState().fromAccount(query.data.user.settings);
  }, [query.data, query.dataUpdatedAt]);

  return query;
}

/**
 * What a mutation learned about the player — a new name, a kept account, a
 * best run — written to the session and to the `/me` cache at once, so no
 * reader is left holding the old answer.
 */
export function rememberMe(user: Me, ranks?: Ranks | null): void {
  const session = useSession.getState();
  session.setMe(user, ranks);
  const next = useSession.getState();
  queryClient.setQueryData<MeResponse>(meKey(next.token), {
    user,
    ranks: next.ranks ?? { daily: null, weekly: null, monthly: null, all: null },
  });
  appliedAt = queryClient.getQueryState(meKey(next.token))?.dataUpdatedAt ?? appliedAt;
}
