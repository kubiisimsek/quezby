import { gateFor } from '@/navigation/gate';
import type { OnboardingStep } from '@/stores/onboarding';
import { buildMe } from '@/test/factories';

const me = buildMe({ id: 'u1', username: 'guest48128742' });

const base = {
  updateRequired: false,
  hydrated: true,
  token: 'token',
  user: me,
  meFailed: false,
  onboarding: { practiced: true, playing: false, userId: null, steps: [] as OnboardingStep[] },
};

const signedOut = { token: null, user: null };

describe('gateFor', () => {
  it('asks for an update before anything else', () => {
    expect(gateFor({ ...base, updateRequired: true, hydrated: false })).toBe('update');
  });

  it('waits on the splash until storage is read and the account has come', () => {
    expect(gateFor({ ...base, hydrated: false })).toBe('splash');
    expect(gateFor({ ...base, user: null })).toBe('splash');
  });

  it('says it could not connect when the account never came', () => {
    expect(gateFor({ ...base, user: null, meFailed: true })).toBe('offline');
  });

  it('welcomes a new phone, then plays its practice run, before any account', () => {
    const fresh = { ...base.onboarding, practiced: false };

    expect(gateFor({ ...base, ...signedOut, onboarding: fresh })).toBe('welcome');
    expect(gateFor({ ...base, ...signedOut, onboarding: { ...fresh, playing: true } })).toBe('tutorial');
  });

  it('offers the ways in once the practice run is behind the phone — after signing out too', () => {
    expect(gateFor({ ...base, ...signedOut })).toBe('account');
  });

  it('shows a new account the step it is on', () => {
    for (const step of ['username', 'consent', 'notifications'] as const) {
      expect(gateFor({ ...base, onboarding: { ...base.onboarding, userId: 'u1', steps: [step] } })).toBe(step);
    }
  });

  it('never shows one account the steps of another', () => {
    expect(gateFor({ ...base, onboarding: { ...base.onboarding, userId: 'u0', steps: ['username'] } })).toBe(
      'game',
    );
  });

  it('asks an account from before automatic names for a name', () => {
    expect(gateFor({ ...base, user: buildMe({ username: null }) })).toBe('username');
  });

  it('opens the game for everyone else', () => {
    expect(gateFor(base)).toBe('game');
  });
});
