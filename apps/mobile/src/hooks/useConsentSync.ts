import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { rememberMe } from '@/hooks/useMe';
import { useSettings } from '@/stores/settings';

/**
 * Takes the player's answer to usage analytics — given on this phone,
 * perhaps before there was an account — to the account, and tries again on
 * the next return to the app when the network was not there. Until the
 * account has it, nothing is sent and `/me` does not overwrite it.
 */
export function useConsentSync(): void {
  const token = useSession((state) => state.token);
  const userId = useSession((state) => state.user?.id ?? null);
  const consent = useSettings((state) => state.consent);
  const analytics = useSettings((state) => state.analytics);
  const hydrated = useSettings((state) => state.hydrated);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setAttempt((count) => count + 1);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!hydrated || !token || !userId || consent !== 'pending') return;
    let cancelled = false;
    api.me
      .updateSettings({ analytics })
      .then(({ settings }) => {
        const now = useSettings.getState();
        // A newer answer is on its way: this one no longer counts.
        if (cancelled || now.consent !== 'pending' || now.analytics !== analytics) return;
        now.synced(settings.analytics);
        const user = useSession.getState().user;
        if (user) rememberMe({ ...user, settings });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [analytics, attempt, consent, hydrated, token, userId]);
}
