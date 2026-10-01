import { ApiError } from '@quezby/sdk';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { hydrateAppLogs, logAppError, onAppLog, sendAppLogs } from '@/lib/appLog';

/** A moment for more lines to gather before they go. */
export const GATHER_MS = 3_000;

let watcher: ((error: unknown, isFatal?: boolean) => void) | null = null;

/**
 * A crash is a line of the Loglar page too: kept before React Native's own
 * handler takes the app down, sent at the next launch.
 */
export function watchCrashes(): void {
  const previous = ErrorUtils.getGlobalHandler();
  if (watcher !== null && previous === watcher) return;
  watcher = (error: unknown, isFatal?: boolean) => {
    const stack = error instanceof Error && error.stack ? error.stack.split('\n').slice(0, 6).join('\n') : null;
    logAppError('crash', error, { fatal: isFatal === true, stack });
    previous(error, isFatal);
  };
  ErrorUtils.setGlobalHandler(watcher);
}

/** An answer of 400 or more (but a 429) means the API will never take these lines. */
function keep(error: unknown): boolean {
  return !(error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 429);
}

/**
 * Sends the lines the phone kept (`lib/appLog`) once a player is signed in:
 * at launch, coming back to the app, and a moment after a new one.
 */
export function useAppLogs(gatherMs = GATHER_MS): void {
  const token = useSession((state) => state.token);

  useEffect(() => {
    watchCrashes();
    void hydrateAppLogs();
  }, []);

  useEffect(() => {
    if (!token) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const send = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      void hydrateAppLogs()
        .then(() => sendAppLogs((entries) => api.me.sendLogs({ entries }), keep))
        .catch(() => undefined);
    };
    send();
    const stopLog = onAppLog(() => {
      if (!timer) timer = setTimeout(send, gatherMs);
    });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') send();
    });
    return () => {
      if (timer) clearTimeout(timer);
      stopLog();
      subscription.remove();
    };
  }, [token, gatherMs]);
}
