import { useEffect } from 'react';
import { AppState } from 'react-native';

import { sendVisits } from '@/analytics/send';
import { currentScreen, recording } from '@/analytics/track';
import { openVisit, ownerOf, pauseVisit, resumeVisit, seeScreen } from '@/analytics/visit';
import { useSession } from '@/auth/session';
import { APP_VERSION } from '@/config/env';
import { useSettings } from '@/stores/settings';
import { useVisits } from '@/stores/visits';

/** While the app is in front, the open visit notes it is still going this often — on the phone only. */
export const HEARTBEAT_MS = 60_000;

/**
 * Records the player's visits — only after their yes — and sends each one
 * as the app goes to the background. A visit is one stretch in the
 * foreground: it pauses while a call or the switcher covers the app, ends
 * when the app leaves, and belongs to the account signed in when it began.
 * Mounted once, beside the navigator.
 */
export function useAnalytics(): void {
  const token = useSession((state) => state.token);
  const analytics = useSettings((state) => state.analytics);
  const consent = useSettings((state) => state.consent);
  const settingsRead = useSettings((state) => state.hydrated);
  const visitsRead = useVisits((state) => state.hydrated);
  const ready = settingsRead && visitsRead;

  useEffect(() => {
    void useVisits.getState().hydrate();
  }, []);

  // A yes starts a visit; a no ends everything; a new account starts its own visit.
  useEffect(() => {
    if (!ready) return;
    const visits = useVisits.getState();
    if (!analytics) {
      visits.forget();
      return;
    }
    const owner = ownerOf(token);
    if (visits.current && visits.current.owner !== owner && visits.current.owner !== null) {
      visits.finish(Date.now());
    }
    begin(owner);
  }, [analytics, ready, token]);

  // Whatever waits goes as soon as it may.
  useEffect(() => {
    if (!ready || !token || !analytics || consent !== 'synced') return;
    if (useVisits.getState().outbox.length > 0) void sendVisits();
  }, [analytics, consent, ready, token]);

  useEffect(() => {
    if (!ready) return;
    const subscription = AppState.addEventListener('change', (state) => {
      const visits = useVisits.getState();
      const now = Date.now();
      if (state === 'active') {
        if (visits.current) visits.update((visit) => resumeVisit(visit, now));
        else begin(ownerOf(useSession.getState().token));
        void sendVisits();
      } else if (state === 'inactive') {
        visits.update((visit) => pauseVisit(visit, now));
        visits.save();
      } else if (state === 'background') {
        visits.finish(now);
        void sendVisits();
      }
    });
    const heartbeat = setInterval(() => {
      useVisits.getState().update((visit) => (visit.activeSince === null ? visit : { ...visit, touchedAt: Date.now() }));
    }, HEARTBEAT_MS);
    return () => {
      subscription.remove();
      clearInterval(heartbeat);
    };
  }, [ready]);
}

/** A new visit, on the screen already on show — when recording, and none is open. */
function begin(owner: string | null): void {
  const visits = useVisits.getState();
  const now = Date.now();
  if (visits.current || !recording(now)) return;
  const visit = openVisit(now, owner, APP_VERSION);
  const screen = currentScreen();
  visits.begin(screen ? seeScreen(visit, screen, now) : visit);
}
