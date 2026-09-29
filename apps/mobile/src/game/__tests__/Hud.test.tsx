import { fireEvent, render, screen } from '@testing-library/react-native';
import type { SharedValue } from 'react-native-reanimated';

import { Hud } from '@/game/Hud';
import { useLanguage } from '@/i18n/language';

function shared(value: number): SharedValue<number> {
  return { value } as unknown as SharedValue<number>;
}

/** The second level (reel 20), a combo of x1.25, and 12,345 points. */
function hud(onClose = jest.fn()) {
  return (
    <Hud meter={shared(1000)} score={12_345} combo={1_250} reelIndex={20} onClose={onClose} />
  );
}

describe('Hud', () => {
  it('names the meter, the level and the combo, and leaves from the close slab', async () => {
    const onClose = jest.fn();
    await render(hud(onClose));

    expect(screen.getByText('Dopamin')).toBeOnTheScreen();
    expect(screen.getByText('Seviye 2')).toBeOnTheScreen();
    expect(screen.getByText('12.345')).toBeOnTheScreen();
    expect(screen.getByText('x1,25')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Oyundan çık' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('says who a VS run is against, and nothing of the kind otherwise', async () => {
    const { rerender } = await render(
      <Hud meter={shared(1000)} score={0} combo={1_000} reelIndex={0} versus="VS · @ekin" onClose={jest.fn()} />,
    );
    expect(screen.getByText('VS · @ekin')).toBeOnTheScreen();

    await rerender(hud());
    expect(screen.queryByText('VS · @ekin')).toBeNull();
  });

  it('marks a rated run with its pill', async () => {
    await render(
      <Hud meter={shared(1000)} score={0} combo={1_000} reelIndex={0} rated="Dereceli" onClose={jest.fn()} />,
    );

    expect(screen.getByText('Dereceli')).toBeOnTheScreen();
  });

  it('speaks English', async () => {
    useLanguage.setState({ locale: 'en' });
    await render(hud());

    expect(screen.getByText('Dopamine')).toBeOnTheScreen();
    expect(screen.getByText('Level 2')).toBeOnTheScreen();
    expect(screen.getByText('12,345')).toBeOnTheScreen();
    expect(screen.getByText('x1.25')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Leave the game' })).toBeOnTheScreen();
  });

  it('speaks Arabic', async () => {
    useLanguage.setState({ locale: 'ar' });
    await render(hud());

    expect(screen.getByText('الدوبامين')).toBeOnTheScreen();
    expect(screen.getByText('المستوى 2')).toBeOnTheScreen();
    expect(screen.getByText('12,345')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'الخروج من اللعبة' })).toBeOnTheScreen();
  });
});
