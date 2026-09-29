import type { Reel, ReelKind } from '@quezby/engine';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import { lookOf } from '@/game/content';
import { ReelCard, type ReelValues } from '@/game/ReelCard';
import { useLanguage } from '@/i18n/language';

function shared(value: number): SharedValue<number> {
  return { value } as unknown as SharedValue<number>;
}

const VALUES: ReelValues = {
  dragY: shared(0),
  enter: shared(1),
  timer: shared(1),
  timerShown: shared(1),
  holdFill: shared(0),
  holding: shared(0),
};

function reel(kind: ReelKind): Reel {
  return {
    index: 3,
    kind,
    window: 2_000,
    holdFill: kind === 'hold' ? 1_200 : 0,
    zoneCenter: 600,
    zoneHalf: 120,
    drain: 60,
    level: 1,
  };
}

describe('ReelCard', () => {
  it('wears its kind’s badge and, while the intro teaches, its hint', async () => {
    await render(<ReelCard reel={reel('like')} seed={42} values={VALUES} hint />);

    expect(screen.getByText('Arkadaşın')).toBeOnTheScreen();
    expect(screen.getByText('Arkadaşının postu — çift dokun')).toBeOnTheScreen();
    expect(screen.getByText('Paylaş')).toBeOnTheScreen();
  });

  it('asks for a gold post to be held and let go in the green', async () => {
    await render(<ReelCard reel={reel('hold')} seed={42} values={VALUES} hint={false} />);

    expect(screen.getByText('Altın post')).toBeOnTheScreen();
    expect(screen.getByText('Basılı tut · yeşilde bırak')).toBeOnTheScreen();
  });

  it('fills the gold bar square-ended, with a dark edge where it stands', async () => {
    await render(<ReelCard reel={reel('hold')} seed={42} values={VALUES} hint={false} />);

    const fill = StyleSheet.flatten(screen.getByTestId('hold-fill').props.style);
    expect(fill.borderRadius).toBeUndefined();
    expect(screen.getByTestId('hold-tip')).toHaveStyle({ position: 'absolute', right: 0, width: 3 });
    expect(screen.getByTestId('hold-track')).toHaveStyle({ borderRadius: 4 });
  });

  it('draws each post in the format the catalog gave it, on its kind’s backdrop', async () => {
    for (const kind of ['skip', 'like', 'hold', 'freeze'] as const) {
      const look = lookOf(42, reel(kind));
      await render(<ReelCard reel={reel(kind)} seed={42} values={VALUES} hint={false} />);
      expect(screen.getByTestId(`post-${look.media.format}`)).toBeOnTheScreen();
    }
    expect(screen.getByTestId(lookOf(42, reel('freeze')).media.format === 'sign' ? 'backdrop-tape' : 'backdrop-scan')).toBeOnTheScreen();
  });

  it('draws the time bar while a post is live', async () => {
    await render(<ReelCard reel={reel('skip')} seed={42} values={VALUES} hint={false} />);

    expect(screen.getByTestId('post-timer')).toHaveStyle({ opacity: 1 });
  });

  it('hides the time bar while a gold post is held — its gold bar is the clock', async () => {
    const held = { ...VALUES, timerShown: shared(0), holding: shared(1) };
    await render(<ReelCard reel={reel('hold')} seed={42} values={held} hint={false} />);

    expect(screen.getByTestId('post-timer')).toHaveStyle({ opacity: 0 });
    expect(screen.getByText('Basılı tut · yeşilde bırak')).toBeOnTheScreen();
  });

  it('speaks English', async () => {
    useLanguage.setState({ locale: 'en' });
    await render(<ReelCard reel={reel('like')} seed={42} values={VALUES} hint />);

    expect(screen.getByText('Your friend')).toBeOnTheScreen();
    expect(screen.getByText("Your friend's post — double-tap")).toBeOnTheScreen();
    expect(screen.getByText('Share')).toBeOnTheScreen();

    await screen.rerender(<ReelCard reel={reel('hold')} seed={42} values={VALUES} hint={false} />);
    expect(screen.getByText('Hold · let go in the green')).toBeOnTheScreen();
  });

  it('speaks Arabic', async () => {
    useLanguage.setState({ locale: 'ar' });
    await render(<ReelCard reel={reel('freeze')} seed={42} values={VALUES} hint />);

    expect(screen.getByText('لا تلمس')).toBeOnTheScreen();
    expect(screen.getByText('لا تلمس شيئًا، انتظر حتى يمر')).toBeOnTheScreen();
    expect(screen.getByText('مشاركة')).toBeOnTheScreen();

    await screen.rerender(<ReelCard reel={reel('hold')} seed={42} values={VALUES} hint={false} />);
    expect(screen.getByText('اضغط مطولًا · ارفع في الأخضر')).toBeOnTheScreen();
  });
});
