import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { sendVisits } from '@/analytics/send';
import { trackScreen } from '@/analytics/track';
import { closeVisit, openVisit, ownerOf } from '@/analytics/visit';
import { useSession } from '@/auth/session';
import { HEARTBEAT_MS, useAnalytics } from '@/hooks/useAnalytics';
import { useSettings } from '@/stores/settings';
import { useVisits } from '@/stores/visits';

jest.mock('@/analytics/send', () => ({ sendVisits: jest.fn(async () => undefined) }));

const NOW = Date.parse('2026-09-26T10:00:00.000Z');

async function settle() {
  await act(async () => {
    for (let tick = 0; tick < 10; tick += 1) await Promise.resolve();
  });
}

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

/** The app goes to `state`, as iOS and Android say it. */
async function appState(state: AppStateStatus) {
  const listeners = jest
    .mocked(AppState.addEventListener)
    .mock.calls.filter(([type]) => type === 'change')
    .map(([, listener]) => listener as (next: AppStateStatus) => void);
  await act(async () => {
    for (const listener of listeners) listener(state);
  });
  await settle();
}

function consenting(consent: 'pending' | 'synced' = 'synced') {
  useSession.setState({ token: 'token-a', hydrated: true });
  useSettings.setState({ hydrated: true, analytics: true, consent });
}

async function mount() {
  const hook = await renderHook(() => useAnalytics());
  await settle();
  return hook;
}

describe('useAnalytics', () => {
  beforeEach(async () => {
    jest.useFakeTimers({ now: NOW });
    jest.clearAllMocks();
    await AsyncStorage.clear();
    trackScreen('Home');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('begins a visit on the screen on show once the player said yes', async () => {
    consenting();

    await mount();

    const visit = useVisits.getState().current;
    expect(visit).toMatchObject({ owner: ownerOf('token-a'), startedAt: NOW, journey: [['home', 0]] });
  });

  it('records nothing without the player\'s yes', async () => {
    useSession.setState({ token: 'token-a', hydrated: true });
    useSettings.setState({ hydrated: true, analytics: false, consent: 'unasked' });

    await mount();

    expect(useVisits.getState().current).toBeNull();
  });

  it('pauses while something covers the app, and closes the visit as the app leaves — then sends it', async () => {
    consenting();
    await mount();

    await advance(30_000);
    await appState('inactive');
    expect(useVisits.getState().current?.activeSince).toBeNull();

    await advance(10_000);
    await appState('active');
    await advance(20_000);
    await appState('background');

    const { current, outbox } = useVisits.getState();
    expect(current).toBeNull();
    expect(outbox).toHaveLength(1);
    expect(outbox[0]?.visit).toMatchObject({ seconds: 50, journey: [['home', 0]] });
    expect(sendVisits).toHaveBeenCalled();
  });

  it('begins a new visit when the app comes back', async () => {
    consenting();
    await mount();
    const first = useVisits.getState().current?.id;
    await advance(5_000);
    await appState('background');

    await advance(600_000);
    await appState('active');

    expect(useVisits.getState().current?.id).not.toBe(first);
    expect(useVisits.getState().current?.startedAt).toBe(NOW + 605_000);
  });

  it('forgets the visit and everything waiting on a no', async () => {
    consenting();
    const earlier = closeVisit(openVisit(NOW - 60_000, null, '1.0.0'), NOW);
    useVisits.setState({ outbox: earlier ? [earlier] : [] });
    await mount();

    await act(async () => {
      useSettings.getState().answer(false);
    });

    expect(useVisits.getState()).toMatchObject({ current: null, outbox: [] });
  });

  it('closes one account\'s visit when another signs in', async () => {
    consenting();
    await mount();
    await advance(5_000);

    await act(async () => {
      useSession.setState({ token: 'token-b' });
    });

    const { current, outbox } = useVisits.getState();
    expect(outbox.map((visit) => visit.owner)).toEqual([ownerOf('token-a')]);
    expect(current?.owner).toBe(ownerOf('token-b'));
  });

  it('sends what waits once the account has the answer', async () => {
    consenting('pending');
    const earlier = closeVisit(openVisit(NOW - 60_000, null, '1.0.0'), NOW);
    await AsyncStorage.setItem('quezby.visits.v1', JSON.stringify({ current: null, outbox: [earlier], pausedUntil: 0 }));
    await mount();
    expect(sendVisits).not.toHaveBeenCalled();

    await act(async () => {
      useSettings.getState().synced(true);
    });

    expect(sendVisits).toHaveBeenCalled();
  });

  it('notes every minute that the visit is still going, so a killed app keeps its time', async () => {
    consenting();
    await mount();

    await advance(HEARTBEAT_MS);

    expect(useVisits.getState().current?.touchedAt).toBe(NOW + HEARTBEAT_MS);
  });
});
