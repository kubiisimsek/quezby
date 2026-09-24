import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  useReducedMotion,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { PlayButton } from '@/ui/kit';

/** The official mock has no `useReducedMotion`; the loop is spied on. */
jest.mock('react-native-reanimated', () => {
  const reanimated = jest.requireActual('react-native-reanimated/mock');
  return {
    ...reanimated,
    useReducedMotion: jest.fn(() => false),
    withRepeat: jest.fn(reanimated.withRepeat),
    withTiming: jest.fn(reanimated.withTiming),
  };
});

describe('PlayButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useReducedMotion).mockReturnValue(false);
  });

  it('is the button, and plays', async () => {
    const onPress = jest.fn();
    await render(
      <PlayButton label="Oyna" icon="play" tone="onBrand" onPress={onPress} />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Oyna' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('breathes 1 → 1.04 and back, 1.6 s each way, for as long as it is up', async () => {
    await render(<PlayButton label="Oyna" onPress={jest.fn()} />);

    expect(withRepeat).toHaveBeenCalledWith(expect.anything(), -1);
    expect(withTiming).toHaveBeenCalledWith(
      1.04,
      expect.objectContaining({ duration: 1600 }),
    );
    expect(withTiming).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ duration: 1600 }),
    );
  });

  it('never starts for a player who asked the phone to reduce motion', async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);

    await render(<PlayButton label="Oyna" onPress={jest.fn()} />);

    expect(withRepeat).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Oyna' })).toBeOnTheScreen();
  });

  it('holds its breath while the lobby is covered', async () => {
    await render(
      <PlayButton label="Oyna" breathing={false} onPress={jest.fn()} />,
    );

    expect(withRepeat).not.toHaveBeenCalled();
  });
});
