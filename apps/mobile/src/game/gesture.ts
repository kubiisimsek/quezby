/**
 * Raw touches in, one of the four gestures out — kept pure so it can be
 * tested without a phone.
 *
 * The game does not stack a swipe, a double-tap and a long-press recognizer on
 * one view: they fight, and a double-tap recognizer makes every single tap
 * wait for it. Instead each touch is read once, here, from its distance,
 * speed and duration. A single tap on its own does nothing — the only
 * gestures that count are the ones a reels app already taught the thumb.
 *
 * A gesture counts the moment it is recognised, and that is its time: a
 * swipe while the finger is still moving, as soon as it has gone far or fast
 * enough — or at the lift, if only the lift makes it one. The post leaves
 * then, so the time it was on screen is exactly the time the engine counts.
 */
export const GESTURE_CONFIG = {
  /** Travel before a press becomes a drag. */
  slop: 12,
  /** Upward travel that makes a drag a swipe, the moment it is reached. */
  swipeDistance: 60,
  /** …or a shorter flick at this speed, px/ms. */
  swipeVelocity: 0.35,
  flickDistance: 20,
  /** A press held this long is a hold, not a tap. */
  holdMin: 180,
  /** The most time between the first tap's lift and the second touch. */
  doubleTapGap: 280,
} as const;

export type Point = { at: number; y: number };

type Down = {
  at: number;
  y: number;
  lastY: number;
  lastAt: number;
  velocity: number;
  moved: boolean;
};

export type TouchState = {
  down: Down | null;
  /** The finger on the glass already produced its gesture. */
  consumed: boolean;
  /** A lone tap, waiting for its twin. */
  lastTapUpAt: number | null;
};

export type Detected =
  | { kind: 'touch'; at: number }
  | { kind: 'like'; at: number }
  | { kind: 'up'; at: number }
  | { kind: 'hold'; at: number; duration: number }
  | { kind: 'tap' }
  | { kind: 'cancel' };

export const IDLE: TouchState = { down: null, consumed: false, lastTapUpAt: null };

/** A finger that has gone this far up, or this fast and far enough, has swiped. */
function swiped(dy: number, velocity: number): boolean {
  return (
    dy <= -GESTURE_CONFIG.swipeDistance ||
    (velocity <= -GESTURE_CONFIG.swipeVelocity && dy <= -GESTURE_CONFIG.flickDistance)
  );
}

export function touchDown(
  state: TouchState,
  point: Point,
  freezeReel: boolean,
): { state: TouchState; detected?: Detected } {
  if (freezeReel) {
    return {
      state: { down: null, consumed: true, lastTapUpAt: null },
      detected: { kind: 'touch', at: point.at },
    };
  }
  if (
    state.lastTapUpAt !== null &&
    point.at - state.lastTapUpAt <= GESTURE_CONFIG.doubleTapGap
  ) {
    return {
      state: { down: null, consumed: true, lastTapUpAt: null },
      detected: { kind: 'like', at: point.at },
    };
  }
  return {
    state: {
      down: {
        at: point.at,
        y: point.y,
        lastY: point.y,
        lastAt: point.at,
        velocity: 0,
        moved: false,
      },
      consumed: false,
      lastTapUpAt: null,
    },
  };
}

/** A swipe is recognised here, mid-drag; after it the finger is heard no more. */
export function touchMove(
  state: TouchState,
  point: Point,
): { state: TouchState; dragY: number; detected?: Detected } {
  const down = state.down;
  if (!down || state.consumed) return { state, dragY: 0 };
  const dy = point.y - down.y;
  const elapsed = point.at - down.lastAt;
  const velocity = elapsed > 0 ? (point.y - down.lastY) / elapsed : down.velocity;
  if (swiped(dy, velocity)) {
    return {
      state: { down: null, consumed: true, lastTapUpAt: null },
      dragY: dy,
      detected: { kind: 'up', at: point.at },
    };
  }
  const moved = down.moved || Math.abs(dy) > GESTURE_CONFIG.slop;
  return {
    state: {
      ...state,
      down: { ...down, lastY: point.y, lastAt: point.at, velocity, moved },
    },
    dragY: moved ? dy : 0,
  };
}

export function touchUp(
  state: TouchState,
  point: Point,
): { state: TouchState; detected?: Detected } {
  const down = state.down;
  if (!down || state.consumed) return { state: IDLE };

  const dy = point.y - down.y;
  if (down.moved || Math.abs(dy) > GESTURE_CONFIG.slop) {
    // A flick the last move fell just short of: the lift makes it a swipe.
    return {
      state: IDLE,
      detected: swiped(dy, down.velocity) ? { kind: 'up', at: point.at } : { kind: 'cancel' },
    };
  }

  const duration = point.at - down.at;
  if (duration >= GESTURE_CONFIG.holdMin) {
    return { state: IDLE, detected: { kind: 'hold', at: down.at, duration } };
  }
  return {
    state: { down: null, consumed: false, lastTapUpAt: point.at },
    detected: { kind: 'tap' },
  };
}

/** A pressed finger that has not moved — the one that may become a hold. */
export function isStillPress(state: TouchState): boolean {
  return state.down !== null && !state.consumed && !state.down.moved;
}
