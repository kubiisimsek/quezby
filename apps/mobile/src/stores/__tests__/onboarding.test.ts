import AsyncStorage from '@react-native-async-storage/async-storage';

import { firstSteps, stepFor, useOnboarding } from '@/stores/onboarding';
import { useSettings } from '@/stores/settings';
import { buildMe } from '@/test/factories';

const reset = () =>
  useOnboarding.setState({
    practiced: false,
    playing: false,
    userId: null,
    steps: [],
    remindedFor: null,
    hydrated: false,
  });

const automatic = buildMe({ id: 'u1', username: 'guest48128742' });
const named = buildMe({ id: 'u1', username: 'ekin' });

describe('onboarding', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    reset();
  });

  it('goes from the welcome to the practice run, then to the ways in for good', async () => {
    const { play, practiceDone } = useOnboarding.getState();

    play();
    expect(useOnboarding.getState()).toMatchObject({ playing: true, practiced: false });
    practiceDone();
    expect(useOnboarding.getState()).toMatchObject({ playing: false, practiced: true });

    reset();
    await useOnboarding.getState().hydrate();
    expect(useOnboarding.getState()).toMatchObject({ practiced: true, playing: false });
  });

  it('starts the welcome again when the app closed during the practice run', async () => {
    useOnboarding.getState().play();
    reset();

    await useOnboarding.getState().hydrate();

    expect(useOnboarding.getState()).toMatchObject({ practiced: false, playing: false });
  });

  it('asks an account that signed in for a name, then usage, then notifications', () => {
    const { begin, advance } = useOnboarding.getState();

    begin(automatic, true);
    expect(useOnboarding.getState()).toMatchObject({
      practiced: true,
      userId: 'u1',
      steps: ['username', 'consent', 'notifications'],
    });
    advance();
    expect(stepFor(useOnboarding.getState(), 'u1')).toBe('consent');
    advance();
    expect(stepFor(useOnboarding.getState(), 'u1')).toBe('notifications');
    advance();
    expect(stepFor(useOnboarding.getState(), 'u1')).toBeNull();
  });

  it('never asks a guest for a name', () => {
    useOnboarding.getState().begin(automatic, false);

    expect(useOnboarding.getState().steps).toEqual(['consent', 'notifications']);
  });

  it('skips the usage question when this phone already answered it', () => {
    useSettings.setState({ consent: 'pending', hydrated: true });

    useOnboarding.getState().begin(automatic, false);

    expect(useOnboarding.getState().steps).toEqual(['notifications']);
  });

  it('finishes from any step', () => {
    useOnboarding.getState().begin(automatic, true);
    useOnboarding.getState().finish();

    expect(stepFor(useOnboarding.getState(), 'u1')).toBeNull();
  });

  it('picks up where the player left off after a restart', async () => {
    useOnboarding.getState().begin(automatic, true);
    useOnboarding.getState().advance();
    useOnboarding.getState().markReminded('u0');
    reset();

    await useOnboarding.getState().hydrate();

    expect(useOnboarding.getState()).toMatchObject({
      practiced: true,
      userId: 'u1',
      steps: ['consent', 'notifications'],
      remindedFor: 'u0',
      hydrated: true,
    });
  });

  it('starts at the welcome on a fresh install, and ignores what it cannot read', async () => {
    await useOnboarding.getState().hydrate();
    expect(useOnboarding.getState()).toMatchObject({ practiced: false, userId: null, steps: [], hydrated: true });

    reset();
    await AsyncStorage.setItem(
      'quezby.onboarding.v1',
      JSON.stringify({ practiced: false, userId: 7, steps: ['dance', 'consent'] }),
    );
    await useOnboarding.getState().hydrate();
    expect(useOnboarding.getState()).toMatchObject({ practiced: false, userId: null, steps: ['consent'] });

    reset();
    await AsyncStorage.setItem('quezby.onboarding.v1', '{not json');
    await useOnboarding.getState().hydrate();
    expect(useOnboarding.getState()).toMatchObject({ practiced: false, hydrated: true });
  });

  it('takes a phone that kept its steps before the practice run came first as past it', async () => {
    await AsyncStorage.setItem(
      'quezby.onboarding.v1',
      JSON.stringify({ userId: 'u1', step: 'protect', remindedFor: 'u1' }),
    );

    await useOnboarding.getState().hydrate();

    expect(useOnboarding.getState()).toMatchObject({ practiced: true, steps: [], remindedFor: 'u1' });
  });

  it('belongs to one account only', () => {
    useOnboarding.getState().begin(automatic, true);
    const state = useOnboarding.getState();

    expect(stepFor(state, 'u1')).toBe('username');
    expect(stepFor(state, 'u2')).toBeNull();
    expect(stepFor(state, null)).toBeNull();
  });
});

describe('firstSteps', () => {
  it('asks for a name only after a sign-in, and only while the name is the automatic one', () => {
    expect(firstSteps(automatic, { signedIn: true, consentAsked: true })).toEqual(['username', 'notifications']);
    expect(firstSteps(named, { signedIn: true, consentAsked: true })).toEqual(['notifications']);
    expect(firstSteps(automatic, { signedIn: false, consentAsked: true })).toEqual(['notifications']);
  });

  it('asks an account from before automatic names for one', () => {
    expect(firstSteps(buildMe({ username: null }), { signedIn: true, consentAsked: true })).toEqual([
      'username',
      'notifications',
    ]);
  });

  it('never asks about usage an account that said yes on another phone', () => {
    const yes = buildMe({ username: 'ekin', settings: { ...named.settings, analytics: true } });

    expect(firstSteps(yes, { signedIn: true, consentAsked: false })).toEqual(['notifications']);
    expect(firstSteps(named, { signedIn: true, consentAsked: false })).toEqual(['consent', 'notifications']);
  });
});
