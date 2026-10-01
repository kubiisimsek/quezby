import { getApps } from '@react-native-firebase/app';
import {
  AuthorizationStatus,
  deleteToken,
  getInitialNotification,
  getMessaging,
  getToken,
  hasPermission,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  requestPermission,
  setAutoInitEnabled,
  type Messaging,
  type RemoteMessage,
} from '@react-native-firebase/messaging';
import type { PushData } from '@quezby/types';
import { PermissionsAndroid, Platform } from 'react-native';

import { logApp, logAppError } from '@/lib/appLog';

/**
 * Push notifications through Firebase Cloud Messaging — the only thing the
 * app uses Firebase for. A build without Firebase's files
 * (`GoogleService-Info.plist`, `google-services.json`) has no Firebase app:
 * then everything here answers "unavailable" and does nothing, the way
 * `integrity.ts` does without its module. The words of a notification are
 * the API's, in the player's language; the phone only asks for permission,
 * hands the API its token and opens what a tap names.
 */

/** Where the phone stands on notifications for this app. */
export type PushPermission =
  /** No Firebase in this build, or a phone without push. */
  | 'unavailable'
  /** Not asked yet — or, on Android, turned down once: the question can still come. */
  | 'undetermined'
  | 'granted'
  /** Turned down for good — only the phone's settings can turn them on now. */
  | 'denied';

/** A notification as the game shows it while it is open, and what a tap opens. */
export type PushNotice = { title: string; body: string; data: PushData | null };

function messaging(): Messaging | null {
  try {
    if (getApps().length > 0) return getMessaging();
    logApp('warning', 'push.unavailable', 'No Firebase app in this build (GoogleService-Info.plist / google-services.json missing).');
    return null;
  } catch (error) {
    logAppError('push.unavailable', error);
    return null;
  }
}

export function pushAvailable(): boolean {
  return messaging() !== null;
}

/** Android 13 asks for notifications like any other permission; older versions never ask. */
const ANDROID_ASKS = Platform.OS === 'android' && Number(Platform.Version) >= 33;

function fromStatus(status: number): PushPermission {
  switch (status) {
    case AuthorizationStatus.AUTHORIZED:
    case AuthorizationStatus.PROVISIONAL:
    case AuthorizationStatus.EPHEMERAL:
      return 'granted';
    case AuthorizationStatus.DENIED:
      return 'denied';
    default:
      return 'undetermined';
  }
}

export async function pushPermission(): Promise<PushPermission> {
  const instance = messaging();
  if (!instance) return 'unavailable';
  try {
    if (ANDROID_ASKS) {
      // Android does not tell a no from never asked; asking is how to find
      // out (`askPushPermission`), and the store remembers a "never again".
      const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      return granted ? 'granted' : 'undetermined';
    }
    return fromStatus(await hasPermission(instance));
  } catch (error) {
    logAppError('push.permission', error, { asked: false });
    return 'unavailable';
  }
}

/** Android 13's answer: a first no leaves the question open, "don't ask again" closes it. */
export function fromAndroidAnswer(answer: string): PushPermission {
  if (answer === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
  return answer === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'denied' : 'undetermined';
}

/**
 * The system's question. iOS asks once; after a no only the phone's settings
 * can change it (`denied`). Android 13 asks up to twice: a first no leaves the
 * question open (`undetermined`), "don't ask again" closes it (`denied`).
 */
export async function askPushPermission(): Promise<PushPermission> {
  const instance = messaging();
  if (!instance) return 'unavailable';
  try {
    if (ANDROID_ASKS) {
      return fromAndroidAnswer(
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS),
      );
    }
    return fromStatus(await requestPermission(instance));
  } catch (error) {
    logAppError('push.permission', error, { asked: true });
    return 'unavailable';
  }
}

/**
 * This phone's FCM token — null when there is no Firebase or no permission.
 * Firebase makes none on its own (`messaging_auto_init_enabled` is off in
 * firebase.json): nothing reaches it before the player said yes.
 */
export async function pushToken(): Promise<string | null> {
  const instance = messaging();
  if (!instance) return null;
  try {
    await setAutoInitEnabled(instance, true);
    return await getToken(instance);
  } catch (error) {
    // The one place a phone can fail to take pushes without anyone knowing: the API never hears of it.
    logAppError('push.token', error);
    return null;
  }
}

/** Throws the token away: an account signing out stops getting its news, whatever became of the API call. */
export async function dropPushToken(): Promise<void> {
  const instance = messaging();
  if (!instance) return;
  await setAutoInitEnabled(instance, false).catch(() => undefined);
  await deleteToken(instance).catch(() => undefined);
}

export function onPushToken(listener: (token: string) => void): () => void {
  const instance = messaging();
  return instance ? onTokenRefresh(instance, listener) : () => undefined;
}

/** A notification that arrives while the game is open — the system does not show it then. */
export function onPushWhileOpen(listener: (notice: PushNotice) => void): () => void {
  const instance = messaging();
  if (!instance) return () => undefined;
  return onMessage(instance, (message) => {
    const notice = noticeOf(message);
    if (notice) listener(notice);
  });
}

/**
 * A tap on a notification: the one the app was opened with — cold, from the
 * notification — and every later one while it runs in the background.
 */
export function onPushOpened(listener: (data: PushData) => void): () => void {
  const instance = messaging();
  if (!instance) return () => undefined;
  void getInitialNotification(instance)
    .then((message) => {
      const data = message ? dataOf(message.data) : null;
      if (data) listener(data);
    })
    .catch(() => undefined);
  return onNotificationOpenedApp(instance, (message) => {
    const data = dataOf(message.data);
    if (data) listener(data);
  });
}

const KINDS: readonly PushData['kind'][] = ['friend_request', 'friends', 'vs_invite', 'vs_result', 'phrase'];

/** What the API put in a notification's data — anything else is not the game's. */
export function dataOf(data: RemoteMessage['data']): PushData | null {
  if (!data) return null;
  const kind = KINDS.find((known) => known === data.kind);
  const username = typeof data.username === 'string' ? data.username : null;
  if (!kind || !username) return null;
  return typeof data.duelId === 'string' ? { kind, username, duelId: data.duelId } : { kind, username };
}

function noticeOf(message: RemoteMessage): PushNotice | null {
  const title = message.notification?.title;
  const body = message.notification?.body;
  if (!title || !body) return null;
  return { title, body, data: dataOf(message.data) };
}
