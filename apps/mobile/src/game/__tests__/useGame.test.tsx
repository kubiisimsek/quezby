import { DIFFICULTY_VERSION, ENGINE_VERSION, GESTURE, drainFor } from '@quezby/engine';
import { CHECKPOINTS, CONTENT_VERSION, PACE, exitDelayMs, prefixHash } from '@quezby/config';
import { ApiError } from '@quezby/sdk';
import type { CheckpointRequest, FinishRunRequest } from '@quezby/types';
import { act, renderHook, type RenderHookResult } from '@testing-library/react-native';
import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';

import { track } from '@/analytics/track';
import { api } from '@/api/client';
import { useGame } from '@/game/useGame';
import { useLanguage } from '@/i18n/language';
import { usePendingRun } from '@/stores/pendingRun';

jest.mock('@/analytics/track', () => ({ track: jest.fn() }));

jest.mock('@/api/client', () => ({
  api: { runs: { start: jest.fn(), finish: jest.fn(), checkpoint: jest.fn(), cancel: jest.fn() } },
}));

const runs = (api as unknown as {
  runs: { start: jest.Mock; finish: jest.Mock; checkpoint: jest.Mock; cancel: jest.Mock };
}).runs;

const started = {
  runId: 'run-1',
  seed: 42,
  engineVersion: ENGINE_VERSION,
  contentVersion: CONTENT_VERSION,
  difficulty: 0,
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
      difficultyVersion: DIFFICULTY_VERSION,
    });
    expect(hook.result.current.phase).toBe('playing');
    expect(hook.result.current.combo).toBe(1000);
    expect(hook.result.current.difficulty).toBe(0);
  });

  it('plays a rated run at the difficulty the API handed it', async () => {
    runs.start.mockResolvedValue({ ...started, mode: 'rated', difficulty: 12 });

    const hook = await renderHook(() => useGame('rated'));
    await act(async () => {
      await hook.result.current.start();
    });
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(runs.start).toHaveBeenCalledWith(expect.objectContaining({ mode: 'rated', difficultyVersion: DIFFICULTY_VERSION }));
    expect(hook.result.current.difficulty).toBe(12);
    // The same feed as Normal — difficulty only tightens the meter's gain and loss.
    expect(hook.result.current.reel?.drain).toBe(drainFor(0));
  });

  it('sends a VS to a friend: the start names them, and the run is played like any other', async () => {
    runs.start.mockResolvedValue({ ...started, mode: 'vs', duelId: '01jduel0000000000000000001' });

    const hook = await renderHook(() => useGame('vs', { opponent: 'ekin' }));
    await act(async () => {
      await hook.result.current.start();
    });
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(runs.start).toHaveBeenCalledWith({
      mode: 'vs',
      engineVersion: ENGINE_VERSION,
      contentVersion: CONTENT_VERSION,
      difficultyVersion: DIFFICULTY_VERSION,
      opponent: 'ekin',
    });
    expect(hook.result.current.phase).toBe('playing');
  });

  it('answers a friend’s VS on its own seed', async () => {
    runs.start.mockResolvedValue({ ...started, mode: 'vs', duelId: '01jduel0000000000000000001' });

    const hook = await renderHook(() => useGame('vs', { opponent: 'ekin', duelId: '01jduel0000000000000000001' }));
    await act(async () => {
      await hook.result.current.start();
    });

    expect(runs.start).toHaveBeenCalledWith({
      mode: 'vs',
      engineVersion: ENGINE_VERSION,
      contentVersion: CONTENT_VERSION,
      difficultyVersion: DIFFICULTY_VERSION,
      duel: '01jduel0000000000000000001',
    });
  });

  it('never plays a VS on the phone alone: an outdated app cannot start one', async () => {
    runs.start.mockRejectedValue(new ApiError(422, 'engine_outdated', 'Güncelle.'));

    const hook = await renderHook(() => useGame('vs', { opponent: 'ekin' }));
    await act(async () => {
      await hook.result.current.start();
    });

    expect(hook.result.current.phase).toBe('error');
    expect(hook.result.current.practice).toBeNull();
    expect(hook.result.current.startError?.code).toBe('engine_outdated');
  });

  it('never plays a rated run on the phone alone: an outdated app cannot start one', async () => {
    runs.start.mockRejectedValue(new ApiError(422, 'engine_outdated', 'Güncelle.'));

    const hook = await renderHook(() => useGame('rated'));
    await act(async () => {
      await hook.result.current.start();
    });

    expect(runs.start).toHaveBeenCalledWith(expect.objectContaining({ mode: 'rated' }));
    expect(hook.result.current.phase).toBe('error');
    expect(hook.result.current.practice).toBeNull();
    expect(hook.result.current.startError?.code).toBe('engine_outdated');
  });

  it('says so when Dereceli is not open to the player yet', async () => {
    runs.start.mockRejectedValue(new ApiError(409, 'rated_locked', 'Dereceli henüz açılmadı.'));

    const hook = await renderHook(() => useGame('rated'));
    await act(async () => {
      await hook.result.current.start();
    });

    expect(hook.result.current.phase).toBe('error');
    expect(hook.result.current.startError?.code).toBe('rated_locked');
  });

  it('says why a VS cannot start', async () => {
    runs.start.mockRejectedValue(new ApiError(409, 'duel_unavailable', 'Bu VS artık oynanamaz.'));

    const hook = await renderHook(() => useGame('vs', { opponent: 'ekin', duelId: '01jduel0000000000000000001' }));
    await act(async () => {
      await hook.result.current.start();
    });

    expect(hook.result.current.phase).toBe('error');
    expect(hook.result.current.startError?.code).toBe('duel_unavailable');
  });

  it('falls back to practice when the API plays another engine', async () => {
    runs.start.mockRejectedValue(new ApiError(422, 'engine_outdated', 'x'));

    const hook = await playing();

    expect(hook.result.current.practice).toBe('outdated');
    expect(hook.result.current.phase).toBe('playing');
    expect(track).toHaveBeenCalledWith('outdated_run');
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

  it('words why a run could not start in the language on screen, even one picked after', async () => {
    runs.start.mockRejectedValue(new ApiError(0, 'network', 'offline'));

    const hook = await renderHook(() => useGame('daily'));
    await act(async () => {
      await hook.result.current.start();
    });

    expect(hook.result.current.startError).toEqual({
      code: 'network',
      message: 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.',
    });

    await act(async () => {
      useLanguage.setState({ locale: 'en' });
    });
    expect(hook.result.current.startError).toEqual({
      code: 'network',
      message: "Couldn't reach the server. Check your internet connection.",
    });
  });

  it('walks away from a countdown and tells the API, which lets it go for nothing', async () => {
    runs.start.mockResolvedValue(started);
    runs.cancel.mockResolvedValue(undefined);
    const hook = await renderHook(() => useGame('free'));
    await act(async () => {
      await hook.result.current.start();
    });
    expect(hook.result.current.phase).toBe('countdown');

    await act(async () => {
      hook.result.current.quit();
    });

    expect(runs.cancel).toHaveBeenCalledWith('run-1');
    expect(runs.finish).not.toHaveBeenCalled();
    expect(hook.result.current.phase).toBe('countdown');
  });

  it('never cancels a run that is under way: closing it sends its score', async () => {
    runs.start.mockResolvedValue(started);
    runs.finish.mockResolvedValue({ run: { score: 0 }, best: null, ranks: {}, isNewBest: false });
    const hook = await playing();

    await act(async () => {
      hook.result.current.quit();
    });

    expect(runs.cancel).not.toHaveBeenCalled();
    expect(runs.finish).toHaveBeenCalled();
  });

  it('sends a finish kept on the phone before it starts another run', async () => {
    usePendingRun.setState({
      run: { runId: 'run-0', actions: [[1, 400, 0]], clientScore: 120, clientReels: 1, savedAt: Date.now() },
      hydrated: true,
    });
    const order: string[] = [];
    runs.finish.mockImplementation(async (runId: string) => {
      order.push(`finish ${runId}`);
      return { run: { score: 120 } };
    });
    runs.start.mockImplementation(async () => {
      order.push('start');
      return started;
    });

    const hook = await renderHook(() => useGame('free'));
    await act(async () => {
      await hook.result.current.start();
    });

    expect(order).toEqual(['finish run-0', 'start']);
    expect(usePendingRun.getState().run).toBeNull();
    expect(hook.result.current.phase).toBe('countdown');
  });

  it('starts anyway when a finish kept on the phone still cannot be sent', async () => {
    const kept = { runId: 'run-0', actions: [], clientScore: 0, clientReels: 0, savedAt: Date.now() };
    usePendingRun.setState({ run: kept, hydrated: true });
    runs.finish.mockRejectedValue(new ApiError(0, 'network', 'offline'));
    runs.start.mockResolvedValue(started);

    const hook = await renderHook(() => useGame('free'));
    await act(async () => {
      await hook.result.current.start();
    });

    expect(runs.start).toHaveBeenCalled();
    expect(usePendingRun.getState().run).toEqual(kept);
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
    expect(track).toHaveBeenCalledWith('unsent_run');

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

  it('words an unsent finish in the language on screen', async () => {
    runs.start.mockResolvedValue(started);
    runs.finish.mockRejectedValueOnce(new ApiError(410, 'run_expired', 'x'));
    const hook = await playing();

    await act(async () => {
      hook.result.current.quit();
    });
    expect(hook.result.current.outcome).toEqual({
      mode: 'unsent',
      message: 'Tur çok uzun sürdüğü için süresi doldu.',
      canRetry: false,
    });

    await act(async () => {
      useLanguage.setState({ locale: 'ar' });
    });
    expect(hook.result.current.outcome).toEqual({
      mode: 'unsent',
      message: 'استغرقت الجولة وقتًا طويلًا فانتهت صلاحيتها.',
      canRetry: false,
    });
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

/** How the API answers one check-in: `afterMs` after it was sent, with `error` or else a receipt. */
type Reply = { afterMs: number; error?: ApiError };

/**
 * The API answering check-ins in turn as `replies` script them — past the
 * script, the last reply again — with `receipt-<reel>` receipts. Records each
 * check-in, and when each failure reached the app.
 */
function replyToCheckIns(...replies: [Reply, ...Reply[]]): { seen: CheckIn[]; failedAt: number[] } {
  const seen: CheckIn[] = [];
  const failedAt: number[] = [];
  runs.checkpoint.mockImplementation((runId: string, body: CheckpointRequest) => {
    const { afterMs, error } = replies[Math.min(seen.length, replies.length - 1)] ?? replies[0];
    seen.push({ runId, ...body, at: clockNow() });
    const response = new Promise<{ receipt: string }>((resolve, reject) => {
      const reply = () => {
        if (error) reject(error);
        else resolve({ receipt: `receipt-${body.reel}` });
      };
      if (afterMs > 0) setTimeout(reply, afterMs);
      else reply();
    });
    response.catch(() => failedAt.push(clockNow()));
    return response;
  });
  return { seen, failedAt };
}

function finished(): FinishRunRequest {
  const request = runs.finish.mock.calls.at(-1)?.[1] as FinishRunRequest | undefined;
  if (!request) throw new Error('The run was never finished.');
  return request;
}

const FIRST_MARK = CHECKPOINTS.marksMs[0];
const SECOND_MARK = CHECKPOINTS.marksMs[1];
const LAST_MARK = CHECKPOINTS.marksMs[CHECKPOINTS.marksMs.length - 1] ?? FIRST_MARK;
/** How soon a lost check-in may go again, and how many of them a run sends again. */
const RETRY_AFTER_MS = 5_000;
const RETRIES = CHECKPOINTS.maxReceipts - CHECKPOINTS.marksMs.length;
const offline = new ApiError(0, 'network', 'The API could not be reached.');
const timedOut = new ApiError(0, 'timeout', 'The request timed out.');
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
    expect(track).toHaveBeenCalledWith('offline_run');

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

  it.each([
    { lost: 'a network error', reply: { afterMs: 0, error: offline } },
    { lost: 'a timeout', reply: { afterMs: 15_000, error: timedOut } },
    { lost: 'a 500', reply: { afterMs: 1_200, error: new ApiError(500, 'server_error', 'The API answered 500.') } },
  ])('tries a lost check-in again at a later verdict, no sooner than 5 s after — $lost', async ({ reply }) => {
    const { seen, failedAt } = replyToCheckIns(reply, { afterMs: 0 });
    const { game, goAt } = await afterCountdown();

    const verdicts = await playPerfectly(game, goAt, FIRST_MARK + 30_000);
    await act(async () => {
      game.result.current.quit();
    });

    const [lost, again] = seen;
    const failed = failedAt[0];
    if (!lost || !again || failed === undefined) throw new Error('No check-in was lost and sent again.');
    expect(seen).toHaveLength(2);
    // Right at a verdict: the first one at least 5 s after the failure reached the app.
    const due = failed - goAt + RETRY_AFTER_MS;
    expect(again.at - goAt).toBe(verdicts[again.reel - 1]);
    expect(verdicts[again.reel - 1]).toBeGreaterThanOrEqual(due);
    expect(verdicts[again.reel - 2]).toBeLessThan(due);
    // The reels and moves so far, as a mark's check-in would send — and its receipt rides with the finish.
    const { actions, checkpoints } = finished();
    expect(again.reel).toBeGreaterThan(lost.reel);
    expect(again.prefixHash).toBe(prefixHash(actions, again.reel));
    expect(checkpoints).toEqual([`receipt-${again.reel}`]);
  });

  it('gives up after two retries and plays on', async () => {
    const { seen } = replyToCheckIns({ afterMs: 0, error: offline });
    const { game, goAt } = await afterCountdown();

    await playPerfectly(game, goAt, SECOND_MARK + 10_000);
    await act(async () => {
      game.result.current.quit();
    });

    // The first mark's check-in and its two retries, then the second mark's — with none left for it.
    const sentAt = seen.map((checkIn) => checkIn.at - goAt);
    expect(sentAt).toHaveLength(2 + RETRIES);
    expect(sentAt.filter((at) => at < SECOND_MARK)).toHaveLength(1 + RETRIES);
    expect(finished()).not.toHaveProperty('checkpoints');
    expect(game.result.current.outcome).toEqual({ mode: 'verified', response: answer });
  });

  it('never sends more check-ins than a finish can carry', async () => {
    const { seen } = replyToCheckIns({ afterMs: 0, error: offline });
    const { game, goAt } = await afterCountdown();

    await playPerfectly(game, goAt, LAST_MARK + 20_000);
    await act(async () => {
      game.result.current.quit();
    });

    expect(seen).toHaveLength(CHECKPOINTS.maxReceipts);
    expect(finished()).not.toHaveProperty('checkpoints');
  });

  it.each([
    { refused: '409 run_already_finished', error: new ApiError(409, 'run_already_finished', 'x') },
    { refused: '410 run_expired', error: new ApiError(410, 'run_expired', 'x') },
    { refused: '422 validation_failed', error: new ApiError(422, 'validation_failed', 'x') },
    { refused: '429 too_many_requests', error: new ApiError(429, 'too_many_requests', 'x') },
    // A hosting firewall's HTML page: the SDK codes a 4xx that is not JSON as `server_error`.
    { refused: 'an HTML 403', error: new ApiError(403, 'server_error', 'The API answered 403.') },
  ])('does not retry what the API refused — $refused', async ({ error }) => {
    const { seen } = replyToCheckIns({ afterMs: 0, error });
    const { game, goAt } = await afterCountdown();

    await playPerfectly(game, goAt, FIRST_MARK + 15_000);

    expect(seen).toHaveLength(1);
  });

  it('a retried receipt rides with the finish in reel order', async () => {
    // The first mark's check-in is lost; the answer to its retry comes back after the second mark's.
    const slow = SECOND_MARK - FIRST_MARK;
    const { seen } = replyToCheckIns({ afterMs: 0, error: offline }, { afterMs: slow }, { afterMs: 0 });
    const { game, goAt } = await afterCountdown();

    await playPerfectly(game, goAt, SECOND_MARK + 15_000);
    await act(async () => {
      game.result.current.quit();
    });

    const [, again, second] = seen;
    if (!again || !second) throw new Error('The second mark never checked in.');
    expect(seen).toHaveLength(3);
    expect(second.at).toBeLessThan(again.at + slow);
    expect(again.reel).toBeLessThan(second.reel);
    expect(finished().checkpoints).toEqual([`receipt-${again.reel}`, `receipt-${second.reel}`]);
  });

  it('sends one check-in a verdict: one owed when a mark falls due waits for the next', async () => {
    // The same run played once with nothing lost, for its verdicts. A failure that reaches the
    // app at `lostAt` owes a check-in that falls due after the verdict before the second
    // mark's, and by the second mark's own.
    stampCheckpoints();
    const dry = await afterCountdown();
    const verdicts = await playPerfectly(dry.game, dry.goAt, SECOND_MARK);
    await dry.game.unmount();
    const [before = 0, markVerdict = 0] = verdicts.slice(-2);
    const firstVerdict = verdicts.find((at) => at >= FIRST_MARK);
    const lostAt = verdicts.find((at) => at + RETRY_AFTER_MS > before && at + RETRY_AFTER_MS <= markVerdict);
    if (firstVerdict === undefined || lostAt === undefined) throw new Error('No verdict on this seed to lose the check-in at.');

    // The first mark's check-in fails right then, however long that took; the rest go through.
    const { seen, failedAt } = replyToCheckIns({ afterMs: lostAt - firstVerdict, error: offline }, { afterMs: 0 });
    const { game, goAt } = await afterCountdown();
    await playPerfectly(game, goAt, SECOND_MARK + 2_000);

    const [, second, again] = seen;
    if (!second || !again) throw new Error('The owed check-in was never sent.');
    expect(seen).toHaveLength(3);
    // The second mark's goes alone at its verdict, though the owed one was due by then…
    expect(second.at - goAt).toBe(markVerdict);
    expect((failedAt[0] ?? Infinity) + RETRY_AFTER_MS).toBeLessThanOrEqual(second.at);
    // …and that one goes at the next.
    expect(again.reel).toBe(second.reel + 1);
  });

  it('starts each run clean: nothing the run before lost or spent carries over', async () => {
    // The first run spends its retries on the first mark and still owes one when it ends,
    // with the second mark's check-in on its way — it fails while the next run plays.
    const { seen, failedAt } = replyToCheckIns(
      { afterMs: 0, error: offline },
      { afterMs: 0, error: offline },
      { afterMs: 0, error: offline },
      { afterMs: 15_000, error: timedOut },
      { afterMs: 0, error: offline },
    );
    const { game, goAt } = await afterCountdown();
    await playPerfectly(game, goAt, SECOND_MARK);
    await act(async () => {
      game.result.current.quit();
    });
    await advance(2_000);

    runs.start.mockResolvedValue({ ...started, runId: 'run-2' });
    await act(async () => {
      await game.result.current.start();
    });
    const nextGoAt = clockNow() + COUNTDOWN_MS;
    await advance(COUNTDOWN_MS);
    await playPerfectly(game, nextGoAt, FIRST_MARK + 15_000);

    // The first run's: the first mark's and both retries, then the second mark's, still on its way…
    expect(seen.filter((checkIn) => checkIn.runId === 'run-1')).toHaveLength(2 + RETRIES);
    // …which failed while the next run played, before its first mark.
    expect(failedAt.filter((at) => at > nextGoAt && at < nextGoAt + FIRST_MARK)).toHaveLength(1);
    // The next run checks in at its own first mark and sends it again twice, as if nothing came before.
    const next = seen.filter((checkIn) => checkIn.runId === 'run-2').map((checkIn) => checkIn.at - nextGoAt);
    expect(next).toHaveLength(1 + RETRIES);
    expect(Math.min(...next)).toBeGreaterThanOrEqual(FIRST_MARK);
  });
});

/** Answers the reel that is up the right way, `REACTION_MS` after it goes live, and waits for the next. */
async function answerRight(game: Game) {
  const reel = game.result.current.reel;
  const { touches } = game.result.current;
  if (!reel) throw new Error('No reel is up.');
  if (reel.kind === 'freeze') {
    await advance(reel.window);
  } else {
    await advance(REACTION_MS);
    await act(async () => {
      if (reel.kind === 'skip') {
        touches.onTouchStart(600);
        touches.onTouchMove(520);
        touches.onTouchEnd(480);
      } else if (reel.kind === 'like') {
        touches.onTouchStart(600);
        touches.onTouchEnd(600);
        touches.onTouchStart(600);
      } else {
        touches.onTouchStart(600);
      }
    });
    if (reel.kind === 'hold') {
      await advance(Math.round((reel.zoneCenter * reel.holdFill) / 1000));
      await act(async () => {
        touches.onTouchEnd(600);
      });
    }
  }
  await advance(exitDelayMs(true, reel.kind) + PACE.slideMs);
}

/** Starts a new player's practice run: its first card is up, before the countdown. */
async function practiceRun(): Promise<Game> {
  const game = await renderHook(() => useGame('free'));
  await act(async () => {
    await game.result.current.start('tutorial');
  });
  return game;
}

async function dismiss(game: Game) {
  await act(async () => {
    game.result.current.dismissCoach();
  });
}

describe('useGame practice run', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    usePendingRun.setState({ run: null, hydrated: true });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('explains the first post before the countdown, and waits for the player', async () => {
    const game = await practiceRun();

    expect(game.result.current.phase).toBe('coach');
    expect(game.result.current.coach).toBe('skip');
    await advance(10_000);
    expect(game.result.current.phase).toBe('coach');

    await dismiss(game);
    expect(game.result.current.phase).toBe('countdown');
    expect(game.result.current.coach).toBeNull();
    await advance(COUNTDOWN_MS);
    expect(game.result.current.phase).toBe('playing');
    expect(game.result.current.reel?.index).toBe(0);
  });

  it('coaches each kind once, before its first post, and the pause never counts', async () => {
    const game = await practiceRun();
    await dismiss(game);
    await advance(COUNTDOWN_MS);
    const coached: string[] = ['skip'];

    while ((game.result.current.reel?.index ?? 0) < 8) {
      if (game.result.current.phase === 'coach') {
        const kind = game.result.current.coach;
        if (!kind) throw new Error('A card is up without a kind.');
        coached.push(kind);
        // Far longer than any window: under a card, no clock runs.
        await advance(10_000);
        expect(game.result.current.phase).toBe('coach');
        await dismiss(game);
        expect(game.result.current.phase).toBe('playing');
      }
      const index = game.result.current.reel?.index;
      await answerRight(game);
      expect(game.result.current.feedback?.verdict).toMatch(/^(hit|perfect)$/);
      expect(game.result.current.reel?.index).toBe((index ?? 0) + 1);
    }

    expect(coached).toEqual(['skip', 'like', 'hold', 'freeze']);
    expect(runs.start).not.toHaveBeenCalled();
    expect(runs.checkpoint).not.toHaveBeenCalled();
    expect(runs.finish).not.toHaveBeenCalled();
  });

  it('ignores touches while a card is up', async () => {
    const game = await practiceRun();
    await dismiss(game);
    await advance(COUNTDOWN_MS);
    await answerRight(game);
    await answerRight(game);
    expect(game.result.current.coach).toBe('like');

    await act(async () => {
      game.result.current.touches.onTouchStart(600);
      game.result.current.touches.onTouchEnd(600);
      game.result.current.touches.onTouchStart(600);
    });

    expect(game.result.current.phase).toBe('coach');
    expect(game.result.current.reel?.index).toBe(2);
  });

  it('closing ends it in its result — even in the countdown — with the kinds it never reached', async () => {
    const game = await practiceRun();
    await dismiss(game);
    expect(game.result.current.phase).toBe('countdown');

    await act(async () => {
      game.result.current.quit();
    });

    expect(game.result.current.phase).toBe('result');
    expect(game.result.current.outcome).toMatchObject({
      mode: 'practice',
      reason: 'tutorial',
      unseen: ['like', 'hold', 'freeze'],
      summary: { reels: 0, score: 0 },
    });
  });

  it('shows the cards again on a second try', async () => {
    const game = await practiceRun();
    await act(async () => {
      game.result.current.quit();
    });

    await act(async () => {
      await game.result.current.start('tutorial');
    });

    expect(game.result.current.phase).toBe('coach');
    expect(game.result.current.coach).toBe('skip');
  });

  it('keeps going when the app is left under a card, and ends when it is left mid-post', async () => {
    const listeners: Array<(state: AppStateStatus) => void> = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      listeners.push(listener);
      return { remove: jest.fn() } as unknown as NativeEventSubscription;
    });
    const game = await practiceRun();
    const leave = async () => {
      await act(async () => {
        for (const listener of listeners) listener('background');
      });
    };

    await leave();
    expect(game.result.current.phase).toBe('coach');

    await dismiss(game);
    await advance(COUNTDOWN_MS);
    await leave();
    expect(game.result.current.phase).toBe('result');
    expect(game.result.current.outcome).toMatchObject({ mode: 'practice', reason: 'tutorial' });
  });
});

/**
 * The frames a post waits for, held back — the phone still drawing — until
 * `draw()` lets them through.
 */
function holdFrames(): { draw: () => Promise<void> } {
  const frames = new Map<number, (time: number) => void>();
  let last = 0;
  jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
    last += 1;
    frames.set(last, callback);
    return last;
  });
  jest.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => {
    if (id != null) frames.delete(id);
  });
  return {
    draw: async () => {
      await act(async () => {
        const due = [...frames.values()];
        frames.clear();
        for (const callback of due) callback(clockNow());
      });
    },
  };
}

/** Sending the app to the background, through the listener the hook subscribed. */
function leavingTheApp(): () => Promise<void> {
  const listeners: Array<(state: AppStateStatus) => void> = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    listeners.push(listener);
    return { remove: jest.fn() } as unknown as NativeEventSubscription;
  });
  return async () => {
    await act(async () => {
      for (const listener of listeners) listener('background');
    });
  };
}

/** A swipe as the screen sends it: down, and up past the swipe distance at once. */
async function swipe(game: Game) {
  await act(async () => {
    game.result.current.touches.onTouchStart(600);
    game.result.current.touches.onTouchMove(520);
    game.result.current.touches.onTouchEnd(480);
  });
}

async function touch(game: Game, kind: 'start' | 'move' | 'end', y: number) {
  await act(async () => {
    const { touches } = game.result.current;
    if (kind === 'start') touches.onTouchStart(y);
    else if (kind === 'move') touches.onTouchMove(y);
    else touches.onTouchEnd(y);
  });
}

/** Closes the run and returns the log it sent the API. */
async function logOf(game: Game): Promise<FinishRunRequest['actions']> {
  await act(async () => {
    game.result.current.quit();
  });
  const call = runs.finish.mock.calls.at(-1) as [string, FinishRunRequest] | undefined;
  if (!call) throw new Error('The run was never sent.');
  return call[1].actions;
}

/** Plays the intro's first four posts right: the gold one (index 4) is up, live. */
async function atTheGoldPost(): Promise<Game> {
  const { game } = await afterCountdown();
  for (let i = 0; i < 4; i += 1) await answerRight(game);
  const reel = game.result.current.reel;
  if (reel?.kind !== 'hold') throw new Error('The intro’s fifth post is gold.');
  return game;
}

describe('useGame timing', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    usePendingRun.setState({ run: null, hydrated: true });
    runs.start.mockResolvedValue(started);
    runs.finish.mockResolvedValue({ run: { score: 0 }, best: null, ranks: {}, isNewBest: false });
    runs.checkpoint.mockResolvedValue({ receipt: 'receipt' });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('a post goes live on its first drawn frame — the phone’s drawing is not the player’s time', async () => {
    const frames = holdFrames();
    const { game } = await afterCountdown();

    // Still being drawn: a swipe is not the post's, and no window runs out.
    await swipe(game);
    await advance(2_700);
    expect(game.result.current.feedback).toBeNull();
    expect(game.result.current.reel?.index).toBe(0);

    await frames.draw();
    await advance(REACTION_MS);
    await swipe(game);

    expect(game.result.current.feedback?.verdict).toBe('hit');
    expect(await logOf(game)).toEqual([[GESTURE.up, REACTION_MS, 0]]);
  });

  it('never gives a post a finger that landed before its frame', async () => {
    const frames = holdFrames();
    const { game } = await afterCountdown();

    await touch(game, 'start', 600);
    await frames.draw();
    await touch(game, 'move', 520);
    await touch(game, 'end', 480);
    expect(game.result.current.feedback).toBeNull();

    await advance(REACTION_MS);
    await swipe(game);
    expect(await logOf(game)).toEqual([[GESTURE.up, REACTION_MS, 0]]);
  });

  it('starts a post that waited under a coach card on its frame, not on “Anladım”', async () => {
    const game = await practiceRun();
    await dismiss(game);
    await advance(COUNTDOWN_MS);
    await answerRight(game);
    await answerRight(game);
    expect(game.result.current.coach).toBe('like');
    const before = game.result.current.feedback?.id;
    const frames = holdFrames();

    await dismiss(game);
    await advance(10_000);
    expect(game.result.current.feedback?.id).toBe(before);
    expect(game.result.current.reel?.index).toBe(2);

    await frames.draw();
    await answerRight(game);
    expect(game.result.current.feedback).toMatchObject({ kind: 'like', verdict: 'hit' });
  });

  it('ends the run when the app is left while a post is drawn — the late frame changes nothing', async () => {
    const leave = leavingTheApp();
    const frames = holdFrames();
    const { game } = await afterCountdown();

    await leave();
    expect(runs.finish).toHaveBeenCalledTimes(1);
    expect(runs.finish).toHaveBeenLastCalledWith('run-1', { actions: [], clientScore: 0, clientReels: 0 });

    await frames.draw();
    await advance(5_000);
    expect(game.result.current.feedback).toBeNull();
    expect(runs.finish).toHaveBeenCalledTimes(1);
  });

  it('judges nothing when the run is closed while a post is drawn', async () => {
    const frames = holdFrames();
    const { game } = await afterCountdown();

    expect(await logOf(game)).toEqual([]);
    await frames.draw();
    await advance(5_000);
    expect(game.result.current.feedback).toBeNull();
  });

  it('counts a swipe when it is recognised mid-drag, not when the finger went down', async () => {
    const { game } = await afterCountdown();
    await advance(300);
    await touch(game, 'start', 600);
    await advance(200);
    await touch(game, 'move', 570);
    expect(game.result.current.feedback).toBeNull();

    await advance(200);
    await touch(game, 'move', 535);

    // Before the finger has lifted.
    expect(game.result.current.feedback?.verdict).toBe('hit');
    expect(await logOf(game)).toEqual([[GESTURE.up, 700, 0]]);
  });

  it('counts a flick that only qualifies at the lift, at the lift', async () => {
    const { game } = await afterCountdown();
    await advance(300);
    await touch(game, 'start', 600);
    await advance(20);
    await touch(game, 'move', 590);
    expect(game.result.current.feedback).toBeNull();

    await advance(10);
    await touch(game, 'end', 578);

    expect(game.result.current.feedback?.verdict).toBe('hit');
    expect(await logOf(game)).toEqual([[GESTURE.up, 330, 0]]);
  });

  it('tells a blind swipe on a friend’s post from a looked-at one', async () => {
    const { game } = await afterCountdown();
    await answerRight(game);
    await answerRight(game);
    expect(game.result.current.reel?.kind).toBe('like');

    await advance(150);
    await swipe(game);

    expect(game.result.current.feedback).toMatchObject({ kind: 'like', verdict: 'wrong', blind: 1 });
    expect(await logOf(game)).toEqual([
      [GESTURE.up, REACTION_MS, 0],
      [GESTURE.up, REACTION_MS, 0],
      [GESTURE.up, 150, 0],
    ]);
  });

  it('judges a still finger on a post that is not gold as a hold, when the window ends', async () => {
    const { game } = await afterCountdown();
    const window = game.result.current.reel?.window ?? 0;
    await advance(300);
    await touch(game, 'start', 600);

    await advance(window - 300 - 1);
    expect(game.result.current.feedback).toBeNull();
    await advance(1);

    expect(game.result.current.feedback?.verdict).toBe('wrong');
    expect(await logOf(game)).toEqual([[GESTURE.hold, 300, window - 300]]);
  });

  it('ends the window on a finger that moved but never swiped — the post does not wait for it', async () => {
    const { game } = await afterCountdown();
    const window = game.result.current.reel?.window ?? 0;
    await advance(300);
    await touch(game, 'start', 600);
    await advance(100);
    await touch(game, 'move', 630);

    await advance(window - 400);
    expect(game.result.current.feedback?.verdict).toBe('timeout');
    await advance(PACE.exitMs.miss + PACE.slideMs);
    expect(game.result.current.reel?.index).toBe(1);
    expect(await logOf(game)).toEqual([[GESTURE.none, 0, 0]]);
  });

  it('hides the time bar while a gold post is held, and a hold broken in time brings it back', async () => {
    const game = await atTheGoldPost();
    const window = game.result.current.reel?.window ?? 0;
    const before = game.result.current.feedback?.id;
    await advance(300);
    await touch(game, 'start', 600);
    expect(game.result.current.values.timerShown.value).toBe(0);

    await advance(200);
    await touch(game, 'move', 630);
    expect(game.result.current.values.timerShown.value).toBe(1);
    expect(game.result.current.feedback?.id).toBe(before);

    await advance(window - 500);
    expect(game.result.current.feedback).toMatchObject({ kind: 'hold', verdict: 'timeout' });
  });

  it('lets a gold hold that began in time run past the window, until it is let go', async () => {
    const game = await atTheGoldPost();
    const reel = game.result.current.reel;
    if (!reel) throw new Error('No reel is up.');
    const release = Math.round((reel.zoneCenter * reel.holdFill) / 1000);
    const pressAt = reel.window - Math.floor(release / 2);
    const before = game.result.current.feedback?.id;
    await advance(pressAt);
    await touch(game, 'start', 600);

    await advance(reel.window - pressAt);
    expect(game.result.current.feedback?.id).toBe(before);
    await advance(release - (reel.window - pressAt));
    await touch(game, 'end', 600);

    expect(game.result.current.feedback).toMatchObject({ kind: 'hold', verdict: 'perfect' });
    expect((await logOf(game)).at(-1)).toEqual([GESTURE.hold, pressAt, release]);
  });

  it('judges a gold hold broken after the window at once', async () => {
    const game = await atTheGoldPost();
    const window = game.result.current.reel?.window ?? 0;
    await advance(window - 200);
    await touch(game, 'start', 600);
    await advance(300);

    await touch(game, 'move', 630);

    expect(game.result.current.feedback).toMatchObject({ kind: 'hold', verdict: 'timeout' });
    expect((await logOf(game)).at(-1)).toEqual([GESTURE.none, 0, 0]);
  });
});
