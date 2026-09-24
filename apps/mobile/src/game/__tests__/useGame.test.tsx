import { ENGINE_VERSION } from '@quezby/engine';
import { CHECKPOINTS, CONTENT_VERSION, PACE, exitDelayMs, prefixHash } from '@quezby/config';
import { ApiError } from '@quezby/sdk';
import type { CheckpointRequest, FinishRunRequest } from '@quezby/types';
import { act, renderHook, type RenderHookResult } from '@testing-library/react-native';

import { api } from '@/api/client';
import { useGame } from '@/game/useGame';
import { usePendingRun } from '@/stores/pendingRun';

jest.mock('@/api/client', () => ({
  api: { runs: { start: jest.fn(), finish: jest.fn(), checkpoint: jest.fn() } },
}));

const runs = (api as unknown as {
  runs: { start: jest.Mock; finish: jest.Mock; checkpoint: jest.Mock };
}).runs;

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
    // Ended before the first mark: no checkpoint, and none claimed.
    expect(runs.checkpoint).not.toHaveBeenCalled();
    expect(runs.finish.mock.calls[0]?.[1]).not.toHaveProperty('checkpoints');
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

type Game = RenderHookResult<ReturnType<typeof useGame>, unknown>;

/** The game clock the hook reads — faked with the timers. */
function clockNow(): number {
  const clock = (globalThis as { performance?: { now: () => number } }).performance;
  if (!clock) throw new Error('No performance clock in this runtime.');
  return clock.now();
}

const COUNTDOWN_MS = PACE.countdownStepMs * PACE.countdownSteps;
const REACTION_MS = 300;

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

/** Starts a run and lets the 3-2-1 end: the first reel is up and the game clock reads zero. */
async function afterCountdown(
  start: (game: Game) => Promise<void> = (game) => game.result.current.start(),
): Promise<{ game: Game; goAt: number }> {
  const game = await renderHook(() => useGame('free'));
  await act(async () => {
    await start(game);
  });
  const goAt = clockNow() + COUNTDOWN_MS;
  await advance(COUNTDOWN_MS);
  return { game, goAt };
}

/**
 * A thumb that never misses: every reel answered the right way, `REACTION_MS`
 * after it comes up, through the same touches the screen would send — until
 * a verdict lands at or past `untilMs` on the game clock. Returns the game
 * clock at each verdict.
 */
async function playPerfectly(game: Game, goAt: number, untilMs: number): Promise<number[]> {
  const verdicts: number[] = [];
  while ((verdicts[verdicts.length - 1] ?? -1) < untilMs) {
    const reel = game.result.current.reel;
    const { touches } = game.result.current;
    if (!reel) throw new Error('No reel is up.');

    if (reel.kind === 'freeze') {
      await advance(reel.window);
    } else {
      await advance(REACTION_MS);
      if (reel.kind === 'skip') {
        await act(async () => {
          touches.onTouchStart(600);
          touches.onTouchMove(520);
          touches.onTouchEnd(480);
        });
      } else if (reel.kind === 'like') {
        await act(async () => {
          touches.onTouchStart(600);
          touches.onTouchEnd(600);
          touches.onTouchStart(600);
        });
      } else {
        await act(async () => {
          touches.onTouchStart(600);
        });
        await advance(Math.round((reel.zoneCenter * reel.holdFill) / 1000));
        await act(async () => {
          touches.onTouchEnd(600);
        });
      }
    }
    verdicts.push(clockNow() - goAt);

    await advance(exitDelayMs(true, reel.kind) + PACE.slideMs);
    if (game.result.current.reel?.index !== reel.index + 1) {
      throw new Error(`Reel ${reel.index} (${reel.kind}) was not answered the way the thumb meant.`);
    }
  }
  return verdicts;
}

type CheckIn = CheckpointRequest & { runId: string; at: number };

/** The API stamping each checkpoint: `receipt-<reel>`, and when it saw it. */
function stampCheckpoints(): CheckIn[] {
  const seen: CheckIn[] = [];
  runs.checkpoint.mockImplementation(async (runId: string, body: CheckpointRequest) => {
    seen.push({ runId, ...body, at: clockNow() });
    return { receipt: `receipt-${body.reel}` };
  });
  return seen;
}

function finished(): FinishRunRequest {
  const request = runs.finish.mock.calls.at(-1)?.[1] as FinishRunRequest | undefined;
  if (!request) throw new Error('The run was never finished.');
  return request;
}

const FIRST_MARK = CHECKPOINTS.marksMs[0];
const LAST_MARK = CHECKPOINTS.marksMs[CHECKPOINTS.marksMs.length - 1] ?? FIRST_MARK;
const answer = { run: { score: 1 }, best: null, ranks: {}, isNewBest: false };

describe('useGame checkpoints', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    runs.checkpoint.mockReset();
    usePendingRun.setState({ run: null, hydrated: true });
    runs.start.mockResolvedValue(started);
    runs.finish.mockResolvedValue(answer);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('checks in at the first verdict past each mark, with exactly the moves so far', async () => {
    const seen = stampCheckpoints();
    const { game, goAt } = await afterCountdown();

    const verdicts = await playPerfectly(game, goAt, LAST_MARK + 2_000);
    await act(async () => {
      game.result.current.quit();
    });

    const { actions, checkpoints } = finished();
    expect(seen).toHaveLength(CHECKPOINTS.marksMs.length);
    seen.forEach((checkIn, index) => {
      const mark = CHECKPOINTS.marksMs[index] ?? Infinity;
      expect(checkIn.runId).toBe('run-1');
      // The verdict that took the clock past the mark — the first one past it — sent it.
      expect(verdicts[checkIn.reel - 1]).toBeGreaterThanOrEqual(mark);
      expect(verdicts[checkIn.reel - 2]).toBeLessThan(mark);
      expect(checkIn.at - goAt).toBe(verdicts[checkIn.reel - 1]);
      // It commits to the start of the very log the finish carries.
      expect(checkIn.prefixHash).toBe(prefixHash(actions, checkIn.reel));
    });
    expect(checkpoints).toEqual(seen.map((checkIn) => `receipt-${checkIn.reel}`));
  });

  it('sends nothing before the game clock reaches the first mark', async () => {
    const seen = stampCheckpoints();
    const { game, goAt } = await afterCountdown();

    const verdicts = await playPerfectly(game, goAt, FIRST_MARK - 5_000);

    expect(Math.max(...verdicts)).toBeLessThan(FIRST_MARK);
    expect(seen).toHaveLength(0);
  });

  it('never checks a practice run in', async () => {
    stampCheckpoints();
    const { game, goAt } = await afterCountdown((hook) => hook.result.current.start('offline'));

    await playPerfectly(game, goAt, FIRST_MARK + 2_000);
    await act(async () => {
      game.result.current.quit();
    });

    expect(runs.checkpoint).not.toHaveBeenCalled();
    expect(runs.finish).not.toHaveBeenCalled();
    expect(game.result.current.outcome?.mode).toBe('practice');
  });

  it('keeps the receipts with an unsent finish, and sends them again', async () => {
    const seen = stampCheckpoints();
    runs.finish.mockReset();
    runs.finish.mockRejectedValueOnce(new ApiError(0, 'network', 'offline')).mockResolvedValueOnce(answer);
    const { game, goAt } = await afterCountdown();

    await playPerfectly(game, goAt, FIRST_MARK + 2_000);
    await act(async () => {
      game.result.current.quit();
    });

    const receipts = seen.map((checkIn) => `receipt-${checkIn.reel}`);
    expect(receipts).toHaveLength(1);
    expect(usePendingRun.getState().run).toMatchObject({ runId: 'run-1', checkpoints: receipts });

    await act(async () => {
      game.result.current.retrySubmit();
    });

    expect(finished().checkpoints).toEqual(receipts);
    expect(game.result.current.outcome).toEqual({ mode: 'verified', response: answer });
  });

  it('lets a checkpoint still on its way land before the finish goes', async () => {
    let land: (value: { receipt: string }) => void = () => undefined;
    runs.checkpoint.mockImplementation(
      () =>
        new Promise((resolve) => {
          land = resolve;
        }),
    );
    const { game, goAt } = await afterCountdown();

    await playPerfectly(game, goAt, FIRST_MARK);
    expect(runs.checkpoint).toHaveBeenCalledTimes(1);
    await act(async () => {
      game.result.current.quit();
    });

    expect(game.result.current.phase).toBe('finishing');
    expect(runs.finish).not.toHaveBeenCalled();

    await act(async () => {
      land({ receipt: 'late-receipt' });
    });

    expect(finished().checkpoints).toEqual(['late-receipt']);
    expect(game.result.current.phase).toBe('result');
  });

  it('does not hold the finish for a checkpoint that never answers', async () => {
    runs.checkpoint.mockImplementation(() => new Promise(() => undefined));
    const { game, goAt } = await afterCountdown();

    await playPerfectly(game, goAt, FIRST_MARK);
    await act(async () => {
      game.result.current.quit();
    });
    expect(runs.finish).not.toHaveBeenCalled();

    await advance(2_000);

    expect(finished()).not.toHaveProperty('checkpoints');
    expect(game.result.current.phase).toBe('result');
  });

  it('plays on when a checkpoint fails', async () => {
    runs.checkpoint.mockRejectedValue(new ApiError(0, 'network', 'offline'));
    const { game, goAt } = await afterCountdown();

    await playPerfectly(game, goAt, FIRST_MARK + 2_000);
    await act(async () => {
      game.result.current.quit();
    });

    expect(runs.checkpoint).toHaveBeenCalledTimes(1);
    expect(finished()).not.toHaveProperty('checkpoints');
    expect(game.result.current.outcome).toEqual({ mode: 'verified', response: answer });
  });
});
