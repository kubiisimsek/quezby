import type { AnalyticsEvent, AnalyticsScreen } from '@quezby/types';

import { screenOf } from '@/analytics/screens';
import { noteEvent, seeScreen } from '@/analytics/visit';
import { useSettings } from '@/stores/settings';
import { useVisits } from '@/stores/visits';

let onScreen: AnalyticsScreen | null = null;

/**
 * Whether anything is recorded right now: the player said yes, the visits
 * have been read back, and the API has not asked for a pause.
 */
export function recording(now = Date.now()): boolean {
  const visits = useVisits.getState();
  return useSettings.getState().analytics && visits.hydrated && now >= visits.pausedUntil;
}

/**
 * A moment worth counting (`@quezby/config` › ANALYTICS_EVENTS). Only the
 * visit on this phone changes — nothing goes over the network here — and
 * nothing at all without the player's yes.
 */
export function track(event: AnalyticsEvent): void {
  if (!recording()) return;
  useVisits.getState().update((visit) => noteEvent(visit, event, Date.now()));
}

/** The navigator shows a route. Remembered always, recorded only with the player's yes. */
export function trackScreen(route: string | undefined): void {
  const screen = screenOf(route);
  if (!screen) return;
  onScreen = screen;
  if (!recording()) return;
  useVisits.getState().update((visit) => seeScreen(visit, screen, Date.now()));
}

/** The screen on show, for a visit that begins on it. */
export function currentScreen(): AnalyticsScreen | null {
  return onScreen;
}
