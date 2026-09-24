import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Button, Slab, buttonColors } from '@/ui/kit';
import { THEME } from '@/ui/theme';

describe('Slab', () => {
  it('is one button: a face on its lip, both in the outline', async () => {
    const onPress = jest.fn();
    await render(
      <Slab colors={buttonColors(THEME, 'play')} radius={16} onPress={onPress} accessibilityLabel="Oyna">
        <Text>Oyna</Text>
      </Slab>,
    );

    const slab = screen.getByRole('button', { name: 'Oyna' });
    expect(within(slab).getByTestId('slab-face')).toHaveStyle({
      backgroundColor: THEME.gold,
      borderColor: THEME.outline,
      borderRadius: 16,
    });

    await fireEvent.press(slab);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does nothing while disabled, and says so', async () => {
    const onPress = jest.fn();
    await render(
      <Slab colors={buttonColors(THEME, 'primary')} radius={16} onPress={onPress} disabled accessibilityLabel="Geç onu" />,
    );

    const slab = screen.getByRole('button', { name: 'Geç onu' });
    expect(slab).toBeDisabled();
    await fireEvent.press(slab);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Button', () => {
  it('reads gold ink on a gold slab and white on the others', async () => {
    await render(<Button label="Oyna" tone="play" onPress={jest.fn()} />);
    expect(screen.getByText('Oyna')).toHaveStyle({ color: THEME.goldInk });

    await screen.rerender(<Button label="Oyna" tone="primary" onPress={jest.fn()} />);
    expect(screen.getByText('Oyna')).toHaveStyle({ color: THEME.onBrand });
  });

  it('is plain text as a ghost', async () => {
    await render(<Button label="Ana sayfaya dön" tone="ghost" onPress={jest.fn()} />);

    const button = screen.getByRole('button', { name: 'Ana sayfaya dön' });
    expect(within(button).queryByTestId('slab-face')).not.toBeOnTheScreen();
  });
});
