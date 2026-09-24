import AsyncStorage from '@react-native-async-storage/async-storage';

import { deviceFailed, useDeviceVerdict } from '@/stores/deviceVerdict';

const KEY = 'quezby.deviceVerdict.v1';
const NOW = Date.parse('2026-09-26T10:00:00.000Z');
const LATER = '2026-09-26T22:00:00.000Z';
const EARLIER = '2026-09-26T09:00:00.000Z';

describe('device verdict', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useDeviceVerdict.setState({ userId: null, verdict: null, validUntil: null, hydrated: false });
  });

  it('keeps the API’s verdict for the player across restarts', async () => {
    useDeviceVerdict.getState().record('player-1', { verdict: 'fail', validUntil: LATER, enforced: true });
    useDeviceVerdict.setState({ userId: null, verdict: null, validUntil: null, hydrated: false });

    await useDeviceVerdict.getState().hydrate();

    expect(useDeviceVerdict.getState()).toMatchObject({
      userId: 'player-1',
      verdict: 'fail',
      validUntil: LATER,
      hydrated: true,
    });
  });

  it('ignores whatever else is stored under its key', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({ userId: 'player-1', verdict: 'maybe', validUntil: LATER, enforced: true }));

    await useDeviceVerdict.getState().hydrate();

    expect(useDeviceVerdict.getState()).toMatchObject({ verdict: null, hydrated: true });
  });

  it('survives storage it cannot read', async () => {
    await AsyncStorage.setItem(KEY, '{not json');

    await useDeviceVerdict.getState().hydrate();

    expect(useDeviceVerdict.getState()).toMatchObject({ verdict: null, hydrated: true });
  });

  describe('deviceFailed', () => {
    const failed = { userId: 'player-1', verdict: 'fail', validUntil: LATER, enforced: true } as const;

    it('is true while a failing verdict for this player stands', () => {
      expect(deviceFailed(failed, 'player-1', NOW)).toBe(true);
    });

    it('is false for another player, once the verdict ran out, or for any other verdict', () => {
      expect(deviceFailed(failed, 'player-2', NOW)).toBe(false);
      expect(deviceFailed(failed, null, NOW)).toBe(false);
      expect(deviceFailed({ ...failed, validUntil: EARLIER, enforced: true }, 'player-1', NOW)).toBe(false);
      expect(deviceFailed({ ...failed, verdict: 'pass' }, 'player-1', NOW)).toBe(false);
      expect(deviceFailed({ ...failed, verdict: 'unavailable' }, 'player-1', NOW)).toBe(false);
      expect(deviceFailed({ userId: null, verdict: null, validUntil: null, enforced: true }, 'player-1', NOW)).toBe(false);
    });

    it('is false while the API only records verdicts — nothing is kept off the boards then', () => {
      expect(deviceFailed({ ...failed, enforced: false }, 'player-1', NOW)).toBe(false);
    });
  });
});
