import { getApps } from '@react-native-firebase/app';
import {
  deleteToken,
  getInitialNotification,
  getToken,
  hasPermission,
  onMessage,
  onNotificationOpenedApp,
  requestPermission,
  setAutoInitEnabled,
} from '@react-native-firebase/messaging';
import type { RemoteMessage } from '@react-native-firebase/messaging';
import type { ReactNativeFirebase } from '@react-native-firebase/app';
import { PermissionsAndroid } from 'react-native';

import {
  askPushPermission,
  dataOf,
  dropPushToken,
  fromAndroidAnswer,
  onPushOpened,
  onPushWhileOpen,
  pushAvailable,
  pushPermission,
  pushToken,
} from '@/lib/push';

const apps = jest.mocked(getApps);

/** A build that carries Firebase's file: one Firebase app. */
function withFirebase() {
  apps.mockReturnValue([{ name: '[DEFAULT]' } as ReactNativeFirebase.FirebaseApp]);
}

describe('push, in a build without Firebase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apps.mockReturnValue([]);
  });

  it('is unavailable and does nothing', async () => {
    expect(pushAvailable()).toBe(false);
    expect(await pushPermission()).toBe('unavailable');
    expect(await askPushPermission()).toBe('unavailable');
    expect(await pushToken()).toBeNull();
    await dropPushToken();

    const stop = onPushWhileOpen(jest.fn());
    stop();
    expect(onMessage).not.toHaveBeenCalled();
    expect(requestPermission).not.toHaveBeenCalled();
    expect(deleteToken).not.toHaveBeenCalled();
  });
});

describe('push, with Firebase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    withFirebase();
  });

  it('reads where the phone stands, the iPhone way', async () => {
    jest.mocked(hasPermission).mockResolvedValueOnce(-1).mockResolvedValueOnce(1).mockResolvedValueOnce(0).mockResolvedValueOnce(2);

    expect(await pushPermission()).toBe('undetermined');
    expect(await pushPermission()).toBe('granted');
    expect(await pushPermission()).toBe('denied');
    // Provisional counts as on: notifications arrive quietly.
    expect(await pushPermission()).toBe('granted');
  });

  it('asks the system, once', async () => {
    jest.mocked(requestPermission).mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    expect(await askPushPermission()).toBe('granted');
    expect(await askPushPermission()).toBe('denied');
  });

  it('tells Android’s first no from its "don’t ask again"', () => {
    expect(fromAndroidAnswer(PermissionsAndroid.RESULTS.GRANTED)).toBe('granted');
    expect(fromAndroidAnswer(PermissionsAndroid.RESULTS.DENIED)).toBe('undetermined');
    expect(fromAndroidAnswer(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)).toBe('denied');
  });

  it('lets Firebase make a token only once it is asked for one, and throws it away on sign-out', async () => {
    expect(await pushToken()).toBe('fcm-token');
    expect(setAutoInitEnabled).toHaveBeenLastCalledWith(expect.anything(), true);
    expect(getToken).toHaveBeenCalledTimes(1);

    await dropPushToken();
    expect(setAutoInitEnabled).toHaveBeenLastCalledWith(expect.anything(), false);
    expect(deleteToken).toHaveBeenCalledTimes(1);
  });

  it('has no token when Firebase cannot give one', async () => {
    jest.mocked(getToken).mockRejectedValueOnce(new Error('no APNs token'));

    expect(await pushToken()).toBeNull();
  });

  it('shows a notification that comes while the game is open, with what a tap opens', () => {
    const listener = jest.fn();
    onPushWhileOpen(listener);
    const deliver = jest.mocked(onMessage).mock.calls[0]?.[1];

    deliver?.({
      notification: { title: 'Quezby', body: '@ekin seni VS’e çağırdı!' },
      data: { kind: 'vs_invite', username: 'ekin', duelId: '01jduel0000000000000000000' },
    } as RemoteMessage);
    // Without words there is nothing to show.
    deliver?.({ data: { kind: 'phrase', username: 'ekin' } } as RemoteMessage);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      title: 'Quezby',
      body: '@ekin seni VS’e çağırdı!',
      data: { kind: 'vs_invite', username: 'ekin', duelId: '01jduel0000000000000000000' },
    });
  });

  it('opens the notification the app was opened with, and every later tap', async () => {
    jest.mocked(getInitialNotification).mockResolvedValueOnce({
      data: { kind: 'friend_request', username: 'deniz' },
    } as RemoteMessage);
    const listener = jest.fn();

    onPushOpened(listener);
    await Promise.resolve();
    await Promise.resolve();
    jest.mocked(onNotificationOpenedApp).mock.calls[0]?.[1]({
      data: { kind: 'phrase', username: 'ekin' },
    } as RemoteMessage);

    expect(listener).toHaveBeenNthCalledWith(1, { kind: 'friend_request', username: 'deniz' });
    expect(listener).toHaveBeenNthCalledWith(2, { kind: 'phrase', username: 'ekin' });
  });

  it('takes only the game’s own data from a notification', () => {
    expect(dataOf({ kind: 'friends', username: 'ekin' })).toEqual({ kind: 'friends', username: 'ekin' });
    expect(dataOf({ kind: 'sale', username: 'ekin' })).toBeNull();
    expect(dataOf({ kind: 'phrase' })).toBeNull();
    expect(dataOf(undefined)).toBeNull();
  });
});
