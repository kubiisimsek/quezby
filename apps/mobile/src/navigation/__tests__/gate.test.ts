import { gateFor } from '@/navigation/gate';
import { buildMe } from '@/test/factories';

const me = buildMe({ id: 'u1', username: 'guest48128742' });

const base = {
  updateRequired: false,
  hydrated: true,
  token: 'token',
  user: me,
  meFailed: false,
  onboarding: { userId: null, step: null },
};

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

  it('welcomes a phone with no account', () => {
    expect(gateFor({ ...base, token: null, user: null })).toBe('welcome');
  });

  it('shows a new account the step it is on', () => {
    for (const step of ['tutorial', 'nickname', 'protect'] as const) {
      expect(gateFor({ ...base, onboarding: { userId: 'u1', step } })).toBe(step);
    }
  });

  it('never shows one account the steps of another', () => {
    expect(gateFor({ ...base, onboarding: { userId: 'u0', step: 'tutorial' } })).toBe('game');
  });

  it('asks an account from before automatic names for a name', () => {
    expect(gateFor({ ...base, user: buildMe({ username: null }) })).toBe('username');
  });

  it('opens the game for everyone else', () => {
    expect(gateFor(base)).toBe('game');
  });
});
