import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

import { currentInstallId, installId, sessionSaved, useSession } from '@/auth/session';
import { useSettings } from '@/stores/settings';
import { buildMe } from '@/test/factories';

describe('session', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await Keychain.resetGenericPassword({ service: 'quezby.auth' });
    useSession.setState({ token: null, user: null, ranks: null, hydrated: false });
  });

  it('reads the install id with the token, so the first signed-in call names the phone', async () => {
    await AsyncStorage.setItem('quezby.install.v1', 'c0ffee00c0ffee00c0ffee00c0ffee00');
    await Keychain.setGenericPassword('player', 'token-1', { service: 'quezby.auth' });

    await useSession.getState().hydrate();

    expect(useSession.getState()).toMatchObject({ token: 'token-1', hydrated: true });
    expect(currentInstallId()).toBe('c0ffee00c0ffee00c0ffee00c0ffee00');
  });

  it('mints the install id once, and keeps it', async () => {
    const minted = await installId();

    expect(minted).toMatch(/^[0-9a-f]{32}$/);
    expect(await installId()).toBe(minted);
    expect(currentInstallId()).toBe(minted);
  });

  it('asks whoever uses the phone next about usage again', async () => {
    await useSession.getState().signIn('token-1', buildMe());
    useSettings.setState({ analytics: true, consent: 'synced', hydrated: true });

    await useSession.getState().signOut();

    expect(useSession.getState().token).toBeNull();
    expect(useSettings.getState()).toMatchObject({ analytics: false, consent: 'unasked' });
  });

  it('says when the token of a sign-in is in the keychain — nothing may reload before', async () => {
    let stored = false;
    jest.mocked(Keychain.setGenericPassword).mockImplementationOnce(async () => {
      await Promise.resolve();
      stored = true;
      return { service: 'quezby.auth', storage: 'keychain' } as unknown as Awaited<
        ReturnType<typeof Keychain.setGenericPassword>
      >;
    });

    const signIn = useSession.getState().signIn('token-9', buildMe());
    await sessionSaved();

    expect(stored).toBe(true);
    await signIn;
  });
});
