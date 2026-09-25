import AsyncStorage from '@react-native-async-storage/async-storage';

import { stepFor, useOnboarding } from '@/stores/onboarding';

const reset = () => useOnboarding.setState({ userId: null, step: null, remindedFor: null, hydrated: false });

describe('onboarding', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    reset();
  });

  it('walks a guest through the practice run, the name and keeping the account', () => {
    const { begin, advance } = useOnboarding.getState();

    begin('u1');
    expect(useOnboarding.getState()).toMatchObject({ userId: 'u1', step: 'tutorial' });
    advance(true);
    expect(useOnboarding.getState().step).toBe('nickname');
    advance(true);
    expect(useOnboarding.getState().step).toBe('protect');
    advance(true);
    expect(useOnboarding.getState().step).toBeNull();
  });

  it('skips keeping the account for one that is already kept', () => {
    const { begin, advance } = useOnboarding.getState();

    begin('u1');
    advance(false);
    advance(false);

    expect(useOnboarding.getState().step).toBeNull();
  });

  it('finishes from any step', () => {
    useOnboarding.getState().begin('u1');
    useOnboarding.getState().finish();

    expect(useOnboarding.getState().step).toBeNull();
  });

  it('picks up where the player left off after a restart', async () => {
    useOnboarding.getState().begin('u1');
    useOnboarding.getState().advance(true);
    useOnboarding.getState().markReminded('u0');
    reset();

    await useOnboarding.getState().hydrate();

    expect(useOnboarding.getState()).toMatchObject({
      userId: 'u1',
      step: 'nickname',
      remindedFor: 'u0',
      hydrated: true,
    });
  });

  it('starts empty on a fresh install, and ignores what it cannot read', async () => {
    await useOnboarding.getState().hydrate();
    expect(useOnboarding.getState()).toMatchObject({ userId: null, step: null, hydrated: true });

    reset();
    await AsyncStorage.setItem('quezby.onboarding.v1', JSON.stringify({ userId: 7, step: 'dance' }));
    await useOnboarding.getState().hydrate();
    expect(useOnboarding.getState()).toMatchObject({ userId: null, step: null, hydrated: true });

    reset();
    await AsyncStorage.setItem('quezby.onboarding.v1', '{not json');
    await useOnboarding.getState().hydrate();
    expect(useOnboarding.getState().hydrated).toBe(true);
  });

  it('belongs to one account only', () => {
    useOnboarding.getState().begin('u1');
    const state = useOnboarding.getState();

    expect(stepFor(state, 'u1')).toBe('tutorial');
    expect(stepFor(state, 'u2')).toBeNull();
    expect(stepFor(state, null)).toBeNull();
  });
});
