import { ENGINE_VERSION } from '@quezby/engine';
import { CONTENT_VERSION } from '@quezby/config';
import { ApiError } from '@quezby/sdk';
import { act, renderHook } from '@testing-library/react-native';

import { api } from '@/api/client';
import { useGame } from '@/game/useGame';
import { usePendingRun } from '@/stores/pendingRun';

jest.mock('@/api/client', () => ({
  api: { runs: { start: jest.fn(), finish: jest.fn() } },
}));

const runs = (api as unknown as { runs: { start: jest.Mock; finish: jest.Mock } }).runs;

const started = {
  runId: 'run-1',
  seed: 42,
  engineVersion: ENGINE_VERSION,
  contentVersion: CONTENT_VERSION,
  mode: 'free',
  dayKey: null,
  startedAt: '2026-09-26T10:00:00.000Z',
};

/** Starts a run and lets the 3-2-1 finish, so a reel is live. */
async function playing(mode: 'free' | 'daily' = 'free') {
  const hook = await renderHook(() => useGame(mode));
  await act(async () => {
    await hook.result.current.start();
  });
  await act(async () => {
    jest.advanceTimersByTime(2000);
  });
  return hook;
}

describe('useGame', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    usePendingRun.setState({ run: null, hydrated: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts with the mode, the engine and the content catalog it plays', async () => {
    runs.start.mockResolvedValue(started);

    const hook = await playing('daily');

    expect(runs.start).toHaveBeenCalledWith({
      mode: 'daily',
      engineVersion: ENGINE_VERSION,
      contentVersion: CONTENT_VERSION,
    });
    expect(hook.result.current.phase).toBe('playing');
    expect(hook.result.current.combo).toBe(1000);
  });

  it('falls back to practice when the API plays another engine', async () => {
    runs.start.mockRejectedValue(new ApiError(422, 'engine_outdated', 'x'));

    const hook = await playing();

    expect(hook.result.current.practice).toBe('outdated');
    expect(hook.result.current.phase).toBe('playing');
  });

  it('tells the screen when today\'s one attempt is gone', async () => {
    runs.start.mockRejectedValue(new ApiError(409, 'daily_already_played', 'x'));

    const hook = await renderHook(() => useGame('daily'));
    await act(async () => {
      await hook.result.current.start();
    });

    expect(hook.result.current.phase).toBe('error');
    expect(hook.result.current.startError?.code).toBe('daily_already_played');
  });

  it('shows only what the API answered at the end', async () => {
    runs.start.mockResolvedValue(started);
    const answer = { run: { score: 1 }, best: null, ranks: {}, isNewBest: false };
    runs.finish.mockResolvedValue(answer);
    const hook = await playing();

    await act(async () => {
      hook.result.current.quit();
    });

    expect(runs.finish).toHaveBeenCalledWith('run-1', expect.objectContaining({ actions: [], clientScore: 0, clientReels: 0 }));
    expect(hook.result.current.phase).toBe('result');
    expect(hook.result.current.outcome).toEqual({ mode: 'verified', response: answer });
  });

  it('keeps the log when the network drops, and sends it again', async () => {
    runs.start.mockResolvedValue(started);
    runs.finish.mockRejectedValueOnce(new ApiError(0, 'network', 'offline'));
    const hook = await playing();

    await act(async () => {
      hook.result.current.quit();
    });

    expect(hook.result.current.outcome).toMatchObject({ mode: 'unsent', canRetry: true });
    expect(usePendingRun.getState().run).toMatchObject({ runId: 'run-1', actions: [] });

    const answer = { run: { score: 1 }, best: null, ranks: {}, isNewBest: false };
    runs.finish.mockResolvedValueOnce(answer);
    await act(async () => {
      hook.result.current.retrySubmit();
    });

    expect(runs.finish).toHaveBeenLastCalledWith('run-1', { actions: [], clientScore: 0, clientReels: 0 });
    expect(hook.result.current.outcome).toEqual({ mode: 'verified', response: answer });
    expect(usePendingRun.getState().run).toBeNull();
  });

  it('drops the log when the API refused it for good', async () => {
    runs.start.mockResolvedValue(started);
    runs.finish.mockRejectedValueOnce(new ApiError(410, 'run_expired', 'x'));
    const hook = await playing();

    await act(async () => {
      hook.result.current.quit();
    });

    expect(hook.result.current.outcome).toMatchObject({ mode: 'unsent', canRetry: false });
    expect(usePendingRun.getState().run).toBeNull();
  });
});
