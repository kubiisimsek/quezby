import { fireEvent, render, screen } from '@testing-library/react-native';
import { useReducedMotion, withRepeat } from 'react-native-reanimated';

import { useLanguage } from '@/i18n/language';
import { CoachCard, type CoachGesture } from '@/ui/kit';

jest.mock('react-native-reanimated', () => {
  const reanimated = jest.requireActual('react-native-reanimated/mock');
  return {
    ...reanimated,
    useReducedMotion: jest.fn(() => false),
    withRepeat: jest.fn(reanimated.withRepeat),
  };
});

function card(gesture: CoachGesture = 'hold', onDismiss = jest.fn()) {
  return (
    <CoachCard
      gesture={gesture}
      icon="hand"
      tone="warn"
      title="Altın post"
      line="Basılı tut, çubuk yeşildeyken bırak."
      step={3}
      of={4}
      onDismiss={onDismiss}
    />
  );
}

describe('CoachCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useReducedMotion).mockReturnValue(false);
  });

  it('names the new kind, says what to do, and counts the kinds', async () => {
    await render(card());

    expect(screen.getByText('YENİ POST · 3/4')).toBeOnTheScreen();
    expect(screen.getByText('Altın post')).toBeOnTheScreen();
    expect(screen.getByText('Basılı tut, çubuk yeşildeyken bırak.')).toBeOnTheScreen();
  });

  it('starts the post from its one gold slab', async () => {
    const onDismiss = jest.fn();
    await render(card('hold', onDismiss));

    await fireEvent.press(screen.getByRole('button', { name: 'Anladım' }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it.each<CoachGesture>(['swipe', 'doubleTap', 'hold', 'still'])('acts out %s, hidden from a screen reader', async (gesture) => {
    await render(card(gesture));

    const demo = screen.getByTestId(`coach-demo-${gesture}`, { includeHiddenElements: true });
    expect(demo.props.accessibilityElementsHidden).toBe(true);
  });

  it('acts the move out twice, then rests — never on a loop', async () => {
    await render(card('swipe'));

    expect(withRepeat).toHaveBeenCalledWith(expect.anything(), 2, false);
  });

  it('shows the last frame at once for a player who reduces motion', async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    await render(card('swipe'));

    expect(withRepeat).not.toHaveBeenCalled();
    expect(screen.getByText('Altın post')).toBeOnTheScreen();
  });

  it('speaks English', async () => {
    useLanguage.setState({ locale: 'en' });
    await render(card());

    expect(screen.getByText('NEW POST · 3/4')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Got it' })).toBeOnTheScreen();
  });

  it('speaks Arabic, keeping the count whole', async () => {
    useLanguage.setState({ locale: 'ar' });
    await render(card());

    expect(screen.getByText('منشور جديد · \u200E3/4\u200E')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'فهمت' })).toBeOnTheScreen();
  });
});
