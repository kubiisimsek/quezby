import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, type ReactNativeFirebase } from '@react-native-firebase/app';
import {
  deleteToken,
  hasPermission,
  onMessage,
  requestPermission,
  type RemoteMessage,
} from '@react-native-firebase/messaging';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Linking } from 'react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import {
  allowPush,
  forgetPush,
  refreshPushPermission,
  turnOnPush,
  usePushEvents,
  usePushRegistration,
} from '@/hooks/usePush';
import { NUDGE_REST_MS, usePush } from '@/stores/push';
import { buildMe } from '@/test/factories';
import { createTestQueryClient } from '@/test/renderWithProviders';

jest.mock('@/api/client', () => ({
  api: { me: { registerPushToken: jest.fn(), unregisterPushToken: jest.fn() } },
}));

const mocked = api as unknown as { me: { registerPushToken: jest.Mock; unregisterPushToken: jest.Mock } };

async function settle() {
  await act(async () => {
    for (let tick = 0; tick < 10; tick += 1) await Promise.resolve();
  });
}

function resetPush() {
  usePush.setState({
    androidBlocked: false,
    nudgeHiddenUntil: 0,
    hydrated: false,
    permission: null,
    token: null,
    notice: null,
    opened: null,
  });
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  resetPush();
  jest.mocked(getApps).mockReturnValue([{ name: '[DEFAULT]' } as ReactNativeFirebase.FirebaseApp]);
  mocked.me.registerPushToken.mockResolvedValue(undefined);
  mocked.me.unregisterPushToken.mockResolvedValue(undefined);
  useSession.setState({ token: 'token', user: buildMe(), ranks: null, hydrated: true });
});

describe('the permission, as the game shows it', () => {
  it('reads the phone, and counts an Android "never again" as turned down', async () => {
    jest.mocked(hasPermission).mockResolvedValue(-1);
    expect(await refreshPushPermission()).toBe('undetermined');

    usePush.getState().setAndroidBlocked(true);
    expect(await refreshPushPermission()).toBe('denied');
    expect(usePush.getState().permission).toBe('denied');
  });

  it('forgets the "never again" once notifications are on', async () => {
    usePush.setState({ androidBlocked: true, hydrated: true });
    jest.mocked(hasPermission).mockResolvedValue(1);

    expect(await refreshPushPermission()).toBe('granted');
    expect(usePush.getState().androidBlocked).toBe(false);
  });

  it('asks the system and keeps its answer', async () => {
    jest.mocked(requestPermission).mockResolvedValueOnce(1);

    expect(await allowPush()).toBe('granted');
    expect(usePush.getState().permission).toBe('granted');
  });

  it('asks while the question can come, and opens the phone’s settings once it cannot', async () => {
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);

    turnOnPush('undetermined');
    await settle();
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(openSettings).not.toHaveBeenCalled();

    turnOnPush('denied');
    expect(openSettings).toHaveBeenCalledTimes(1);
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });
});

describe('usePushRegistration', () => {
  it('hands the API the phone’s token once notifications are on', async () => {
    jest.mocked(hasPermission).mockResolvedValue(1);

    await renderHook(() => usePushRegistration());
    await settle();

    expect(mocked.me.registerPushToken).toHaveBeenCalledWith({ token: 'fcm-token', platform: 'ios' });
    expect(usePush.getState().token).toBe('fcm-token');
  });

  it('hands nothing over before the player said yes', async () => {
    jest.mocked(hasPermission).mockResolvedValue(-1);

    await renderHook(() => usePushRegistration());
    await settle();

    expect(mocked.me.registerPushToken).not.toHaveBeenCalled();
  });

  it('hands nothing over without an account', async () => {
    jest.mocked(hasPermission).mockResolvedValue(1);
    useSession.setState({ token: null, user: null });

    await renderHook(() => usePushRegistration());
    await settle();

    expect(mocked.me.registerPushToken).not.toHaveBeenCalled();
  });
});

describe('forgetPush', () => {
  it('tells the API to forget the phone, and throws the token away', async () => {
    usePush.setState({ token: 'fcm-token' });

    forgetPush();
    await settle();

    expect(mocked.me.unregisterPushToken).toHaveBeenCalledWith('fcm-token');
    expect(deleteToken).toHaveBeenCalledTimes(1);
    expect(usePush.getState().token).toBeNull();
  });
});

describe('usePushEvents', () => {
  it('shows a notification that comes while the game is open, then lets it go', async () => {
    jest.useFakeTimers();
    const client = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    await renderHook(() => usePushEvents(), { wrapper });

    await act(async () => {
      jest.mocked(onMessage).mock.calls[0]?.[1]({
        notification: { title: 'Quezby', body: '@ekin seni ekledi' },
        data: { kind: 'friend_request', username: 'ekin' },
      } as RemoteMessage);
    });
    expect(usePush.getState().notice?.body).toBe('@ekin seni ekledi');

    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });
    expect(usePush.getState().notice).toBeNull();
    jest.useRealTimers();
  });
});

describe('the push store', () => {
  it('puts the card away for a week, and remembers it and a "never again" across launches', async () => {
    usePush.setState({ hydrated: true });
    usePush.getState().hideNudge(1_000);
    usePush.getState().setAndroidBlocked(true);
    resetPush();

    await usePush.getState().hydrate();

    expect(usePush.getState()).toMatchObject({
      nudgeHiddenUntil: 1_000 + NUDGE_REST_MS,
      androidBlocked: true,
      hydrated: true,
    });
  });
});
