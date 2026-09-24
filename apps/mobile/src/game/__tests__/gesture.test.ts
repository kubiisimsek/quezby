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
  it('reads a quick upward drag as a swipe that started at touch-down', () => {
    let { state } = press(100);
    state = touchMove(state, { at: 140, y: 350 }).state;
    state = touchMove(state, { at: 180, y: 320 }).state;
    const result = touchUp(state, { at: 190, y: 320 });
    expect(result.detected).toEqual({ kind: 'up', at: 100 });
  });

  it('reads a short fast flick as a swipe too', () => {
    let { state } = press(0);
    state = touchMove(state, { at: 30, y: 385 }).state;
    state = touchMove(state, { at: 50, y: 375 }).state;
    expect(touchUp(state, { at: 55, y: 375 }).detected).toEqual({ kind: 'up', at: 0 });
  });

  it('lets a slow short drag spring back without a gesture', () => {
    let { state } = press(0);
    state = touchMove(state, { at: 200, y: 380 }).state;
    state = touchMove(state, { at: 400, y: 370 }).state;
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
