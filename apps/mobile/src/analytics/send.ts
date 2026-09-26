import { ANALYTICS } from '@quezby/config';

import { ownerOf } from '@/analytics/visit';
import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { APP_PLATFORM } from '@/config/env';
import { useSettings } from '@/stores/settings';
import { useVisits } from '@/stores/visits';

let sending: Promise<void> | null = null;

/**
 * Sends the finished visits of the signed-in account — and those from
 * before it signed in — ten at a time, once the account has the player's
 * yes. Another account's visits are never sent. The API took them: they
 * go. It will keep nothing for now (`record: false`): nothing is recorded
 * for a day. The network or the API failed: they wait a minute. Refused
 * outright: they go, as they would never pass.
 */
export function sendVisits(): Promise<void> {
  sending ??= send().finally(() => {
    sending = null;
  });
  return sending;
}

async function send(): Promise<void> {
  for (;;) {
    const visits = useVisits.getState();
    const token = useSession.getState().token;
    const { analytics, consent } = useSettings.getState();
    const now = Date.now();
    if (!visits.hydrated || !token || !analytics || consent !== 'synced') return;
    if (now < visits.nextTryAt || now < visits.pausedUntil) return;

    const owner = ownerOf(token);
    const others = visits.outbox.filter((closed) => closed.owner !== null && closed.owner !== owner);
    if (others.length > 0) visits.drop(others.map((closed) => closed.visit.id));
    const batch = useVisits.getState().outbox.slice(0, ANALYTICS.visitsPerBatch);
    if (batch.length === 0) return;

    try {
      const { record } = await api.analytics.send({
        // Stamped as it leaves: the API reads the phone's clock off it.
        sentAt: new Date().toISOString(),
        platform: APP_PLATFORM,
        visits: batch.map((closed) => closed.visit),
      });
      useVisits.getState().drop(batch.map((closed) => closed.visit.id));
      if (!record) {
        useVisits.getState().pause(Date.now() + ANALYTICS.pauseMs);
        return;
      }
    } catch (error) {
      const status = (error as { status?: number }).status ?? 0;
      if (status >= 400 && status < 500 && status !== 429) {
        useVisits.getState().drop(batch.map((closed) => closed.visit.id));
      } else {
        useVisits.getState().retryAt(Date.now() + ANALYTICS.retryAfterMs);
      }
      return;
    }
  }
}
