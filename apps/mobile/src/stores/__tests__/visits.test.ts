import AsyncStorage from '@react-native-async-storage/async-storage';
import { ANALYTICS } from '@quezby/config';

import { closeVisit, openVisit, seeScreen, type ClosedVisit } from '@/analytics/visit';
import { useVisits } from '@/stores/visits';

const KEY = 'quezby.visits.v1';
const NOW = Date.parse('2026-09-26T09:00:00.000Z');

function closed(endedAt: number, id = String(endedAt).padStart(32, '0')): ClosedVisit {
  const visit = closeVisit(openVisit(endedAt - 60_000, null, '1.0.0', id), endedAt);
  if (!visit) throw new Error('a visit of a minute counts');
  return visit;
}

async function stored(): Promise<{ current: unknown; outbox: ClosedVisit[]; pausedUntil: number }> {
  return JSON.parse((await AsyncStorage.getItem(KEY)) ?? 'null');
}

describe('visits', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('closes the visit the last launch left open, where it stopped', async () => {
    const left = { ...seeScreen(openVisit(NOW - 120_000, 'owner', '1.0.0', 'c'.repeat(32)), 'home', NOW - 120_000), touchedAt: NOW - 30_000 };
    await AsyncStorage.setItem(KEY, JSON.stringify({ current: left, outbox: [], pausedUntil: 0 }));

    await useVisits.getState().hydrate(NOW);

    const { current, outbox } = useVisits.getState();
    expect(current).toBeNull();
    expect(outbox).toHaveLength(1);
    expect(outbox[0]).toMatchObject({ owner: 'owner', endedAt: NOW - 30_000, visit: { id: 'c'.repeat(32), seconds: 90 } });
    expect((await stored()).current).toBeNull();
  });

  it('throws away what it cannot read, and visits older than the API takes', async () => {
    const week = ANALYTICS.maxAgeDays * 86_400_000;
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({ current: { id: 7 }, outbox: [closed(NOW - week - 1_000), closed(NOW - 1_000), 'junk'], pausedUntil: 'soon' }),
    );

    await useVisits.getState().hydrate(NOW);

    expect(useVisits.getState().outbox.map((visit) => visit.endedAt)).toEqual([NOW - 1_000]);
    expect(useVisits.getState().pausedUntil).toBe(0);
  });

  it('starts empty on a phone that never recorded, and on one it cannot read', async () => {
    await useVisits.getState().hydrate(NOW);
    expect(useVisits.getState()).toMatchObject({ current: null, outbox: [], hydrated: true });

    await AsyncStorage.setItem(KEY, '{not json');
    useVisits.setState({ hydrated: false, outbox: [] });
    await useVisits.getState().hydrate(NOW);
    expect(useVisits.getState()).toMatchObject({ current: null, outbox: [], hydrated: true });
  });

  it('keeps a finished visit to send, and only the newest few', async () => {
    useVisits.setState({ hydrated: true, outbox: Array.from({ length: ANALYTICS.outbox }, (_, index) => closed(Date.now() - 10_000 + index)) });
    useVisits.getState().begin(openVisit(Date.now() - 5_000, null, '1.0.0', 'd'.repeat(32)));

    useVisits.getState().finish(Date.now());

    const { outbox, current } = useVisits.getState();
    expect(current).toBeNull();
    expect(outbox).toHaveLength(ANALYTICS.outbox);
    expect(outbox[outbox.length - 1]?.visit.id).toBe('d'.repeat(32));
    expect((await stored()).outbox).toHaveLength(ANALYTICS.outbox);
  });

  it('drops a visit too short to count', () => {
    useVisits.getState().begin(openVisit(Date.now(), null, '1.0.0'));

    useVisits.getState().finish(Date.now());

    expect(useVisits.getState().outbox).toEqual([]);
  });

  it('forgets everything on a no, and records nothing through a pause', async () => {
    useVisits.setState({ outbox: [closed(NOW)], current: openVisit(NOW, null, '1.0.0') });

    useVisits.getState().forget();
    expect(useVisits.getState()).toMatchObject({ current: null, outbox: [] });

    useVisits.setState({ outbox: [closed(NOW)] });
    useVisits.getState().pause(NOW + 1_000);
    expect(useVisits.getState()).toMatchObject({ current: null, outbox: [], pausedUntil: NOW + 1_000 });
    expect((await stored()).pausedUntil).toBe(NOW + 1_000);
  });

  it('drops the visits it is told to', () => {
    useVisits.setState({ outbox: [closed(NOW, 'a'.repeat(32)), closed(NOW, 'b'.repeat(32))] });

    useVisits.getState().drop(['a'.repeat(32)]);

    expect(useVisits.getState().outbox.map((visit) => visit.visit.id)).toEqual(['b'.repeat(32)]);
  });
});
