import {
  GESTURE_CONFIG,
  IDLE,
  isStillPress,
  touchDown,
  touchMove,
  touchUp,
  type TouchState,
} from '@/game/gesture';

function press(at: number, y = 400, state: TouchState = IDLE, freeze = false) {
  return touchDown(state, { at, y }, freeze);
}

describe('gesture', () => {
  it('recognises a quick upward drag while it moves, at that move', () => {
    const { state } = press(100);
    const move = touchMove(state, { at: 140, y: 350 });
    expect(move.detected).toEqual({ kind: 'up', at: 140 });
    expect(move.dragY).toBe(-50);
  });

  it('recognises a short fast flick at the move that makes it one', () => {
    let { state } = press(0);
    const first = touchMove(state, { at: 30, y: 385 });
    expect(first.detected).toBeUndefined();
    state = first.state;
    expect(touchMove(state, { at: 50, y: 375 }).detected).toEqual({ kind: 'up', at: 50 });
  });

  it('recognises a slow drag once it has travelled the swipe distance', () => {
    let { state } = press(0);
    for (const point of [
      { at: 200, y: 380 },
      { at: 400, y: 345 },
    ]) {
      const move = touchMove(state, point);
      expect(move.detected).toBeUndefined();
      state = move.state;
    }
    expect(touchMove(state, { at: 500, y: 400 - GESTURE_CONFIG.swipeDistance }).detected).toEqual({
      kind: 'up',
      at: 500,
    });
  });

  it('recognises a flick that only qualifies at the lift, at the lift', () => {
    let { state } = press(300);
    const move = touchMove(state, { at: 320, y: 390 });
    expect(move.detected).toBeUndefined();
    state = move.state;
    expect(touchUp(state, { at: 330, y: 378 }).detected).toEqual({ kind: 'up', at: 330 });
  });

  it('hears nothing more from a finger that has already swiped', () => {
    const swipe = touchMove(press(0).state, { at: 40, y: 320 });
    expect(swipe.detected).toEqual({ kind: 'up', at: 40 });
    const after = touchMove(swipe.state, { at: 60, y: 250 });
    expect(after.detected).toBeUndefined();
    expect(after.dragY).toBe(0);
    expect(touchUp(after.state, { at: 80, y: 240 }).detected).toBeUndefined();
  });

  it('lets a slow short drag spring back without a gesture', () => {
    let { state } = press(0);
    for (const point of [
      { at: 200, y: 380 },
      { at: 400, y: 370 },
    ]) {
      const move = touchMove(state, point);
      expect(move.detected).toBeUndefined();
      state = move.state;
    }
    expect(touchUp(state, { at: 420, y: 370 }).detected).toEqual({ kind: 'cancel' });
  });

  it('never swipes downward', () => {
    let { state } = press(0);
    state = touchMove(state, { at: 50, y: 500 }).state;
    expect(touchUp(state, { at: 60, y: 520 }).detected).toEqual({ kind: 'cancel' });
  });

  it('turns two taps inside the gap into a like at the second touch', () => {
    let { state } = press(0);
    const first = touchUp(state, { at: 90, y: 400 });
    expect(first.detected).toEqual({ kind: 'tap' });
    const second = press(90 + GESTURE_CONFIG.doubleTapGap, 400, first.state);
    expect(second.detected).toEqual({
      kind: 'like',
      at: 90 + GESTURE_CONFIG.doubleTapGap,
    });
    expect(touchUp(second.state, { at: 500, y: 400 }).detected).toBeUndefined();
  });

  it('never reads a tap’s wobble as a swipe — two such taps are still a like', () => {
    const wobble = touchMove(press(0).state, { at: 15, y: 390 });
    expect(wobble.detected).toBeUndefined();
    const first = touchUp(wobble.state, { at: 60, y: 390 });
    expect(first.detected).toEqual({ kind: 'tap' });
    expect(press(200, 400, first.state).detected).toEqual({ kind: 'like', at: 200 });
  });

  it('does not pair taps that are too far apart', () => {
    const first = touchUp(press(0).state, { at: 80, y: 400 });
    const late = press(80 + GESTURE_CONFIG.doubleTapGap + 1, 400, first.state);
    expect(late.detected).toBeUndefined();
  });

  it('reads a still press as a hold, timed from touch-down', () => {
    const { state } = press(1000);
    expect(isStillPress(state)).toBe(true);
    expect(touchUp(state, { at: 1640, y: 402 }).detected).toEqual({
      kind: 'hold',
      at: 1000,
      duration: 640,
    });
  });

  it('keeps a press under the hold threshold a tap', () => {
    const { state } = press(0);
    expect(touchUp(state, { at: GESTURE_CONFIG.holdMin - 1, y: 400 }).detected).toEqual({
      kind: 'tap',
    });
  });

  it('calls any contact with a freeze reel a touch, at once', () => {
    expect(press(250, 400, IDLE, true).detected).toEqual({ kind: 'touch', at: 250 });
  });

  it('stops being a still press once the finger travels', () => {
    let { state } = press(0);
    state = touchMove(state, { at: 30, y: 400 - GESTURE_CONFIG.slop - 1 }).state;
    expect(isStillPress(state)).toBe(false);
  });
});
