import { useEffect } from 'react';
import { AppState } from 'react-native';

import { checkDevice } from '@/auth/deviceCheck';
import { useSession } from '@/auth/session';
import { useDeviceVerdict } from '@/stores/deviceVerdict';

/** A verdict is asked for again this long before it runs out, so a run started then still has one. */
export const REFRESH_EARLY_MS = 10 * 60_000;

/** No two checks closer than this — after one failed on the way, or when the API's verdict is short-lived. */
export const RETRY_MS = 5 * 60_000;

/**
 * Keeps the API's verdict on this phone fresh for the signed-in player: on
 * launch, before it runs out, and when the app comes back to the front.
 * Mounted once, beside the navigator. Silent: a phone that cannot vouch for
 * itself, or a check that fails, only leaves the verdict unknown — and a
 * phone with no way to check is not asked again until the next launch.
 */
export function useDeviceCheck(): void {
  const token = useSession((state) => state.token);
  const userId = useSession((state) => state.user?.id ?? null);
  const hydrated = useDeviceVerdict((state) => state.hydrated);

  useEffect(() => {
    void useDeviceVerdict.getState().hydrate();
  }, []);

  useEffect(() => {
    if (!hydrated || !token || !userId) return;
    const player = userId;
    let active = true;
    let busy = false;
    let unsupported = false;
    let notBefore = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const wakeAt = (at: number) => {
      clearTimeout(timer);
      timer = setTimeout(() => void run(), Math.max(0, at - Date.now()));
    };

    async function run(): Promise<void> {
      if (!active || busy || unsupported) return;
      const now = Date.now();
      const due = Math.max(notBefore, refreshAt(player));
      if (due > now) {
        wakeAt(due);
        return;
      }
      busy = true;
      notBefore = now + RETRY_MS;
      const outcome = await checkDevice(player);
      busy = false;
      if (!active) return;
      if (outcome.kind === 'unsupported') {
        unsupported = true;
        return;
      }
      if (outcome.kind === 'checked') {
        useDeviceVerdict.getState().record(player, {
          verdict: outcome.verdict,
          validUntil: outcome.validUntil,
          enforced: outcome.enforced,
        });
      }
      void run();
    }

    void run();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void run();
    });
    return () => {
      active = false;
      clearTimeout(timer);
      subscription.remove();
    };
  }, [hydrated, token, userId]);
}

/** When this player's stored verdict wants asking again — 0 when there is none. */
function refreshAt(userId: string): number {
  const { userId: owner, validUntil } = useDeviceVerdict.getState();
  if (owner !== userId || !validUntil) return 0;
  const until = Date.parse(validUntil);
  return Number.isFinite(until) ? until - REFRESH_EARLY_MS : 0;
}
