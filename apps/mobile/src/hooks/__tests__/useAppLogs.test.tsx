import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError } from '@quezby/sdk';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { useAppLogs, watchCrashes } from '@/hooks/useAppLogs';
import { logApp, pendingAppLogs, resetAppLogs } from '@/lib/appLog';
import { buildMe } from '@/test/factories';

jest.mock('@/api/client', () => ({ api: { me: { sendLogs: jest.fn() } } }));

const sendLogs = (api as unknown as { me: { sendLogs: jest.Mock } }).me.sendLogs;

async function settle() {
  await act(async () => {
    for (let tick = 0; tick < 10; tick += 1) await Promise.resolve();
  });
}

beforeEach(async () => {
  jest.clearAllMocks();
  resetAppLogs();
  await AsyncStorage.clear();
  sendLogs.mockResolvedValue(undefined);
  useSession.setState({ token: 'token', user: buildMe(), ranks: null, hydrated: true });
});

describe('useAppLogs', () => {
  it('sends what the phone kept once a player is signed in', async () => {
    logApp('error', 'push.token', 'unregistered');

    await renderHook(() => useAppLogs());
    await settle();

    expect(sendLogs).toHaveBeenCalledWith({ entries: [expect.objectContaining({ event: 'push.token' })] });
    expect(pendingAppLogs()).toEqual([]);
  });

  it('sends nothing without an account', async () => {
    useSession.setState({ token: null, user: null });
    logApp('error', 'push.token', 'unregistered');

    await renderHook(() => useAppLogs());
    await settle();

    expect(sendLogs).not.toHaveBeenCalled();
    expect(pendingAppLogs()).toHaveLength(1);
  });

  it('drops lines the API will never take, and keeps them when it was only out of reach', async () => {
    logApp('error', 'a', 'b');
    sendLogs.mockRejectedValueOnce(new ApiError(0, 'network', 'offline'));
    const view = await renderHook(() => useAppLogs());
    await settle();
    expect(pendingAppLogs()).toHaveLength(1);
    await view.unmount();

    sendLogs.mockRejectedValueOnce(new ApiError(422, 'validation_failed', 'x'));
    await renderHook(() => useAppLogs());
    await settle();
    expect(pendingAppLogs()).toEqual([]);
  });

  it('sends new lines together, a moment after the first is kept', async () => {
    await renderHook(() => useAppLogs(20));
    await settle();
    expect(sendLogs).not.toHaveBeenCalled();

    logApp('warning', 'api.unreachable', 'GET /me/inbox');
    logApp('warning', 'api.unreachable', 'GET /me/pulse');
    expect(sendLogs).not.toHaveBeenCalled();

    await waitFor(() => expect(sendLogs).toHaveBeenCalledTimes(1));
    expect(sendLogs.mock.calls[0]?.[0].entries).toHaveLength(2);
  });
});

describe('watchCrashes', () => {
  it('keeps a crash before React Native’s own handler takes over', () => {
    const previous = jest.fn();
    const handlers: Array<(error: unknown, isFatal?: boolean) => void> = [];
    jest.spyOn(ErrorUtils, 'getGlobalHandler').mockReturnValue(previous);
    jest.spyOn(ErrorUtils, 'setGlobalHandler').mockImplementation((handler) => {
      handlers.push(handler);
    });

    watchCrashes();
    const boom = new Error('boom');
    handlers[0]?.(boom, true);

    expect(pendingAppLogs()).toEqual([
      expect.objectContaining({ level: 'error', event: 'crash', message: 'boom', context: expect.objectContaining({ fatal: true }) }),
    ]);
    expect(previous).toHaveBeenCalledWith(boom, true);
  });
});
