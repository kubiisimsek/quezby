import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { usePendingRun } from '@/stores/pendingRun';

/**
 * Sends a run that ended while the network was down, once the app is back
 * with a signed-in player. The API still holds the run open for a while, so
 * the score is not lost to a dropped connection.
 */
export function usePendingRunSender(): void {
  const token = useSession((state) => state.token);
  const pending = usePendingRun((state) => state.run);
  const hydrated = usePendingRun((state) => state.hydrated);
  const queryClient = useQueryClient();

  useEffect(() => {
    void usePendingRun.getState().hydrate();
  }, []);

  useEffect(() => {
    if (!hydrated || !token || !pending) return;
    let cancelled = false;
    const { runId, savedAt: _savedAt, ...request } = pending;
    api.runs
      .finish(runId, request)
      .then(() => {
        if (cancelled) return;
        usePendingRun.getState().clear();
        void queryClient.invalidateQueries();
      })
      .catch((error: unknown) => {
        const status = (error as { status?: number }).status ?? 0;
        // The API answered and said no (finished, expired, rejected): nothing left to send.
        if (!cancelled && status >= 400 && status < 500 && status !== 429) {
          usePendingRun.getState().clear();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, pending, queryClient, token]);
}
