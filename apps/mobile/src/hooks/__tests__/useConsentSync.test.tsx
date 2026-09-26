import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { useConsentSync } from '@/hooks/useConsentSync';
import { useSettings } from '@/stores/settings';
import { buildMe } from '@/test/factories';

jest.mock('@/api/client', () => ({ api: { me: { updateSettings: jest.fn() } } }));

const updateSettings = (api as unknown as { me: { updateSettings: jest.Mock } }).me.updateSettings;

async function settle() {
  await act(async () => {
    for (let tick = 0; tick < 10; tick += 1) await Promise.resolve();
  });
}

async function foreground() {
  const listeners = jest
    .mocked(AppState.addEventListener)
    .mock.calls.filter(([type]) => type === 'change')
    .map(([, listener]) => listener as (state: AppStateStatus) => void);
  await act(async () => {
    for (const listener of listeners) listener('active');
  });
  await settle();
}

describe('useConsentSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSession.setState({ token: 'token', user: buildMe(), ranks: null, hydrated: true });
    useSettings.setState({ hydrated: true, analytics: true, consent: 'pending' });
    updateSettings.mockResolvedValue({ settings: { haptics: true, analytics: true } });
  });

  it('takes the answer to the account, and then counts it as the account\'s', async () => {
    await renderHook(() => useConsentSync());
    await settle();

    expect(updateSettings).toHaveBeenCalledWith({ analytics: true });
    expect(useSettings.getState().consent).toBe('synced');
    expect(useSession.getState().user?.settings).toEqual({ haptics: true, analytics: true });
  });

  it('waits for an account', async () => {
    useSession.setState({ token: null, user: null });

    await renderHook(() => useConsentSync());
    await settle();

    expect(updateSettings).not.toHaveBeenCalled();
    expect(useSettings.getState().consent).toBe('pending');
  });

  it('tries again when the player comes back, after the network failed', async () => {
    updateSettings.mockRejectedValueOnce(new Error('offline'));
    await renderHook(() => useConsentSync());
    await settle();
    expect(useSettings.getState().consent).toBe('pending');

    await foreground();

    expect(updateSettings).toHaveBeenCalledTimes(2);
    expect(useSettings.getState().consent).toBe('synced');
  });

  it('lets a newer answer win over an older reply', async () => {
    let answer: (value: unknown) => void = () => undefined;
    updateSettings.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)));
    updateSettings.mockResolvedValueOnce({ settings: { haptics: true, analytics: false } });
    await renderHook(() => useConsentSync());
    await settle();

    await act(async () => {
      useSettings.getState().answer(false);
    });
    await settle();
    await act(async () => {
      answer({ settings: { haptics: true, analytics: true } });
    });
    await settle();

    expect(updateSettings).toHaveBeenLastCalledWith({ analytics: false });
    expect(useSettings.getState()).toMatchObject({ analytics: false, consent: 'synced' });
  });

  it('has nothing to do once the account has the answer', async () => {
    useSettings.setState({ consent: 'synced' });

    await renderHook(() => useConsentSync());
    await settle();

    expect(updateSettings).not.toHaveBeenCalled();
  });
});
