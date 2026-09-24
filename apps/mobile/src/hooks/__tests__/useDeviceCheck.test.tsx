import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { checkDevice, type DeviceCheckOutcome } from '@/auth/deviceCheck';
import { useSession } from '@/auth/session';
import { REFRESH_EARLY_MS, RETRY_MS, useDeviceCheck } from '@/hooks/useDeviceCheck';
import { useDeviceVerdict } from '@/stores/deviceVerdict';
import { buildMe } from '@/test/factories';

jest.mock('@/auth/deviceCheck', () => ({ checkDevice: jest.fn() }));

const check = jest.mocked(checkDevice);

const NOW = Date.parse('2026-09-26T10:00:00.000Z');
const HOUR = 3_600_000;
const at = (ms: number) => new Date(NOW + ms).toISOString();

function signIn(id = 'player-1') {
  useSession.setState({ token: 'token', user: buildMe({ id }), ranks: null, hydrated: true });
}

function stored(userId: string, verdict: 'pass' | 'fail', validUntil: string) {
  useDeviceVerdict.setState({ userId, verdict, validUntil, hydrated: true });
}

function answers(...outcomes: DeviceCheckOutcome[]) {
  for (const outcome of outcomes) check.mockResolvedValueOnce(outcome);
}

/** Lets the awaited check land and its verdict be kept. */
async function settle() {
  await act(async () => {
    for (let tick = 0; tick < 10; tick += 1) await Promise.resolve();
  });
}

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
  await settle();
}

/** The app comes back to the front. */
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

describe('useDeviceCheck', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
    jest.clearAllMocks();
    check.mockReset();
    signIn();
    useDeviceVerdict.setState({ userId: null, verdict: null, validUntil: null, hydrated: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('checks the phone on launch for the signed-in player and keeps the verdict', async () => {
    answers({ kind: 'checked', verdict: 'pass', validUntil: at(6 * HOUR), enforced: true });

    await renderHook(() => useDeviceCheck());
    await settle();

    expect(check).toHaveBeenCalledTimes(1);
    expect(check).toHaveBeenCalledWith('player-1');
    expect(useDeviceVerdict.getState()).toMatchObject({
      userId: 'player-1',
      verdict: 'pass',
      validUntil: at(6 * HOUR),
    });
  });

  it('asks nothing without a signed-in player', async () => {
    useSession.setState({ token: null, user: null, ranks: null, hydrated: true });

    await renderHook(() => useDeviceCheck());
    await settle();

    expect(check).not.toHaveBeenCalled();
  });

  it('leaves a verdict that still stands, and asks again just before it runs out', async () => {
    stored('player-1', 'pass', at(6 * HOUR));
    answers({ kind: 'checked', verdict: 'pass', validUntil: at(12 * HOUR), enforced: true });

    await renderHook(() => useDeviceCheck());
    await settle();
    expect(check).not.toHaveBeenCalled();

    await advance(6 * HOUR - REFRESH_EARLY_MS - 1);
    expect(check).not.toHaveBeenCalled();

    await advance(1);
    expect(check).toHaveBeenCalledTimes(1);
    expect(useDeviceVerdict.getState().validUntil).toBe(at(12 * HOUR));
  });

  it('asks again when the app comes back after the verdict ran out', async () => {
    stored('player-1', 'fail', at(HOUR));
    answers({ kind: 'checked', verdict: 'fail', validUntil: at(14 * HOUR), enforced: true });

    await renderHook(() => useDeviceCheck());
    await settle();
    await foreground();
    expect(check).not.toHaveBeenCalled();

    // Two hours in the background, where no timer runs.
    jest.setSystemTime(NOW + 2 * HOUR);
    await foreground();

    expect(check).toHaveBeenCalledTimes(1);
    expect(useDeviceVerdict.getState().validUntil).toBe(at(14 * HOUR));
  });

  it('checks again for another player’s verdict', async () => {
    stored('player-2', 'pass', at(6 * HOUR));
    answers({ kind: 'checked', verdict: 'fail', validUntil: at(12 * HOUR), enforced: true });

    await renderHook(() => useDeviceCheck());
    await settle();

    expect(check).toHaveBeenCalledWith('player-1');
    expect(useDeviceVerdict.getState()).toMatchObject({ userId: 'player-1', verdict: 'fail' });
  });

  it('tries again later after a check that failed on the way, never sooner', async () => {
    answers({ kind: 'failed' }, { kind: 'checked', verdict: 'pass', validUntil: at(6 * HOUR), enforced: true });

    await renderHook(() => useDeviceCheck());
    await settle();
    expect(check).toHaveBeenCalledTimes(1);
    expect(useDeviceVerdict.getState().verdict).toBeNull();

    await foreground();
    await advance(RETRY_MS - 1);
    expect(check).toHaveBeenCalledTimes(1);

    await advance(1);
    expect(check).toHaveBeenCalledTimes(2);
    expect(useDeviceVerdict.getState().verdict).toBe('pass');
  });

  it('does not ask a short-lived verdict again at once', async () => {
    answers(
      { kind: 'checked', verdict: 'pass', validUntil: at(60_000), enforced: true },
      { kind: 'checked', verdict: 'pass', validUntil: at(6 * HOUR), enforced: true },
    );

    await renderHook(() => useDeviceCheck());
    await settle();
    expect(check).toHaveBeenCalledTimes(1);

    await advance(RETRY_MS - 1);
    expect(check).toHaveBeenCalledTimes(1);
    await advance(1);
    expect(check).toHaveBeenCalledTimes(2);
  });

  it('stops asking a phone that cannot vouch for itself until the next launch', async () => {
    answers({ kind: 'unsupported' });

    await renderHook(() => useDeviceCheck());
    await settle();
    await advance(RETRY_MS * 3);
    jest.setSystemTime(NOW + 24 * HOUR);
    await foreground();

    expect(check).toHaveBeenCalledTimes(1);
  });
});
