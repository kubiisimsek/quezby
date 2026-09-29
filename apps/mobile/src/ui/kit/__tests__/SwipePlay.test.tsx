import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { usePanGesture } from 'react-native-gesture-handler';
import {
  useReducedMotion,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { SwipePlay } from '@/ui/kit';

/** The official mock has no `useReducedMotion`; the loops are spied on. */
jest.mock('react-native-reanimated', () => {
  const reanimated = jest.requireActual('react-native-reanimated/mock');
  return {
    ...reanimated,
    useReducedMotion: jest.fn(() => false),
    withRepeat: jest.fn(reanimated.withRepeat),
    withTiming: jest.fn(reanimated.withTiming),
  };
});

type End = { translationY: number; velocityY: number; canceled: boolean };

/** What the slab gave Gesture Handler: the swipe, as a test can drive it. */
function pan() {
  return jest.mocked(usePanGesture).mock.lastCall?.[0] as unknown as {
    activeOffsetY: number;
    failOffsetX: [number, number];
    onDeactivate: (event: End) => void;
  };
}

describe('SwipePlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useReducedMotion).mockReturnValue(false);
  });

  it('plays on a tap, with its line under it', async () => {
    const onPlay = jest.fn();
    await render(<SwipePlay label="Oyna" hint="Yukarı kaydır, oyna" onPlay={onPlay} />);

    expect(screen.getByText('Yukarı kaydır, oyna')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Oyna' }));

    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('listens for an upward swipe only, and lets a sideways one go', async () => {
    await render(<SwipePlay label="Oyna" onPlay={jest.fn()} />);

    expect(pan().activeOffsetY).toBeLessThan(0);
    expect(pan().failOffsetX).toEqual([-24, 24]);
  });

  it('plays on a swipe up that went far enough, or fast enough', async () => {
    const onPlay = jest.fn();
    await render(<SwipePlay label="Oyna" onPlay={onPlay} />);

    await act(async () => pan().onDeactivate({ translationY: -60, velocityY: -100, canceled: false }));
    await act(async () => pan().onDeactivate({ translationY: -12, velocityY: -900, canceled: false }));

    expect(onPlay).toHaveBeenCalledTimes(2);
  });

  it('stays for a short, slow swipe, or one the system took over', async () => {
    const onPlay = jest.fn();
    await render(<SwipePlay label="Oyna" onPlay={onPlay} />);

    await act(async () => pan().onDeactivate({ translationY: -20, velocityY: -300, canceled: false }));
    await act(async () => pan().onDeactivate({ translationY: -200, velocityY: -2_000, canceled: true }));

    expect(onPlay).not.toHaveBeenCalled();
  });

  it('climbs its chevrons on the slab’s breath', async () => {
    await render(<SwipePlay label="Oyna" onPlay={jest.fn()} />);

    expect(withTiming).toHaveBeenCalledWith(1, expect.objectContaining({ duration: 1600 }));
    expect(withTiming).toHaveBeenCalledWith(0, expect.objectContaining({ duration: 1600 }));
    expect(withRepeat).toHaveBeenCalledWith(expect.anything(), -1);
  });

  it('holds still while covered, or for a player who reduces motion', async () => {
    await render(<SwipePlay label="Oyna" breathing={false} onPlay={jest.fn()} />);
    expect(withRepeat).not.toHaveBeenCalled();

    jest.mocked(useReducedMotion).mockReturnValue(true);
    await render(<SwipePlay label="Oyna" onPlay={jest.fn()} />);
    expect(withRepeat).not.toHaveBeenCalled();
  });
});
