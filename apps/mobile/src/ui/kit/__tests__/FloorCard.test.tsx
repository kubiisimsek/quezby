import { fireEvent, screen } from '@testing-library/react-native';

import { iso } from '@/i18n';
import { useLanguage } from '@/i18n/language';
import { renderWithProviders } from '@/test/renderWithProviders';
import { FloorCard } from '@/ui/kit';
import { arena as light } from '@/ui/tokens';

describe('FloorCard', () => {
  it('shows your floor, who is above and what it takes to pass them', async () => {
    const onPlay = jest.fn();
    await renderWithProviders(
      <FloorCard
        rank={44}
        score={9_870}
        targetUsername="ekin"
        gapToNext={1_240}
        progress={620}
        onPlay={onPlay}
      />,
    );

    expect(screen.getByText('SENİN KATIN')).toHaveProp(
      'accessibilityLabel',
      'Senin katın',
    );
    expect(screen.getByText('#44')).toHaveStyle({ color: light.gold });
    expect(screen.getByText('Sen · 9.870')).toBeOnTheScreen();
    expect(screen.getByText("@ekin'e 1.240 puan")).toBeOnTheScreen();
    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({
      min: 0,
      max: 100,
      now: 62,
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Geç onu' }));
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onPlay).toHaveBeenCalledWith(true);
  });

  it('bends the suffix to the name', async () => {
    await renderWithProviders(
      <FloorCard
        rank={7}
        score={500}
        targetUsername="oya"
        gapToNext={300}
        onPlay={jest.fn()}
      />,
    );

    expect(screen.getByText("@oya'ya 300 puan")).toBeOnTheScreen();
  });

  it('still says the gap when the name is not known', async () => {
    await renderWithProviders(
      <FloorCard rank={7} score={500} gapToNext={1_240} onPlay={jest.fn()} />,
    );

    expect(screen.getByText('Bir üst sıraya 1.240 puan')).toBeOnTheScreen();
    expect(screen.queryByRole('progressbar')).not.toBeOnTheScreen();
  });

  it('tells the leader to hold on, and just to play', async () => {
    await renderWithProviders(
      <FloorCard
        rank={1}
        score={24_000}
        targetUsername={null}
        gapToNext={null}
        onPlay={jest.fn()}
      />,
    );

    expect(screen.getByText('#1')).toBeOnTheScreen();
    expect(screen.getByText('Zirvedesin! Yerini koru.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Oyna' })).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Geç onu' }),
    ).not.toBeOnTheScreen();
  });

  it('invites a player with no run this period to play', async () => {
    const onPlay = jest.fn();
    await renderWithProviders(
      <FloorCard rank={null} score={null} onPlay={onPlay} />,
    );

    expect(screen.getByText('—')).toHaveStyle({ color: light.inkFaint });
    expect(screen.getByText('Sen')).toBeOnTheScreen();
    expect(screen.getByText('Bu dönemde henüz sıran yok.')).toBeOnTheScreen();
    expect(screen.queryByRole('progressbar')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Oyna' }));
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onPlay).toHaveBeenCalledWith(false);
  });

  it('keeps the progress inside its range', async () => {
    await renderWithProviders(
      <FloorCard
        rank={9}
        score={10}
        gapToNext={5}
        progress={1_400}
        onPlay={jest.fn()}
      />,
    );

    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({
      now: 100,
    });
  });
});

describe('FloorCard — in other languages', () => {
  it('names the player to pass in English, without bending the name', async () => {
    useLanguage.setState({ locale: 'en' });
    await renderWithProviders(
      <FloorCard
        rank={44}
        score={9_870}
        targetUsername="ekin"
        gapToNext={1_240}
        progress={620}
        onPlay={jest.fn()}
      />,
    );

    expect(screen.getByText('YOUR FLOOR')).toHaveProp(
      'accessibilityLabel',
      'Your floor',
    );
    expect(screen.getByText('You · 9,870')).toBeOnTheScreen();
    expect(screen.getByText('1,240 pts to @ekin')).toBeOnTheScreen();
    expect(
      screen.getByRole('progressbar', { name: 'Progress to the next rank' }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Pass them' })).toBeOnTheScreen();

    await screen.rerender(
      <FloorCard rank={7} score={500} gapToNext={1} onPlay={jest.fn()} />,
    );
    expect(screen.getByText('1 pt to the next rank')).toBeOnTheScreen();

    await screen.rerender(
      <FloorCard rank={1} score={24_000} gapToNext={null} onPlay={jest.fn()} />,
    );
    expect(
      screen.getByText("You're on the summit! Hold your spot."),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Play' })).toBeOnTheScreen();
  });

  it('keeps the name whole in the Arabic line', async () => {
    useLanguage.setState({ locale: 'ar' });
    await renderWithProviders(
      <FloorCard
        rank={44}
        score={9_870}
        targetUsername="ekin"
        gapToNext={2}
        onPlay={jest.fn()}
      />,
    );

    expect(
      screen.getByText(`تفصلك نقطتان عن ${iso('@ekin')}`),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'تجاوزه' })).toBeOnTheScreen();
  });
});
