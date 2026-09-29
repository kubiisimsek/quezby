import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { refreshInbox } from '@/hooks/useSocial';
import { useCurrentRoute } from '@/stores/route';

/** How often the pulse is asked on the friends' screens: a line or a VS shows within seconds. */
export const PULSE_NEAR_MS = 3_000;

/** …and anywhere else in the game, for the badges and the lobby's VS notices. */
export const PULSE_FAR_MS = 10_000;

/** Where the inbox, a friend list or the bell's list is what the player is looking at. */
const NEAR = new Set(['Inbox', 'Thread', 'FindFriends', 'Friends', 'Alerts']);

/**
 * The inbox's heartbeat. While the game is open, and not mid-run, it asks
 * the API for one number (`GET /me/pulse`) — every 3 s on the friends'
 * screens, every 10 s elsewhere — and when it moved, asks again for what
 * shows the inbox (`refreshInbox`). Nothing is asked in the background (the
 * query client follows the app's state); a notification asks at once.
 */
export function usePulse(active: boolean): void {
  const client = useQueryClient();
  const userId = useSession((state) => state.user?.id ?? null);
  const route = useCurrentRoute((state) => state.name);
  const seen = useRef<{ userId: string; stamp: number } | null>(null);
  const pulse = useQuery({
    queryKey: ['pulse', userId],
    queryFn: () => api.me.pulse(),
    enabled: active && userId !== null && route !== 'Game',
    refetchInterval: route !== null && NEAR.has(route) ? PULSE_NEAR_MS : PULSE_FAR_MS,
    staleTime: 0,
    retry: false,
  });
  const stamp = pulse.data?.stamp;

  useEffect(() => {
    if (stamp === undefined || userId === null) return;
    const before = seen.current;
    seen.current = { userId, stamp };
    // The first answer only sets where it stands: the screens asked for themselves as they opened.
    if (before?.userId === userId && before.stamp !== stamp) {
      refreshInbox(client, useCurrentRoute.getState());
    }
  }, [client, stamp, userId]);
}
