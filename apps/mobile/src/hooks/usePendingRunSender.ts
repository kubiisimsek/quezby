import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { usePendingRun } from '@/stores/pendingRun';

/**
 * Sends the finish kept on the phone, once. It is cleared when the API took
 * it, or said no (finished, expired, rejected — a 4xx but 429): nothing is
 * left to send then. True unless the network is still out.
 */
export async function sendPendingRun(): Promise<boolean> {
  const pending = usePendingRun.getState().run;
  if (!pending) return true;
  const { runId, savedAt: _savedAt, ...request } = pending;
  try {
    await api.runs.finish(runId, request);
    usePendingRun.getState().clear();
    return true;
  } catch (error: unknown) {
    const status = (error as { status?: number }).status ?? 0;
    if (status >= 400 && status < 500 && status !== 429) {
      usePendingRun.getState().clear();
      return true;
    }
    return false;
  }
}

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
    void sendPendingRun().then((sent) => {
      if (!cancelled && sent) void queryClient.invalidateQueries();
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, pending, queryClient, token]);
}
