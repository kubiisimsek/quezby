import { fireEvent, render, screen } from '@testing-library/react-native';

import { SocialButton } from '@/ui/kit';
import { arena } from '@/ui/tokens';

describe('SocialButton', () => {
  it('continues with Apple in black with white text', async () => {
    const onPress = jest.fn();
    await render(<SocialButton provider="apple" onPress={onPress} />);

    const button = screen.getByRole('button', { name: 'Apple ile devam et' });
    expect(screen.getByText('Apple ile devam et')).toBeOnTheScreen();
    expect(button).toHaveStyle({ backgroundColor: arena.appleBg });
    expect(screen.getByText('Apple ile devam et')).toHaveStyle({
      color: arena.appleInk,
    });

    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('continues with Google on its outlined surface', async () => {
    await render(<SocialButton provider="google" onPress={jest.fn()} />);

    const button = screen.getByRole('button', { name: 'Google ile devam et' });
    expect(button).toHaveStyle({
      backgroundColor: arena.googleBg,
      borderColor: arena.googleLine,
    });
    expect(screen.getByText('Google ile devam et')).toHaveStyle({
      color: arena.googleInk,
    });
  });

  it('takes a label of its own', async () => {
    await render(
      <SocialButton
        provider="google"
        label="Google hesabını bağla"
        onPress={jest.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Google hesabını bağla' }),
    ).toBeOnTheScreen();
  });

  it('is busy and does not press while loading', async () => {
    const onPress = jest.fn();
    await render(<SocialButton provider="apple" loading onPress={onPress} />);

    const button = screen.getByRole('button', { name: 'Apple ile devam et' });
    expect(button).toBeBusy();
    expect(button).toBeDisabled();
    expect(screen.queryByText('Apple ile devam et')).not.toBeOnTheScreen();

    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not press while disabled', async () => {
    const onPress = jest.fn();
    await render(<SocialButton provider="google" disabled onPress={onPress} />);

    const button = screen.getByRole('button', { name: 'Google ile devam et' });
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
