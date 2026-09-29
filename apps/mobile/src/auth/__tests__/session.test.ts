import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

import { currentInstallId, installId, sessionSaved, useSession } from '@/auth/session';
import { useSettings } from '@/stores/settings';
import { buildMe } from '@/test/factories';

const INSTALL = 'c0ffee00c0ffee00c0ffee00c0ffee00';

describe('session', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await Keychain.resetGenericPassword({ service: 'quezby.auth' });
    await Keychain.resetGenericPassword({ service: 'quezby.appattest' });
    useSession.setState({ token: null, user: null, ranks: null, hydrated: false });
  });

  it('reads the install id with the token, so the first signed-in call names the phone', async () => {
    await AsyncStorage.setItem('quezby.install.v1', INSTALL);
    await Keychain.setGenericPassword(INSTALL, 'token-1', { service: 'quezby.auth' });

    await useSession.getState().hydrate();

    expect(useSession.getState()).toMatchObject({ token: 'token-1', hydrated: true });
    expect(currentInstallId()).toBe(INSTALL);
  });

  it('mints the install id once, and keeps it', async () => {
    const minted = await installId();

    expect(minted).toMatch(/^[0-9a-f]{32}$/);
    expect(await installId()).toBe(minted);
    expect(await AsyncStorage.getItem('quezby.install.v1')).toBe(minted);
    expect(currentInstallId()).toBe(minted);
  });

  it('mints one id for callers that ask at the same moment', async () => {
    const [first, second] = await Promise.all([installId(), installId()]);

    expect(first).toBe(second);
  });

  it('forgets a token the deleted app left in the keychain: a reinstall starts signed out', async () => {
    // What iOS keeps after the app is deleted: the keychain, and nothing of AsyncStorage.
    await Keychain.setGenericPassword(INSTALL, 'token-old', { service: 'quezby.auth' });
    await Keychain.setGenericPassword('appattest', 'key-old', { service: 'quezby.appattest' });

    await useSession.getState().hydrate();

    expect(useSession.getState()).toMatchObject({ token: null, hydrated: true });
    expect(await Keychain.getGenericPassword({ service: 'quezby.auth' })).toBe(false);
    expect(await Keychain.getGenericPassword({ service: 'quezby.appattest' })).toBe(false);
    expect(await AsyncStorage.getItem('quezby.install.v1')).toMatch(/^[0-9a-f]{32}$/);
  });

  it('forgets a token from before tokens named their install when the app is new', async () => {
    await Keychain.setGenericPassword('player', 'token-old', { service: 'quezby.auth' });

    await useSession.getState().hydrate();

    expect(useSession.getState().token).toBeNull();
    expect(await Keychain.getGenericPassword({ service: 'quezby.auth' })).toBe(false);
  });

  it('never uses a token another install saved', async () => {
    await AsyncStorage.setItem('quezby.install.v1', INSTALL);
    await Keychain.setGenericPassword('ffffffffffffffffffffffffffffffff', 'token-other', {
      service: 'quezby.auth',
    });

    await useSession.getState().hydrate();

    expect(useSession.getState().token).toBeNull();
    expect(await Keychain.getGenericPassword({ service: 'quezby.auth' })).toBe(false);
  });

  it('keeps a token this install saved before tokens named their install, and files it under the install', async () => {
    await AsyncStorage.setItem('quezby.install.v1', INSTALL);
    await Keychain.setGenericPassword('player', 'token-1', { service: 'quezby.auth' });

    await useSession.getState().hydrate();

    expect(useSession.getState().token).toBe('token-1');
    expect(await Keychain.getGenericPassword({ service: 'quezby.auth' })).toMatchObject({
      username: INSTALL,
      password: 'token-1',
    });
  });

  it('keeps nothing but the token in the keychain, filed under this install and never in a backup', async () => {
    await AsyncStorage.setItem('quezby.install.v1', INSTALL);

    await useSession.getState().signIn('token-1', buildMe());

    expect(Keychain.setGenericPassword).toHaveBeenLastCalledWith(INSTALL, 'token-1', {
      service: 'quezby.auth',
      accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
    useSession.setState({ token: null, hydrated: false });
    await useSession.getState().hydrate();
    expect(useSession.getState().token).toBe('token-1');
  });

  it('asks whoever uses the phone next about usage again', async () => {
    await useSession.getState().signIn('token-1', buildMe());
    useSettings.setState({ analytics: true, consent: 'synced', hydrated: true });

    await useSession.getState().signOut();

    expect(useSession.getState().token).toBeNull();
    expect(await Keychain.getGenericPassword({ service: 'quezby.auth' })).toBe(false);
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
