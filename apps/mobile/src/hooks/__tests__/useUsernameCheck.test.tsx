import { ApiError } from '@quezby/sdk';
import { act, renderHook } from '@testing-library/react-native';

import { api } from '@/api/client';
import { useUsernameCheck } from '@/hooks/useUsernameCheck';

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
    expect(await typed('ab')).toEqual({ state: 'invalid', message: 'En az 3 karakter olmalı.' });
    expect(await typed('guest12345678')).toEqual({
      state: 'invalid',
      message: 'Bu kullanıcı adı ayrılmış, başka bir tane dene.',
    });
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
    expect(await typed('ekin')).toEqual({ state: 'taken', normalized: 'ekin', message: 'Bu kullanıcı adı alınmış.' });
  });

  it('lets the player go on when the API cannot be asked', async () => {
    check.mockRejectedValueOnce(new ApiError(0, 'network', 'offline'));

    expect(await typed('ekin.su')).toEqual({ state: 'unknown', normalized: 'ekin.su' });
  });
});
