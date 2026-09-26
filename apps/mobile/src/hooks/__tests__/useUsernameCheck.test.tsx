import { ApiError } from '@quezby/sdk';
import { act, renderHook } from '@testing-library/react-native';

import { api } from '@/api/client';
import { checkMessage, useUsernameCheck } from '@/hooks/useUsernameCheck';
import { messagesOf } from '@/i18n';

jest.mock('@/api/client', () => ({
  api: { usernames: { check: jest.fn() } },
}));

const check = api.usernames.check as jest.Mock;

async function typed(value: string, current?: string | null) {
  const hook = await renderHook(() => useUsernameCheck(value, current));
  await act(async () => {
    jest.advanceTimersByTime(400);
  });
  return hook.result.current;
}

describe('useUsernameCheck', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('waits for something to be typed', async () => {
    expect(await typed('  ')).toEqual({ state: 'empty' });
    expect(check).not.toHaveBeenCalled();
  });

  it('refuses on the phone what the rules refuse, without asking the API', async () => {
    expect(await typed('ab')).toEqual({ state: 'invalid', problem: 'too_short' });
    expect(await typed('guest12345678')).toEqual({ state: 'invalid', problem: 'reserved' });
    expect(check).not.toHaveBeenCalled();
  });

  it('calls the player\'s own name theirs — the automatic one too', async () => {
    expect(await typed('Ekin', 'ekin')).toEqual({ state: 'current', normalized: 'ekin' });
    expect(await typed('guest48128742', 'guest48128742')).toEqual({
      state: 'current',
      normalized: 'guest48128742',
    });
    expect(check).not.toHaveBeenCalled();
  });

  it('asks the API whether a well-formed name is free', async () => {
    check.mockResolvedValueOnce({ username: 'ekin.su', available: true, reason: null });
    expect(await typed('Ekin.Su')).toEqual({ state: 'available', normalized: 'ekin.su' });
    expect(check).toHaveBeenCalledWith('ekin.su');

    check.mockResolvedValueOnce({ username: 'ekin', available: false, reason: 'taken' });
    expect(await typed('ekin')).toEqual({ state: 'taken', normalized: 'ekin' });
  });

  it('lets the player go on when the API cannot be asked', async () => {
    check.mockRejectedValueOnce(new ApiError(0, 'network', 'offline'));

    expect(await typed('ekin.su')).toEqual({ state: 'unknown', normalized: 'ekin.su' });
  });

  it('says a refusal in the language on screen, from its code', () => {
    const tr = messagesOf('tr');
    const en = messagesOf('en');
    expect(checkMessage({ state: 'invalid', problem: 'too_short' }, tr)).toBe('En az 3 karakter olmalı.');
    expect(checkMessage({ state: 'invalid', problem: 'too_short' }, en)).toBe('At least 3 characters.');
    expect(checkMessage({ state: 'taken', normalized: 'ekin' }, en)).toBe('This username is taken.');
    expect(checkMessage({ state: 'invalid', problem: null }, en)).toBe("This username can't be used.");
    expect(checkMessage({ state: 'available', normalized: 'ekin' }, en)).toBeUndefined();
  });
});
