import { fireEvent, render, screen, within } from '@testing-library/react-native';

import { IconButton } from '@/ui/kit';
import { arena } from '@/ui/tokens';

describe('IconButton', () => {
  it('is a button named by its label, and presses', async () => {
    const onPress = jest.fn();
    await render(
      <IconButton icon="help" label="Nasıl oynanır" onPress={onPress} />,
    );

    await fireEvent.press(
      screen.getByRole('button', { name: 'Nasıl oynanır' }),
    );

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('counts what is new on its corner and says so', async () => {
    await render(
      <IconButton
        icon="users"
        label="Arkadaşlar"
        badge={3}
        onPress={jest.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Arkadaşlar, 3 yeni' }),
    ).toBeOnTheScreen();
    expect(screen.getByText('3')).toBeOnTheScreen();
  });

  it('caps the badge at 9+ and hides it at zero', async () => {
    await render(
      <IconButton
        icon="users"
        label="Arkadaşlar"
        badge={12}
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByText('9+')).toBeOnTheScreen();

    await screen.rerender(
      <IconButton
        icon="users"
        label="Arkadaşlar"
        badge={0}
        onPress={jest.fn()}
      />,
    );
    expect(screen.queryByText('0')).not.toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Arkadaşlar' }),
    ).toBeOnTheScreen();
  });

  it('is a violet slab on a brand stage and a tile slab on the arena', async () => {
    await render(
      <IconButton
        icon="search"
        label="Ara"
        tone="onBrand"
        onPress={jest.fn()}
      />,
    );
    const onStage = screen.getByRole('button', { name: 'Ara' });
    expect(within(onStage).getByTestId('slab-face')).toHaveStyle({
      backgroundColor: arena.secondary,
      borderColor: arena.outline,
    });

    await screen.rerender(
      <IconButton icon="search" label="Ara" onPress={jest.fn()} />,
    );
    const onArena = screen.getByRole('button', { name: 'Ara' });
    expect(within(onArena).getByTestId('slab-face')).toHaveStyle({
      backgroundColor: arena.tile,
    });
  });
});
