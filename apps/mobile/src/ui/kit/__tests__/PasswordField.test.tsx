import { fireEvent, render, screen } from '@testing-library/react-native';

import { useLanguage } from '@/i18n/language';
import { PasswordField } from '@/ui/kit';

describe('PasswordField', () => {
  it('hides what is typed until its eye is pressed, and says which way it will go', async () => {
    await render(<PasswordField label="Şifre" value="gizli123" onChangeText={jest.fn()} />);

    expect(screen.getByLabelText('Şifre')).toHaveProp('secureTextEntry', true);
    await fireEvent.press(screen.getByRole('button', { name: 'Şifreyi göster' }));

    expect(screen.getByLabelText('Şifre')).toHaveProp('secureTextEntry', false);
    expect(screen.getByRole('button', { name: 'Şifreyi gizle' })).toBeOnTheScreen();
  });

  it('names its eye in the player’s language', async () => {
    useLanguage.setState({ locale: 'en' });
    await render(<PasswordField label="Password" value="" onChangeText={jest.fn()} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeOnTheScreen();
  });
});
