import { CHECKPOINTS, CONTENT_VERSION, PACE, exitDelayMs, prefixHash } from '@quezby/config';
import {
  ENGINE_VERSION,
  EngineError,
  GESTURE,
  REEL_KINDS,
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, useWindowDimensions } from 'react-native';
import {
  Easing,
  cancelAnimation,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { track } from '@/analytics/track';
import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { rememberMe } from '@/hooks/useMe';
import { useT } from '@/i18n';
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
import { sendPendingRun } from '@/hooks/usePendingRunSender';
import { usePendingRun } from '@/stores/pendingRun';
import { SPRING } from '@/ui/motion';

/** `coach`: a practice run's card is up and nothing is live — before the countdown, or between reels. */
export type Phase = 'starting' | 'error' | 'coach' | 'countdown' | 'playing' | 'finishing' | 'result';

/**
 * Why a run is played on the phone alone: no connection, an app the API no
 * longer plays with, or a new player's coached practice run.
 */
export type PracticeReason = 'offline' | 'outdated' | 'tutorial';

export type Feedback = {
  id: number;
  verdict: Verdict;
  kind: ReelKind;
  points: number;
  combo: number;
  bonuses: readonly BonusHit[];
  /** Blind moves in a row on a miss: its penalty was doubled this many times. */
  blind: number;
};

/**
 * How a run ended, as far as the player may be told. A ranked run shows only
 * what the API answered — never the phone's own count. Practice runs never
 * reach the API, so they show the engine's summary, marked as practice; a
 * coached one also says which kinds it never got to.
 */
export type Outcome =
  | { mode: 'verified'; response: FinishRunResponse }
  | {
      mode: 'practice';
      summary: RunSummary;
      reason: PracticeReason;
      /** The kinds a coached run ended before — they never had their card. */
      unseen?: readonly ReelKind[];
    }
  | { mode: 'unsent'; message: string; canRetry: boolean };

/**
 * An outcome as the hook keeps it. An unsent finish holds the error itself,
 * never its words: they are written at render, in the language on screen.
 */
type Ending =
  | Exclude<Outcome, { mode: 'unsent' }>
  | { mode: 'unsent'; error: unknown; canRetry: boolean };

/** Why a run could not start, as the screen is told it. */
export type StartError = { message: string; code: string | null };

/** A finish worth sending again: the API never got it, or could not take it right then. */
function retryable(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    ['network', 'timeout', 'server_error', 'too_many_requests'].includes(error.code)
  );
}

/**
 * A check-in lost on the way — no answer (network or timeout: status 0) or
 * the API failing (5xx) — not one it refused. The status tells, not the code:
 * a 4xx that is not JSON, like a firewall's HTML 403, also comes as `server_error`.
 */
function lostOnTheWay(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 0 || error.status >= 500);
}

/**
 * `arming`: the next post is set but not drawn yet. Nothing is live, so no
 * clock runs and a touch is not the post's — like one during the slide.
 */
type Mode = 'idle' | 'coach' | 'arming' | 'live' | 'transition' | 'over';

/** A monotonic clock where the runtime has one. */
const now = () => {
  const clock = (globalThis as { performance?: { now: () => number } }).performance;
  return clock ? clock.now() : Date.now();
};

/** How long a finish waits for a checkpoint still on its way, so its receipt can ride along. */
const CHECKPOINT_WAIT_MS = 2000;

/** How long a start waits for a finish kept on the phone to go first. */
const PENDING_WAIT_MS = 4000;

/** How soon after a check-in was lost it may go again. */
const CHECK_IN_RETRY_AFTER_MS = 5_000;

/** How many lost check-ins a run sends again: the receipts a finish can carry beyond one per mark. */
const CHECK_IN_RETRIES = CHECKPOINTS.maxReceipts - CHECKPOINTS.marksMs.length;

type Receipt = { reel: number; receipt: string };

function localSeed(): number {
  return (Math.floor(Math.random() * 0xfffffffe) + 1) >>> 0;
}

function exitDelay(verdict: Verdict, kind: ReelKind): number {
  return exitDelayMs(verdict === 'hit' || verdict === 'perfect', kind);
}

/** A VS run: sent to a friend — or, with `duelId`, the answer to theirs, on its seed. */
export type VsTarget = { opponent: string; duelId?: string };

/**
 * One run of the game on this screen: the engine, the clock, the touches,
 * and what the screen draws from them. The engine decides every outcome —
 * timers here only decide *when* to ask it. A VS run is played like any
 * other; it only starts differently, and it never falls back to practice.
 */
export function useGame(mode: RunMode = 'free', vs: VsTarget | null = null) {
  const t = useT();
  const { height } = useWindowDimensions();

  const [phase, setPhase] = useState<Phase>('starting');
  const [countdown, setCountdown] = useState(3);
  const [reel, setReel] = useState<Reel | null>(null);
  const [seed, setSeed] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1000);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [ending, setEnding] = useState<Ending | null>(null);
  /** The error a run could not start with — kept whole, worded at render. */
  const [startFailure, setStartFailure] = useState<{ error: unknown } | null>(null);
  const [practice, setPractice] = useState<PracticeReason | null>(null);
  /** The kind whose coach card is up, in a practice run. */
  const [coach, setCoach] = useState<ReelKind | null>(null);
  /** Bumped for every post that waits for its first drawn frame to go live. */
  const [armed, setArmed] = useState(0);

  const dragY = useSharedValue(0);
  const enter = useSharedValue(1);
  const timer = useSharedValue(1);
  /** The time bar is out of sight while a gold post is held: its fill bar is the clock then. */
  const timerShown = useSharedValue(1);
  const holdFill = useSharedValue(0);
  const holding = useSharedValue(0);
  const meter = useSharedValue(1000);

  const runRef = useRef<Run | null>(null);
  const runIdRef = useRef<string | null>(null);
  /** Why this run stays on the phone — read by callbacks, which may run before a render. */
  const practiceRef = useRef<PracticeReason | null>(null);
  /** The kinds a coached run has shown its card for. */
  const coachedRef = useRef<Set<ReelKind>>(new Set());
  const actionsRef = useRef<Action[]>([]);
  /** When the countdown ended — the game clock's zero. */
  const goAtRef = useRef<number | null>(null);
  /** The next `CHECKPOINTS.marksMs` mark this run has yet to pass. */
  const markRef = useRef(0);
  const receiptsRef = useRef<Receipt[]>([]);
  const checkingInRef = useRef<Set<Promise<void>>>(new Set());
  /** When each check-in lost on the way may go again, the earliest first. */
  const owedRef = useRef<number[]>([]);
  /** How many lost check-ins this run has sent again, out of `CHECK_IN_RETRIES`. */
  const retriesRef = useRef(0);
  const modeRef = useRef<Mode>('idle');
  const touchRef = useRef<TouchState>(IDLE);
  const reelStartRef = useRef(0);
  /** The post being armed: its token, and whether it is on screen already. */
  const armedRef = useRef({ token: 0, shown: false });
  const holdRef = useRef<{ downAt: number; t: number } | null>(null);
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

  /** Milliseconds since the post went live — its first drawn frame — as the engine counts them. */
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
      setEnding({ mode: 'verified', response });
    } catch (error) {
      const canRetry = retryable(error);
      if (canRetry) {
        usePendingRun.getState().keep({ runId, ...request, savedAt: Date.now() });
      } else {
        usePendingRun.getState().clear();
      }
      track('unsent_run');
      setEnding({ mode: 'unsent', error, canRetry });
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
   * finish. The game never waits on one. A check-in lost on the way — no
   * answer, or a 5xx — is owed: a later verdict, `CHECK_IN_RETRY_AFTER_MS`
   * after the failure at the soonest, checks in again with the reels and
   * moves so far, just as a mark's would. One the API refused (a 4xx) is
   * not. A verdict sends one check-in at most, a new mark's before an owed
   * one, and a run sends `CHECK_IN_RETRIES` again at most — never more than
   * a finish can carry.
   */
  const checkIn = useCallback(() => {
    const runId = runIdRef.current;
    const goAt = goAtRef.current;
    if (!runId || goAt === null) return;
    const at = now();
    const marks = CHECKPOINTS.marksMs;
    let passed = markRef.current;
    while (passed < marks.length && at - goAt >= (marks[passed] ?? Infinity)) passed += 1;
    if (passed > markRef.current) {
      markRef.current = passed;
    } else {
      const due = owedRef.current[0];
      if (due === undefined || at < due || retriesRef.current >= CHECK_IN_RETRIES) return;
      owedRef.current.shift();
      retriesRef.current += 1;
    }

    const reel = actionsRef.current.length;
    const request: Promise<void> = api.runs
      .checkpoint(runId, { reel, prefixHash: prefixHash(actionsRef.current, reel) })
      .then(({ receipt }) => {
        if (runIdRef.current === runId) receiptsRef.current.push({ reel, receipt });
      })
      .catch((error: unknown) => {
        if (runIdRef.current === runId && lostOnTheWay(error)) {
          owedRef.current.push(now() + CHECK_IN_RETRY_AFTER_MS);
        }
      })
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
    setCoach(null);
    const summary = run.summary();
    if (runIdRef.current) {
      submit(summary);
      return;
    }
    const reason = practiceRef.current ?? 'offline';
    setEnding(
      reason === 'tutorial'
        ? {
            mode: 'practice',
            summary,
            reason,
            unseen: REEL_KINDS.filter((kind) => !coachedRef.current.has(kind)),
          }
        : { mode: 'practice', summary, reason },
    );
    setPhase('result');
  }, [clearTimers, meter, submit, timer]);

  /* ------------------------------------------------------------- reels -- */

  const commitRef = useRef<(action: Action) => void>(() => undefined);
  const liveRef = useRef<(token: number) => void>(() => undefined);

  /**
   * The current reel is set up, but not live: it waits, hidden, for React to
   * draw it, and `goLive` starts its clock on that first frame — the phone's
   * drawing is never the player's time. `shown` when it is already on screen —
   * it slid in under a coach card — so it stays and does not slide in again.
   */
  const beginReel = useCallback((shown = false) => {
    const run = runRef.current;
    if (!run || run.over) return;
    touchRef.current = IDLE;
    holdRef.current = null;
    modeRef.current = 'arming';
    setReel(run.current);
    dragY.value = 0;
    if (!shown) enter.value = 0;
    holding.value = 0;
    holdFill.value = 0;
    timer.value = 1;
    timerShown.value = 1;
    meter.value = run.meter;
    const token = armedRef.current.token + 1;
    armedRef.current = { token, shown };
    setArmed(token);
  }, [dragY, enter, holdFill, holding, meter, timer, timerShown]);

  /**
   * The armed reel's first frame is up: it goes live, and its clock starts —
   * the slide-in, the timer, the meter's drain and the deadline. A frame for a
   * reel no longer armed (the run ended, or the app was left) does nothing.
   */
  const goLive = useCallback((token: number) => {
    const run = runRef.current;
    if (!run || run.over || modeRef.current !== 'arming' || armedRef.current.token !== token) return;
    const current = run.current;
    modeRef.current = 'live';
    reelStartRef.current = now();

    if (!armedRef.current.shown) {
      enter.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.cubic) });
    }
    timer.value = withTiming(0, { duration: current.window, easing: Easing.linear });

    const deadline = Math.min(current.window, run.msUntilEmpty());
    meter.value = withTiming(
      Math.max(0, run.meter - (current.drain * deadline) / 1000),
      { duration: deadline, easing: Easing.linear },
    );

    // The window's end is final: a finger still on the glass is judged now — a
    // still press as the hold it is, anything else as too late. Only a gold
    // hold that began in time runs on, until its own timer.
    schedule('deadline', deadline, () => {
      if (modeRef.current !== 'live' || holdRef.current) return;
      const { down, consumed } = touchRef.current;
      commitRef.current(
        down && !consumed && !down.moved
          ? [GESTURE.hold, sinceReel(down.at), Math.round(now() - down.at)]
          : [GESTURE.none, 0, 0],
      );
    });
  }, [enter, meter, schedule, timer]);
  liveRef.current = goLive;

  // Arming a reel is a render; the frame after it has drawn the reel, and
  // that is when it goes live. Keyed on the token alone, so a render that
  // changes nothing else never asks for the frame again.
  useEffect(() => {
    if (armed === 0) return undefined;
    const frame = requestAnimationFrame(() => liveRef.current(armed));
    return () => cancelAnimationFrame(frame);
  }, [armed]);

  /**
   * A coach card over the current reel: the reel slides in and waits, its
   * timer full, the meter still — nothing is live, so nothing is judged or
   * drained. `dismissCoach` starts it.
   */
  const enterCoach = useCallback((run: Run) => {
    const current = run.current;
    coachedRef.current.add(current.kind);
    clearTimers();
    modeRef.current = 'coach';
    touchRef.current = IDLE;
    holdRef.current = null;
    setReel(current);
    dragY.value = 0;
    enter.value = 0;
    enter.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.cubic) });
    holding.value = 0;
    holdFill.value = 0;
    timer.value = 1;
    timerShown.value = 1;
    meter.value = run.meter;
    setCoach(current.kind);
    setPhase('coach');
  }, [clearTimers, dragY, enter, holdFill, holding, meter, timer, timerShown]);

  /** The next reel — after its card, the first time a practice run meets its kind. */
  const advanceReel = useCallback(() => {
    const run = runRef.current;
    if (!run || run.over) return;
    if (practiceRef.current === 'tutorial' && !coachedRef.current.has(run.current.kind)) {
      enterCoach(run);
      return;
    }
    beginReel();
  }, [beginReel, enterCoach]);

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
        blind: step.blind,
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
          else advanceReel();
        });
      });
    },
    [advanceReel, checkIn, clearTimers, dragY, finish, holding, meter, schedule, timer],
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
      // The gold bar is the clock now. The timer runs on out of sight, so a
      // hold broken in time brings it back showing the time truly left.
      timerShown.value = withTiming(0, { duration: 120 });
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
    [holdFill, holding, meter, schedule, timerShown],
  );

  /**
   * A gold hold broken by a finger that moved. Past the reel's last moment —
   * its window, or the meter running dry — it is judged at once; before it,
   * the timer shows again and the meter drains on towards the deadline.
   */
  const dropHold = useCallback(() => {
    if (!holdRef.current) return;
    holdRef.current = null;
    unschedule('hold');
    const run = runRef.current;
    holding.value = withTiming(0, { duration: 120 });
    cancelAnimation(holdFill);
    holdFill.value = withTiming(0, { duration: 120 });
    if (!run) return;
    const current = run.current;
    const deadline = Math.min(current.window, run.msUntilEmpty());
    const left = deadline - (now() - reelStartRef.current);
    if (left <= 0) {
      commitRef.current([GESTURE.none, 0, 0]);
      return;
    }
    timerShown.value = withTiming(1, { duration: 120 });
    cancelAnimation(meter);
    meter.value = withTiming(
      Math.max(0, run.meter - (current.drain * deadline) / 1000),
      { duration: left, easing: Easing.linear },
    );
  }, [holdFill, holding, meter, timerShown, unschedule]);

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
      if (result.dragY !== 0) {
        dragY.value = result.dragY < 0 ? result.dragY : result.dragY * 0.25;
      }
      // A finger that travels — or has already swiped — has let go of a gold hold.
      if (holdRef.current && (result.detected || result.state.down?.moved)) dropHold();
      onDetected(result.detected);
    },
    [dragY, dropHold, onDetected],
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

  /** 3, 2, 1 — then the game clock starts and the first reel goes live. */
  const countDown = useCallback(() => {
    modeRef.current = 'idle';
    setCountdown(3);
    setPhase('countdown');
    schedule('count2', PACE.countdownStepMs, () => setCountdown(2));
    schedule('count1', PACE.countdownStepMs * 2, () => setCountdown(1));
    schedule('go', PACE.countdownStepMs * PACE.countdownSteps, () => {
      goAtRef.current = now();
      setPhase('playing');
      advanceReel();
    });
  }, [advanceReel, schedule]);

  const begin = useCallback(
    (runSeed: number, runId: string | null) => {
      runRef.current = new Run(runSeed);
      runIdRef.current = runId;
      actionsRef.current = [];
      goAtRef.current = null;
      markRef.current = 0;
      receiptsRef.current = [];
      checkingInRef.current = new Set();
      owedRef.current = [];
      retriesRef.current = 0;
      coachedRef.current = new Set();
      setCoach(null);
      setSeed(runSeed);
      setScore(0);
      setCombo(1000);
      setFeedback(null);
      setEnding(null);
      setReel(runRef.current.current);
      meter.value = 1000;
      timer.value = 1;
      timerShown.value = 1;
      dragY.value = 0;
      enter.value = 1;
      // A coached run explains its first reel before the countdown, so the 3-2-1 is for playing.
      if (practiceRef.current === 'tutorial') {
        enterCoach(runRef.current);
        return;
      }
      countDown();
    },
    [countDown, dragY, enter, enterCoach, meter, timer, timerShown],
  );

  /** The card is put away: the countdown, if the run has not started yet, or else the reel goes live on its next frame. */
  const dismissCoach = useCallback(() => {
    if (modeRef.current !== 'coach') return;
    setCoach(null);
    if (goAtRef.current === null) {
      countDown();
      return;
    }
    setPhase('playing');
    beginReel(true);
  }, [beginReel, countDown]);

  const start = useCallback(
    async (practiceReason: PracticeReason | null = null) => {
      clearTimers();
      modeRef.current = 'idle';
      practiceRef.current = practiceReason;
      setStartFailure(null);
      setPhase('starting');
      setPractice(practiceReason);
      if (practiceReason) {
        if (practiceReason === 'offline') track('offline_run');
        begin(localSeed(), null);
        return;
      }
      try {
        // A run kept on the phone goes first: starting another would leave it to the API as a forfeit.
        if (usePendingRun.getState().run) {
          await settled([sendPendingRun()], PENDING_WAIT_MS);
          if (!aliveRef.current) return;
        }
        const started = await api.runs.start({
          mode,
          engineVersion: ENGINE_VERSION,
          contentVersion: CONTENT_VERSION,
          ...(mode === 'vs' && vs ? (vs.duelId ? { duel: vs.duelId } : { opponent: vs.opponent }) : {}),
        });
        if (!aliveRef.current) return;
        begin(started.seed, started.runId);
      } catch (error) {
        if (!aliveRef.current) return;
        // A VS and a rated run are played on the API's seed and verified, or not at all.
        if (error instanceof ApiError && error.code === 'engine_outdated' && mode !== 'vs' && mode !== 'rated') {
          practiceRef.current = 'outdated';
          setPractice('outdated');
          track('outdated_run');
          begin(localSeed(), null);
          return;
        }
        setStartFailure({ error });
        setPhase('error');
      }
    },
    [begin, clearTimers, mode, vs?.duelId, vs?.opponent],
  );

  /**
   * Closing ends the run and scores it. Only a countdown just walks away —
   * and tells the API, which lets a run given up that early go for nothing —
   * except in a coached run, which has nothing behind it to go back to: it
   * always ends in its result.
   */
  const quit = useCallback(() => {
    if (modeRef.current === 'over' || !runRef.current) return;
    if (phase === 'countdown' && practiceRef.current !== 'tutorial') {
      clearTimers();
      modeRef.current = 'over';
      const runId = runIdRef.current;
      if (runId) void api.runs.cancel(runId).catch(() => undefined);
      return;
    }
    finish();
  }, [clearTimers, finish, phase]);

  const retrySubmit = useCallback(() => {
    const pending = usePendingRun.getState().run;
    if (ending?.mode !== 'unsent' || !pending) return;
    const { runId, savedAt: _savedAt, ...request } = pending;
    void send(runId, request);
  }, [ending, send]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      // Leaving the app ends the run: a paused reel could be studied at leisure —
      // one still being drawn too. Nothing is live under a coach card, so there
      // is nothing to study.
      const live =
        modeRef.current === 'arming' ||
        modeRef.current === 'live' ||
        modeRef.current === 'transition';
      if (state === 'background' && live) {
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

  // The words are written at render, in the language on screen — never kept in state.
  const outcome = useMemo<Outcome | null>(
    () =>
      ending?.mode === 'unsent'
        ? { mode: 'unsent', message: messageFor(ending.error, t), canRetry: ending.canRetry }
        : ending,
    [ending, t],
  );
  const startError = useMemo<StartError | null>(
    () =>
      startFailure && {
        message: messageFor(startFailure.error, t),
        code: startFailure.error instanceof ApiError ? startFailure.error.code : null,
      },
    [startFailure, t],
  );

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
    coach,
    values: { dragY, enter, timer, timerShown, holdFill, holding, meter },
    start,
    quit,
    dismissCoach,
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
