import { fireEvent, render, screen } from '@testing-library/react-native';

import { Counters } from '@/ui/kit';
import { arena } from '@/ui/tokens';

describe('Counters', () => {
  it('shows each number over its name, a record in gold', async () => {
    await render(
      <Counters
        items={[
          { label: 'Rekor', value: '12.345', gold: true },
          { label: 'Tur', value: '42' },
        ]}
      />,
    );

    expect(screen.getByLabelText('12.345 Rekor')).toBeOnTheScreen();
    expect(screen.getByText('12.345')).toHaveStyle({ color: arena.gold });
    expect(screen.getByText('42')).toHaveStyle({ color: arena.ink });
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });

  it('opens what a counter leads to, and wears what waits there', async () => {
    const onPress = jest.fn();
    await render(
      <Counters
        items={[
          {
            label: 'Arkadaş',
            value: '12',
            badge: 2,
            onPress,
            accessibilityLabel: '12 arkadaş, 2 yeni',
          },
        ]}
      />,
    );

    expect(screen.getByText('2')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: '12 arkadaş, 2 yeni' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
