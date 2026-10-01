import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { APP_PLATFORM } from '@/config/env';
import { refreshSocial } from '@/hooks/useSocial';
import { logAppError } from '@/lib/appLog';
import {
  askPushPermission,
  dropPushToken,
  onPushOpened,
  onPushToken,
  onPushWhileOpen,
  pushPermission,
  pushToken,
  type PushPermission,
} from '@/lib/push';
import { usePush } from '@/stores/push';

/** How long a notification stays over the game before it slips away. */
const NOTICE_MS = 4_500;

/**
 * Keeps the API holding this phone's token for the signed-in account: at
 * sign-in, whenever Firebase hands out a new one, and when the player comes
 * back from the phone's settings with notifications turned on. Nothing is
 * asked of the player here: the phone's question comes only from a tap —
 * the onboarding step, a `PushNudge` or Ayarlar → Bildirimler (`allowPush`).
 */
export function usePushRegistration(): void {
  const token = useSession((state) => state.token);
  const userId = useSession((state) => state.user?.id ?? null);
  const permission = usePush((state) => state.permission);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    void usePush.getState().hydrate();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setAttempt((count) => count + 1);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    void refreshPushPermission();
  }, [attempt, userId]);

  useEffect(() => {
    if (!token || !userId || permission !== 'granted') return;
    let cancelled = false;
    const register = async (fcm: string | null) => {
      if (!fcm || cancelled) return;
      await api.me.registerPushToken({ token: fcm, platform: APP_PLATFORM });
      if (!cancelled) usePush.getState().setToken(fcm);
    };
    // The API logs its own refusals; a request that never got there is kept by the API client.
    const failed = (error: unknown) => logAppError('push.register', error);
    void pushToken().then(register).catch(failed);
    const stop = onPushToken((fcm) => void register(fcm).catch(failed));
    return () => {
      cancelled = true;
      stop();
    };
  }, [permission, token, userId]);
}

/**
 * Where the phone stands now, as the game shows it: an Android question
 * turned down for good counts as `denied`, though Android only says so when
 * asked.
 */
export async function refreshPushPermission(): Promise<PushPermission> {
  await usePush.getState().hydrate();
  const store = usePush.getState();
  const now = await pushPermission();
  if (now === 'granted') store.setAndroidBlocked(false);
  const shown = now === 'undetermined' && store.androidBlocked ? 'denied' : now;
  store.setPermission(shown);
  return shown;
}

/** The system's question; a yes registers the phone at once (`usePushRegistration`). */
export async function allowPush(): Promise<PushPermission> {
  const answer = await askPushPermission();
  const store = usePush.getState();
  if (Platform.OS === 'android' && answer !== 'unavailable') store.setAndroidBlocked(answer === 'denied');
  store.setPermission(answer);
  return answer;
}

/**
 * "Bildirimleri aç" wherever they are off: the system's question while it
 * can still come, the phone's settings once it cannot — coming back from
 * there, the registration looks again.
 */
export function turnOnPush(permission: PushPermission | null): void {
  if (permission === 'denied') {
    void Linking.openSettings();
    return;
  }
  void allowPush();
}

/**
 * Before signing out: the API forgets this phone's token for the account,
 * and the token itself is thrown away — whichever of the two gets there, the
 * phone stops getting the account's news. Called while the session still
 * holds its token, so the call carries it.
 */
export function forgetPush(): void {
  const fcm = usePush.getState().token;
  if (fcm) void api.me.unregisterPushToken(fcm).catch(() => undefined);
  usePush.getState().setToken(null);
  void dropPushToken();
}

/**
 * What arrives while the game is open: shown over it for a moment, and the
 * inbox asked again at once. A tap on a notification — the one that opened
 * the app, or any later one — waits in the store until the game can open it.
 */
export function usePushEvents(): void {
  const client = useQueryClient();

  useEffect(() => {
    const stopOpen = onPushWhileOpen((notice) => {
      usePush.getState().show(notice);
      refreshSocial(client, notice.data?.username);
    });
    const stopTap = onPushOpened((data) => {
      usePush.getState().open(data);
      refreshSocial(client, data.username);
    });
    return () => {
      stopOpen();
      stopTap();
    };
  }, [client]);

  const notice = usePush((state) => state.notice);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => usePush.getState().hide(), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);
}
