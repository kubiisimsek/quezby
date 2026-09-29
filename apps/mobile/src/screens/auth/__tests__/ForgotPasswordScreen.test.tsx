import { ApiError } from '@quezby/sdk';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { useLanguage } from '@/i18n/language';
import { ForgotPasswordScreen } from '@/screens/auth/ForgotPasswordScreen';
import { useOnboarding } from '@/stores/onboarding';
import { useSettings } from '@/stores/settings';
import { buildMe } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/api/client', () => ({
  api: { auth: { forgotPassword: jest.fn(), resetPassword: jest.fn() } },
}));

const mocked = api as unknown as { auth: { forgotPassword: jest.Mock; resetPassword: jest.Mock } };
const SENT = { email: 'ekin@example.com', resendIn: 60, expiresAt: '2026-09-29T10:15:00.000Z' };

type Props = Parameters<typeof ForgotPasswordScreen>[0];
const goBack = jest.fn();
const props = (email?: string) =>
  ({
    navigation: { goBack, canGoBack: () => true },
    route: { key: 'ForgotPassword', name: 'ForgotPassword', params: email ? { email } : undefined },
  }) as unknown as Props;

async function toCode() {
  mocked.auth.forgotPassword.mockResolvedValue(SENT);
  await renderWithProviders(<ForgotPasswordScreen {...props('ekin@example.com')} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Kod gönder' }));
  await screen.findByLabelText('Kod');
}

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSession.setState({ token: null, user: null, ranks: null, hydrated: true });
    useOnboarding.setState({ practiced: true, playing: false, userId: null, steps: [], remindedFor: null, hydrated: true });
    useSettings.setState({ hydrated: true, consent: 'unasked', analytics: false });
  });

  it('asks for the email first, filled in from the sign-in', async () => {
    await renderWithProviders(<ForgotPasswordScreen {...props('ekin@example.com')} />);

    expect(screen.getByText('Hesabının e-postasını yaz, sana bir kod gönderelim.')).toBeTruthy();
    expect(screen.getByLabelText('E-posta').props.value).toBe('ekin@example.com');
    expect(screen.queryByLabelText('Kod')).toBeNull();
  });

  it('sends the code, then asks for it and the new password twice', async () => {
    await toCode();

    expect(mocked.auth.forgotPassword).toHaveBeenCalledWith({ email: 'ekin@example.com' });
    expect(screen.getByText('ekin@example.com adresine bir kod gönderdik. Kodu ve yeni şifreni yaz.')).toBeTruthy();
    expect(screen.getByLabelText('Yeni şifre')).toBeTruthy();
    expect(screen.getByLabelText('Şifreyi doğrula')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Kodu tekrar gönder (1:00)' })).toBeDisabled();
  });

  it('changes the password and signs in with it', async () => {
    mocked.auth.resetPassword.mockResolvedValue({
      token: 'token-r',
      user: buildMe({ id: 'r1', username: 'ekin', email: 'ekin@example.com', isGuest: false }),
    });
    await toCode();

    await fireEvent.changeText(screen.getByLabelText('Kod'), '123456');
    await fireEvent.changeText(screen.getByLabelText('Yeni şifre'), 'yeni-bir-sifre');
    await fireEvent.changeText(screen.getByLabelText('Şifreyi doğrula'), 'yeni-bir-sifre');
    await fireEvent.press(screen.getByRole('button', { name: 'Şifreyi değiştir' }));

    expect(mocked.auth.resetPassword).toHaveBeenCalledWith({ email: 'ekin@example.com', code: '123456', password: 'yeni-bir-sifre' });
    await waitFor(() => expect(useSession.getState().token).toBe('token-r'));
    expect(useOnboarding.getState()).toMatchObject({ userId: 'r1', steps: ['consent', 'notifications'] });
  });

  it('checks the code, the length and the second password before the API, then says what it refused', async () => {
    mocked.auth.resetPassword.mockRejectedValue(new ApiError(422, 'code_invalid', 'x'));
    await toCode();

    await fireEvent.press(screen.getByRole('button', { name: 'Şifreyi değiştir' }));
    expect(screen.getByText('Kodun 6 hanesini yaz.')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Kod'), '123456');
    await fireEvent.changeText(screen.getByLabelText('Yeni şifre'), 'kisa');
    await fireEvent.press(screen.getByRole('button', { name: 'Şifreyi değiştir' }));
    expect(screen.getAllByText('En az 8 karakter.').length).toBeGreaterThan(1);

    await fireEvent.changeText(screen.getByLabelText('Yeni şifre'), 'yeni-bir-sifre');
    await fireEvent.changeText(screen.getByLabelText('Şifreyi doğrula'), 'baska-bir-sifre');
    await fireEvent.press(screen.getByRole('button', { name: 'Şifreyi değiştir' }));
    expect(screen.getByText('Şifreler aynı değil.')).toBeTruthy();
    expect(mocked.auth.resetPassword).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Şifreyi doğrula'), 'yeni-bir-sifre');
    await fireEvent.press(screen.getByRole('button', { name: 'Şifreyi değiştir' }));
    expect(await screen.findByText('Kod hatalı. Tekrar dene.')).toBeTruthy();
  });

  it('goes back to the email from the code, and out from the email', async () => {
    await toCode();

    await fireEvent.press(screen.getByRole('button', { name: 'Geri' }));
    expect(screen.getByLabelText('E-posta')).toBeTruthy();
    expect(goBack).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Geri' }));
    expect(goBack).toHaveBeenCalled();
  });

  it('speaks English', async () => {
    useLanguage.setState({ locale: 'en' });
    await renderWithProviders(<ForgotPasswordScreen {...props()} />);

    expect(screen.getByText('Forgot password')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Send code' }));
    expect(screen.getByText('Enter a valid email.')).toBeTruthy();
    expect(mocked.auth.forgotPassword).not.toHaveBeenCalled();
  });
});
