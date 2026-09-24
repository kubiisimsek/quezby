import AsyncStorage from '@react-native-async-storage/async-storage';

import { PENDING_TTL_MS, usePendingRun } from '@/stores/pendingRun';

const run = { runId: 'r1', actions: [[1, 400, 0]] as [number, number, number][], clientScore: 10, clientReels: 1 };

describe('pending run', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    usePendingRun.setState({ run: null, hydrated: false });
  });

  it('keeps a run across restarts until it is cleared', async () => {
    usePendingRun.getState().keep({ ...run, savedAt: Date.now() });
    usePendingRun.setState({ run: null, hydrated: false });

    await usePendingRun.getState().hydrate();
    expect(usePendingRun.getState().run).toMatchObject({ runId: 'r1' });

    usePendingRun.getState().clear();
    usePendingRun.setState({ run: null, hydrated: false });
    await usePendingRun.getState().hydrate();
    expect(usePendingRun.getState().run).toBeNull();
  });

  it('forgets a run the server has let expire', async () => {
    await AsyncStorage.setItem('quezby.pendingRun.v1', JSON.stringify({ ...run, savedAt: Date.now() - PENDING_TTL_MS - 1 }));

    await usePendingRun.getState().hydrate();

    expect(usePendingRun.getState().run).toBeNull();
    expect(await AsyncStorage.getItem('quezby.pendingRun.v1')).toBeNull();
  });
});
