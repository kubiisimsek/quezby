import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';
import { AppState, I18nManager, type AppStateStatus } from 'react-native';
import RNRestart from 'react-native-restart';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { useLanguageSync } from '@/hooks/useLanguageSync';
import { useLanguage } from '@/i18n/language';
import { buildMe } from '@/test/factories';

jest.mock('@/api/client', () => ({ api: { me: { updateLocale: jest.fn() } } }));

const updateLocale = (api as unknown as { me: { updateLocale: jest.Mock } }).me.updateLocale;

async function settle() {
  await act(async () => {
    for (let tick = 0; tick < 20; tick += 1) await Promise.resolve();
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

describe('useLanguageSync', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    jest.spyOn(I18nManager, 'allowRTL').mockImplementation(() => undefined);
    jest.spyOn(I18nManager, 'forceRTL').mockImplementation(() => undefined);
    useLanguage.setState({ phase: 'ready', locale: 'tr', chosen: 'tr', device: 'tr', account: 'player-1' });
    useSession.setState({ token: 'token', user: buildMe({ locale: 'tr' }), ranks: null, hydrated: true });
    // The API answers with the same player, now in the language it was sent.
    updateLocale.mockImplementation(async (locale: string) => ({
      user: { ...useSession.getState().user, locale },
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('writes nothing while the account already has the phone’s language', async () => {
    await renderHook(() => useLanguageSync());
    await settle();

    expect(updateLocale).not.toHaveBeenCalled();
  });

  it('writes the language picked on the phone to the account', async () => {
    await renderHook(() => useLanguageSync());
    await act(async () => {
      useLanguage.setState({ locale: 'de', chosen: 'de' });
    });
    await settle();

    expect(updateLocale).toHaveBeenCalledWith('de');
    expect(useSession.getState().user?.locale).toBe('de');
  });

  it('tries again on the next return to the app when the network was not there', async () => {
    updateLocale.mockRejectedValueOnce(new Error('offline'));
    useLanguage.setState({ locale: 'fr', chosen: 'fr' });
    await renderHook(() => useLanguageSync());
    await settle();
    expect(useSession.getState().user?.locale).toBe('tr');

    await foreground();

    expect(updateLocale).toHaveBeenCalledTimes(2);
    expect(useSession.getState().user?.locale).toBe('fr');
  });

  it('takes the language of an account this phone has not seen, and writes nothing', async () => {
    useLanguage.setState({ account: null, chosen: null });
    useSession.setState({ user: buildMe({ id: 'player-2', locale: 'es' }) });

    await renderHook(() => useLanguageSync());
    await settle();

    expect(useLanguage.getState()).toMatchObject({ locale: 'es', chosen: 'es', account: 'player-2' });
    expect(updateLocale).not.toHaveBeenCalled();
    expect(RNRestart.restart).not.toHaveBeenCalled();
  });

  it('reloads the app for an account that plays in Arabic', async () => {
    useLanguage.setState({ account: null });
    useSession.setState({ user: buildMe({ id: 'player-3', locale: 'ar' }) });

    await renderHook(() => useLanguageSync());
    await settle();

    expect(I18nManager.forceRTL).toHaveBeenCalledWith(true);
    expect(RNRestart.restart).toHaveBeenCalledTimes(1);
    expect(updateLocale).not.toHaveBeenCalled();
  });

  it('waits until the language is settled at launch', async () => {
    useLanguage.setState({ phase: 'loading', locale: 'de' });

    await renderHook(() => useLanguageSync());
    await settle();

    expect(updateLocale).not.toHaveBeenCalled();
  });
});
