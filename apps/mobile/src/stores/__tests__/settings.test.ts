import AsyncStorage from '@react-native-async-storage/async-storage';

import { useSettings } from '@/stores/settings';

const KEY = 'quezby.settings.v1';

/** What the account holds besides the two settings the phone keeps. */
const ACCOUNT = { pushFriends: true, pushVs: true, pushMessages: true };

async function stored(): Promise<unknown> {
  return JSON.parse((await AsyncStorage.getItem(KEY)) ?? 'null');
}

describe('settings', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('starts with haptics on, and no usage counted before an answer', async () => {
    await useSettings.getState().hydrate();

    expect(useSettings.getState()).toMatchObject({ haptics: true, analytics: false, consent: 'unasked', hydrated: true });
  });

  it('changes only the settings it is given', async () => {
    useSettings.setState({ analytics: true, consent: 'synced' });

    useSettings.getState().apply({ haptics: false });

    expect(useSettings.getState()).toMatchObject({ haptics: false, analytics: true, consent: 'synced' });
    expect(await stored()).toEqual({ haptics: false, analytics: true, consent: 'synced' });
  });

  it('keeps an answer until the account has it', () => {
    useSettings.getState().answer(true);
    expect(useSettings.getState()).toMatchObject({ analytics: true, consent: 'pending' });

    // `/me` from before the answer reached the account must not undo it.
    useSettings.getState().fromAccount({ ...ACCOUNT, haptics: false, analytics: false });
    expect(useSettings.getState()).toMatchObject({ haptics: false, analytics: true, consent: 'pending' });

    useSettings.getState().synced(true);
    expect(useSettings.getState()).toMatchObject({ analytics: true, consent: 'synced' });
  });

  it('lets the account win once it has the answer', () => {
    useSettings.setState({ analytics: true, consent: 'synced' });

    useSettings.getState().fromAccount({ ...ACCOUNT, haptics: true, analytics: false });

    expect(useSettings.getState()).toMatchObject({ analytics: false, consent: 'synced' });
  });

  it('takes a yes given on another phone, and still asks here after a no', () => {
    useSettings.getState().fromAccount({ ...ACCOUNT, haptics: true, analytics: true });
    expect(useSettings.getState()).toMatchObject({ analytics: true, consent: 'synced' });

    useSettings.setState({ analytics: false, consent: 'unasked' });
    useSettings.getState().fromAccount({ ...ACCOUNT, haptics: true, analytics: false });
    expect(useSettings.getState()).toMatchObject({ analytics: false, consent: 'unasked' });
  });

  it('forgets the answer for whoever uses the phone next', () => {
    useSettings.setState({ analytics: true, consent: 'synced' });

    useSettings.getState().forgetConsent();

    expect(useSettings.getState()).toMatchObject({ analytics: false, consent: 'unasked' });
  });

  it('reads back what it wrote, and what it cannot read counts as never asked', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({ haptics: false, analytics: true, consent: 'synced' }));
    useSettings.setState({ hydrated: false });
    await useSettings.getState().hydrate();
    expect(useSettings.getState()).toMatchObject({ haptics: false, analytics: true, consent: 'synced' });

    await AsyncStorage.setItem(KEY, JSON.stringify({ haptics: 'no', analytics: 1, consent: 'maybe' }));
    useSettings.setState({ hydrated: false });
    await useSettings.getState().hydrate();
    expect(useSettings.getState()).toMatchObject({ haptics: true, analytics: false, consent: 'unasked' });

    // A phone from before the question: haptics only.
    await AsyncStorage.setItem(KEY, JSON.stringify({ haptics: false }));
    useSettings.setState({ hydrated: false });
    await useSettings.getState().hydrate();
    expect(useSettings.getState()).toMatchObject({ haptics: false, analytics: false, consent: 'unasked' });
  });
});
