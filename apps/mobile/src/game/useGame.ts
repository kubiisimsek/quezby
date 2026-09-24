import { CHECKPOINTS, CONTENT_VERSION, PACE, exitDelayMs, prefixHash } from '@quezby/config';
import {
  ENGINE_VERSION,
  EngineError,
  GESTURE,
  Run,
  type Action,
  type BonusHit,
  type Reel,
  type ReelKind,
  type RunSummary,
  type Step,
  type Verdict,
} from '@quezby/engine';
import { ApiError } from '@quezby/sdk';
import type { FinishRunRequest, FinishRunResponse, RunMode } from '@quezby/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, useWindowDimensions } from 'react-native';
import {
  Easing,
  cancelAnimation,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { rememberMe } from '@/hooks/useMe';
import {
  IDLE,
  touchDown,
  touchMove,
  touchUp,
  type Detected,
  type TouchState,
} from '@/game/gesture';
import { messageFor } from '@/lib/errors';
import { feel } from '@/lib/haptics';
import { usePendingRun } from '@/stores/pendingRun';
import { SPRING } from '@/ui/motion';

export type Phase = 'starting' | 'error' | 'countdown' | 'playing' | 'finishing' | 'result';

export type Feedback = {
  id: number;
  verdict: Verdict;
  kind: ReelKind;
  points: number;
  combo: number;
  bonuses: readonly BonusHit[];
};

/**
 * How a run ended, as far as the player may be told. A ranked run shows only
 * what the API answered — never the phone's own count. Practice runs never
 * reach the API, so they show the engine's summary, marked as practice.
 */
export type Outcome =
  | { mode: 'verified'; response: FinishRunResponse }
  | { mode: 'practice'; summary: RunSummary; reason: 'offline' | 'outdated' }
  | { mode: 'unsent'; message: string; canRetry: boolean };

/** A finish worth sending again: the API never got it, or could not take it right then. */
function retryable(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    ['network', 'timeout', 'server_error', 'too_many_requests'].includes(error.code)
  );
}

type Mode = 'idle' | 'live' | 'transition' | 'over';

/** How long a drag that began in time may keep the reel after its window. */
const DRAG_GRACE_MS = 1200;

/** A monotonic clock where the runtime has one. */
const now = () => {
  const clock = (globalThis as { performance?: { now: () => number } }).performance;
  return clock ? clock.now() : Date.now();
};

/** How long a finish waits for a checkpoint still on its way, so its receipt can ride along. */
const CHECKPOINT_WAIT_MS = 2000;

type Receipt = { reel: number; receipt: string };

function localSeed(): number {
  return (Math.floor(Math.random() * 0xfffffffe) + 1) >>> 0;
}

function exitDelay(verdict: Verdict, kind: ReelKind): number {
  return exitDelayMs(verdict === 'hit' || verdict === 'perfect', kind);
}

/**
 * One run of the game on this screen: the engine, the clock, the touches,
 * and what the screen draws from them. The engine decides every outcome —
 * timers here only decide *when* to ask it.
 */
export function useGame(mode: RunMode = 'free') {
  const { height } = useWindowDimensions();

  const [phase, setPhase] = useState<Phase>('starting');
  const [countdown, setCountdown] = useState(3);
  const [reel, setReel] = useState<Reel | null>(null);
  const [seed, setSeed] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1000);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [startError, setStartError] = useState<{ message: string; code: string | null } | null>(null);
  const [practice, setPractice] = useState<'offline' | 'outdated' | null>(null);

  const dragY = useSharedValue(0);
  const enter = useSharedValue(1);
  const timer = useSharedValue(1);
  const holdFill = useSharedValue(0);
  const holding = useSharedValue(0);
  const meter = useSharedValue(1000);

  const runRef = useRef<Run | null>(null);
  const runIdRef = useRef<string | null>(null);
  const actionsRef = useRef<Action[]>([]);
  /** When the countdown ended — the game clock's zero. */
  const goAtRef = useRef<number | null>(null);
  /** The next `CHECKPOINTS.marksMs` mark this run has yet to pass. */
  const markRef = useRef(0);
  const receiptsRef = useRef<Receipt[]>([]);
  const checkingInRef = useRef<Set<Promise<void>>>(new Set());
  const modeRef = useRef<Mode>('idle');
  const touchRef = useRef<TouchState>(IDLE);
  const reelStartRef = useRef(0);
  const holdRef = useRef<{ downAt: number; t: number } | null>(null);
  const lateRef = useRef(false);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const feedbackId = useRef(0);
  const aliveRef = useRef(true);
  const heightRef = useRef(height);
  heightRef.current = height;

  const schedule = useCallback((name: string, ms: number, fn: () => void) => {
    clearTimeout(timersRef.current[name]);
    timersRef.current[name] = setTimeout(fn, Math.max(0, ms));
  }, []);

  const unschedule = useCallback((name: string) => {
    clearTimeout(timersRef.current[name]);
    delete timersRef.current[name];
  }, []);

  const clearTimers = useCallback(() => {
    for (const timeout of Object.values(timersRef.current)) clearTimeout(timeout);
    timersRef.current = {};
  }, []);

  /** Milliseconds since the reel came up, as the engine counts them. */
  const sinceReel = (at: number) =>
    Math.max(0, Math.round(at - reelStartRef.current));

  /**
   * A touch the JS thread only got to after the reel's window closed. Its
   * deadline timer may not have fired yet — a busy thread runs them late —
   * but the engine would rightly refuse the gesture, so it is a timeout.
   */
  const pastWindow = (at: number) => {
    const run = runRef.current;
    return run ? sinceReel(at) >= run.current.window : true;
  };

  /* ------------------------------------------------------------ finish -- */

  /** Sends the log and waits for the API's verdict — the only numbers the result will show. */
  const send = useCallback(async (runId: string, request: FinishRunRequest) => {
    setPhase('finishing');
    try {
      const response = await api.runs.finish(runId, request);
      usePendingRun.getState().clear();
      const user = useSession.getState().user;
      if (user) rememberMe({ ...user, best: response.best }, response.ranks);
      if (response.isNewBest) feel('record');
      setOutcome({ mode: 'verified', response });
    } catch (error) {
      const canRetry = retryable(error);
      if (canRetry) {
        usePendingRun.getState().keep({ runId, ...request, savedAt: Date.now() });
      } else {
        usePendingRun.getState().clear();
      }
      setOutcome({ mode: 'unsent', message: messageFor(error), canRetry });
    }
    setPhase('result');
  }, []);

  /**
   * The log, the app's own count and the checkpoint receipts. A checkpoint
   * still on its way is given a moment to land first, so its receipt rides
   * along.
   */
  const submit = useCallback(
    (summary: RunSummary) => {
      const runId = runIdRef.current;
      if (!runId) return;
      const post = () => {
        const receipts = [...receiptsRef.current]
          .sort((a, b) => a.reel - b.reel)
          .slice(0, CHECKPOINTS.maxReceipts)
          .map((stamp) => stamp.receipt);
        void send(runId, {
          actions: actionsRef.current.map((a) => [a[0], a[1], a[2]]),
          clientScore: summary.score,
          clientReels: summary.reels,
          ...(receipts.length > 0 ? { checkpoints: receipts } : {}),
        });
      };
      const landing = [...checkingInRef.current];
      if (landing.length === 0) {
        post();
        return;
      }
      setPhase('finishing');
      void settled(landing, CHECKPOINT_WAIT_MS).then(post);
    },
    [send],
  );

  /**
   * A ranked run checks in with the API at the first verdict after its game
   * clock passes each `CHECKPOINTS.marksMs` mark: how many reels so far, and
   * the hash of exactly those moves. The API stamps when it saw them — that
   * is what shows a slowed-down game — and its receipt rides with the
   * finish. Fire-and-forget: a checkpoint that fails is simply missing.
   */
  const checkIn = useCallback(() => {
    const runId = runIdRef.current;
    const goAt = goAtRef.current;
    if (!runId || goAt === null) return;
    const elapsed = now() - goAt;
    const marks = CHECKPOINTS.marksMs;
    let passed = markRef.current;
    while (passed < marks.length && elapsed >= (marks[passed] ?? Infinity)) passed += 1;
    if (passed === markRef.current) return;
    markRef.current = passed;

    const reel = actionsRef.current.length;
    const request: Promise<void> = api.runs
      .checkpoint(runId, { reel, prefixHash: prefixHash(actionsRef.current, reel) })
      .then(({ receipt }) => {
        if (runIdRef.current === runId) receiptsRef.current.push({ reel, receipt });
      })
      .catch(() => undefined)
      .finally(() => {
        checkingInRef.current.delete(request);
      });
    checkingInRef.current.add(request);
  }, []);

  const finish = useCallback(() => {
    const run = runRef.current;
    if (!run || modeRef.current === 'over') return;
    modeRef.current = 'over';
    clearTimers();
    cancelAnimation(timer);
    cancelAnimation(meter);
    run.quit();
    const summary = run.summary();
    if (runIdRef.current) {
      submit(summary);
    } else {
      setOutcome({ mode: 'practice', summary, reason: practice ?? 'offline' });
      setPhase('result');
    }
  }, [clearTimers, meter, practice, submit, timer]);

  /* ------------------------------------------------------------- reels -- */

  const commitRef = useRef<(action: Action) => void>(() => undefined);

  const beginReel = useCallback(() => {
    const run = runRef.current;
    if (!run || run.over) return;
    const current = run.current;
    touchRef.current = IDLE;
    holdRef.current = null;
    lateRef.current = false;
    modeRef.current = 'live';
    setReel(current);
    reelStartRef.current = now();

    dragY.value = 0;
    enter.value = 0;
    enter.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.cubic) });
    holding.value = 0;
    holdFill.value = 0;
    timer.value = 1;
    timer.value = withTiming(0, { duration: current.window, easing: Easing.linear });

    const deadline = Math.min(current.window, run.msUntilEmpty());
    meter.value = run.meter;
    meter.value = withTiming(
      Math.max(0, run.meter - (current.drain * deadline) / 1000),
      { duration: deadline, easing: Easing.linear },
    );

    schedule('deadline', deadline, () => {
      if (modeRef.current !== 'live') return;
      if (holdRef.current) return;
      const down = touchRef.current.down;
      if (down && !touchRef.current.consumed) {
        if (!down.moved) {
          commitRef.current([
            GESTURE.hold,
            sinceReel(down.at),
            Math.round(now() - down.at),
          ]);
          return;
        }
        lateRef.current = true;
        schedule('grace', DRAG_GRACE_MS, () =>
          commitRef.current([GESTURE.none, 0, 0]),
        );
        return;
      }
      commitRef.current([GESTURE.none, 0, 0]);
    });
  }, [dragY, enter, holdFill, holding, meter, schedule, timer]);

  const commit = useCallback(
    (action: Action) => {
      const run = runRef.current;
      if (!run || modeRef.current !== 'live') return;
      modeRef.current = 'transition';
      clearTimers();

      let applied: Action = action;
      let step: Step;
      try {
        step = run.apply(action);
      } catch (error) {
        if (!(error instanceof EngineError)) throw error;
        applied = [GESTURE.none, 0, 0];
        step = run.apply(applied);
      }
      actionsRef.current.push(applied);
      checkIn();

      cancelAnimation(timer);
      cancelAnimation(meter);
      meter.value = withTiming(step.meter, { duration: 180 });
      holding.value = withTiming(0, { duration: 120 });

      const hit = step.verdict === 'hit' || step.verdict === 'perfect';
      feel(step.verdict === 'perfect' ? 'perfect' : hit ? (step.reel.kind === 'skip' ? 'tick' : 'hit') : 'miss');

      feedbackId.current += 1;
      setFeedback({
        id: feedbackId.current,
        verdict: step.verdict,
        kind: step.reel.kind,
        points: step.points,
        combo: step.combo,
        bonuses: step.bonuses,
      });
      if (step.bonuses.length > 0) feel('perfect');
      setScore(run.points);
      setCombo(run.currentCombo);

      const delay = exitDelay(step.verdict, step.reel.kind);
      schedule('exit', delay, () => {
        dragY.value = withTiming(-heightRef.current, {
          duration: PACE.slideMs,
          easing: Easing.in(Easing.quad),
        });
        schedule('next', PACE.slideMs, () => {
          if (step.over) finish();
          else beginReel();
        });
      });
    },
    [beginReel, checkIn, clearTimers, dragY, finish, holding, meter, schedule, timer],
  );
  commitRef.current = commit;

  /* ----------------------------------------------------------- touches -- */

  const startHold = useCallback(
    (downAt: number) => {
      const run = runRef.current;
      if (!run) return;
      const current = run.current;
      const t = sinceReel(downAt);
      holdRef.current = { downAt, t };
      cancelAnimation(timer);
      holding.value = withTiming(1, { duration: 120 });
      holdFill.value = 0;
      holdFill.value = withTiming(1, {
        duration: current.holdFill,
        easing: Easing.linear,
      });
      const limit = Math.min(run.holdFailAfter(), run.msUntilEmpty() - t);
      cancelAnimation(meter);
      meter.value = withTiming(
        Math.max(0, run.meter - (current.drain * (t + limit)) / 1000),
        { duration: limit, easing: Easing.linear },
      );
      schedule('hold', limit, () =>
        commitRef.current([GESTURE.hold, t, Math.max(0, Math.round(limit))]),
      );
    },
    [holdFill, holding, meter, schedule, timer],
  );

  const dropHold = useCallback(() => {
    if (!holdRef.current) return;
    holdRef.current = null;
    unschedule('hold');
    const run = runRef.current;
    holding.value = withTiming(0, { duration: 120 });
    cancelAnimation(holdFill);
    holdFill.value = withTiming(0, { duration: 120 });
    if (!run) return;
    const elapsed = now() - reelStartRef.current;
    const left = run.current.window - elapsed;
    if (left <= 0) {
      lateRef.current = true;
      schedule('grace', DRAG_GRACE_MS, () =>
        commitRef.current([GESTURE.none, 0, 0]),
      );
      return;
    }
    timer.value = withTiming(0, { duration: left, easing: Easing.linear });
  }, [holdFill, holding, schedule, timer, unschedule]);

  const onDetected = useCallback(
    (detected: Detected | undefined) => {
      if (!detected) return;
      if ('at' in detected && pastWindow(detected.at) && !holdRef.current) {
        commit([GESTURE.none, 0, 0]);
        return;
      }
      switch (detected.kind) {
        case 'touch':
          commit([GESTURE.touch, sinceReel(detected.at), 0]);
          return;
        case 'like':
          commit([GESTURE.like, sinceReel(detected.at), 0]);
          return;
        case 'up':
          commit([GESTURE.up, sinceReel(detected.at), 0]);
          return;
        case 'hold':
          commit([GESTURE.hold, sinceReel(detected.at), Math.round(detected.duration)]);
          return;
        case 'tap':
        case 'cancel':
          dragY.value = withSpring(0, SPRING);
          if (lateRef.current) commit([GESTURE.none, 0, 0]);
      }
    },
    [commit, dragY],
  );

  const onTouchStart = useCallback(
    (y: number) => {
      const run = runRef.current;
      if (!run || modeRef.current !== 'live') return;
      const at = now();
      if (pastWindow(at)) {
        commit([GESTURE.none, 0, 0]);
        return;
      }
      const result = touchDown(touchRef.current, { at, y }, run.current.kind === 'freeze');
      touchRef.current = result.state;
      if (result.detected) {
        onDetected(result.detected);
        return;
      }
      if (run.current.kind === 'hold') startHold(at);
    },
    [onDetected, startHold],
  );

  const onTouchMove = useCallback(
    (y: number) => {
      if (modeRef.current !== 'live') return;
      const result = touchMove(touchRef.current, { at: now(), y });
      touchRef.current = result.state;
      if (result.state.down?.moved && holdRef.current) dropHold();
      if (result.dragY !== 0) {
        dragY.value = result.dragY < 0 ? result.dragY : result.dragY * 0.25;
      }
    },
    [dragY, dropHold],
  );

  const onTouchEnd = useCallback(
    (y: number) => {
      if (modeRef.current !== 'live') return;
      const result = touchUp(touchRef.current, { at: now(), y });
      touchRef.current = result.state;
      if (holdRef.current && result.detected?.kind !== 'hold') dropHold();
      onDetected(result.detected);
    },
    [dropHold, onDetected],
  );

  /* ------------------------------------------------------------- start -- */

  const begin = useCallback(
    (runSeed: number, runId: string | null) => {
      runRef.current = new Run(runSeed);
      runIdRef.current = runId;
      actionsRef.current = [];
      goAtRef.current = null;
      markRef.current = 0;
      receiptsRef.current = [];
      checkingInRef.current = new Set();
      setSeed(runSeed);
      setScore(0);
      setCombo(1000);
      setFeedback(null);
      setOutcome(null);
      setReel(runRef.current.current);
      meter.value = 1000;
      timer.value = 1;
      dragY.value = 0;
      enter.value = 1;
      setCountdown(3);
      setPhase('countdown');
      schedule('count2', PACE.countdownStepMs, () => setCountdown(2));
      schedule('count1', PACE.countdownStepMs * 2, () => setCountdown(1));
      schedule('go', PACE.countdownStepMs * PACE.countdownSteps, () => {
        goAtRef.current = now();
        setPhase('playing');
        beginReel();
      });
    },
    [beginReel, dragY, enter, meter, schedule, timer],
  );

  const start = useCallback(
    async (practiceReason: 'offline' | 'outdated' | null = null) => {
      clearTimers();
      modeRef.current = 'idle';
      setStartError(null);
      setPhase('starting');
      setPractice(practiceReason);
      if (practiceReason) {
        begin(localSeed(), null);
        return;
      }
      try {
        const started = await api.runs.start({
          mode,
          engineVersion: ENGINE_VERSION,
          contentVersion: CONTENT_VERSION,
        });
        if (!aliveRef.current) return;
        begin(started.seed, started.runId);
      } catch (error) {
        if (!aliveRef.current) return;
        if (error instanceof ApiError && error.code === 'engine_outdated') {
          setPractice('outdated');
          begin(localSeed(), null);
          return;
        }
        setStartError({
          message: messageFor(error),
          code: error instanceof ApiError ? error.code : null,
        });
        setPhase('error');
      }
    },
    [begin, clearTimers, mode],
  );

  const quit = useCallback(() => {
    if (modeRef.current === 'over' || !runRef.current) return;
    if (phase === 'countdown') {
      clearTimers();
      modeRef.current = 'over';
      return;
    }
    finish();
  }, [clearTimers, finish, phase]);

  const retrySubmit = useCallback(() => {
    const pending = usePendingRun.getState().run;
    if (outcome?.mode !== 'unsent' || !pending) return;
    const { runId, savedAt: _savedAt, ...request } = pending;
    void send(runId, request);
  }, [outcome, send]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      // Leaving the app ends the run: a paused reel could be studied at leisure.
      if (state === 'background' && modeRef.current !== 'over' && modeRef.current !== 'idle') {
        finish();
      }
    });
    return () => subscription.remove();
  }, [finish]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      clearTimers();
    };
  }, [clearTimers]);

  return {
    phase,
    countdown,
    reel,
    seed,
    score,
    combo,
    feedback,
    outcome,
    startError,
    practice,
    values: { dragY, enter, timer, holdFill, holding, meter },
    start,
    quit,
    retrySubmit,
    touches: { onTouchStart, onTouchMove, onTouchEnd },
  };
}

export type GameController = ReturnType<typeof useGame>;

/** Waits for `pending` to settle, but never longer than `ms`. */
async function settled(pending: Promise<unknown>[], ms: number): Promise<void> {
  if (pending.length === 0) return;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    Promise.allSettled(pending),
    new Promise<void>((resolve) => {
      timeout = setTimeout(resolve, ms);
    }),
  ]);
  clearTimeout(timeout);
}
