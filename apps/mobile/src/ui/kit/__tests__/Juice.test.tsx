import { act, render, renderHook, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useReducedMotion, withSequence } from 'react-native-reanimated';

import { formatsFor } from '@/i18n/format';

const formatScore = formatsFor('tr').score;
import { Confetti, CountUp, Stamp, useShake } from '@/ui/kit';

jest.mock('react-native-reanimated', () => {
  const reanimated = jest.requireActual('react-native-reanimated/mock');
  return {
    ...reanimated,
    useReducedMotion: jest.fn(() => false),
    withSequence: jest.fn(reanimated.withSequence),
  };
});

describe('juice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useReducedMotion).mockReturnValue(false);
  });

  it('stamps its children in', async () => {
    await render(
      <Stamp delay={100}>
        <Text>YENİ REKOR!</Text>
      </Stamp>,
    );

    expect(screen.getByText('YENİ REKOR!')).toBeOnTheScreen();
  });

  it('counts up to the number, and a screen reader hears the number at once', async () => {
    jest.useFakeTimers();
    await render(<CountUp value={24_303} format={formatScore} />);

    expect(screen.getByLabelText('24.303')).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(2_000);
    });
    expect(screen.getByText('24.303')).toBeOnTheScreen();
    jest.useRealTimers();
  });

  it('shows the number straight away for a player who reduces motion', async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    await render(<CountUp value={1_018_520} format={formatScore} />);

    expect(screen.getByText('1.018.520')).toBeOnTheScreen();
  });

  it('draws confetti only once fired, and never with reduced motion', async () => {
    const { toJSON } = await render(<Confetti fire={0} />);
    expect(toJSON()).toBeNull();

    await screen.rerender(<Confetti fire={1} count={12} />);
    expect(toJSON()).not.toBeNull();

    jest.mocked(useReducedMotion).mockReturnValue(true);
    await screen.rerender(<Confetti fire={2} count={12} />);
    expect(toJSON()).toBeNull();
  });

  it('shakes on demand, and not at all with reduced motion', async () => {
    const { result } = await renderHook(() => useShake());
    await act(async () => {
      result.current.shake();
    });
    expect(withSequence).toHaveBeenCalledTimes(1);

    jest.mocked(useReducedMotion).mockReturnValue(true);
    const reduced = await renderHook(() => useShake());
    await act(async () => {
      reduced.result.current.shake();
    });
    expect(withSequence).toHaveBeenCalledTimes(1);
  });
});
