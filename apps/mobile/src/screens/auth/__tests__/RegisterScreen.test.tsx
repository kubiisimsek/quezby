import { ApiError } from '@quezby/sdk';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { useLanguage } from '@/i18n/language';
import { RegisterScreen } from '@/screens/auth/RegisterScreen';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/api/client', () => ({
  api: { auth: { register: jest.fn() } },
}));

const register = api.auth.register as jest.Mock;

type Props = Parameters<typeof RegisterScreen>[0];
const navigate = jest.fn();
const popTo = jest.fn();
const props = (email?: string) =>
  ({
    navigation: { navigate, popTo, goBack: jest.fn(), canGoBack: () => true },
    route: { key: 'Register', name: 'Register', params: email ? { email } : undefined },
  }) as unknown as Props;

async function fill(email: string, password: string, confirm = password) {
  await fireEvent.changeText(screen.getByLabelText('E-posta'), email);
  await fireEvent.changeText(screen.getByLabelText('Şifre'), password);
  await fireEvent.changeText(screen.getByLabelText('Şifreyi doğrula'), confirm);
}

describe('RegisterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSession.setState({ token: null, user: null, ranks: null, hydrated: true });
  });

  it('asks for the email and the password twice', async () => {
    await renderWithProviders(<RegisterScreen {...props('ekin@example.com')} />);

    expect(screen.getAllByText('Kayıt ol')).toHaveLength(2);
    expect(screen.getByLabelText('E-posta').props.value).toBe('ekin@example.com');
    expect(screen.getByLabelText('Şifre')).toBeTruthy();
    expect(screen.getByLabelText('Şifreyi doğrula')).toBeTruthy();
    expect(screen.getByText('En az 8 karakter.')).toBeTruthy();
  });

  it('sends the code and goes to it; no account is opened yet', async () => {
    register.mockResolvedValue({ email: 'ekin@example.com', resendIn: 60, expiresAt: '2026-09-29T10:15:00.000Z' });
    await renderWithProviders(<RegisterScreen {...props()} />);

    await fill(' ekin@example.com ', 'uzun-bir-sifre');
    await fireEvent.press(screen.getByRole('button', { name: 'Kayıt ol' }));

    expect(register).toHaveBeenCalledWith({
      email: 'ekin@example.com',
      password: 'uzun-bir-sifre',
      platform: 'ios',
      installId: expect.stringMatching(/^[0-9a-f]{32}$/),
    });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('VerifyEmail', { email: 'ekin@example.com', resendIn: 60 }));
    expect(useSession.getState().token).toBeNull();
  });

  it('refuses passwords that are not the same, and a short one, before the API', async () => {
    await renderWithProviders(<RegisterScreen {...props()} />);

    await fill('ekin@example.com', 'uzun-bir-sifre', 'uzun-bir-sifrE');
    await fireEvent.press(screen.getByRole('button', { name: 'Kayıt ol' }));
    expect(screen.getByText('Şifreler aynı değil.')).toBeTruthy();

    await fill('ekin@example.com', 'kisa');
    await fireEvent.press(screen.getByRole('button', { name: 'Kayıt ol' }));
    expect(screen.getByText('Geçerli bir e-posta ve en az 8 karakterlik bir şifre yaz.')).toBeTruthy();
    expect(register).not.toHaveBeenCalled();
  });

  it('says the email already has an account, and leads back to signing in with it', async () => {
    register.mockRejectedValue(new ApiError(409, 'email_taken', 'x'));
    await renderWithProviders(<RegisterScreen {...props()} />);

    await fill('ekin@example.com', 'uzun-bir-sifre');
    await fireEvent.press(screen.getByRole('button', { name: 'Kayıt ol' }));

    expect(await screen.findByText('Bu e-postayla bir hesabın var.')).toBeTruthy();
    expect(screen.queryByText('Bu e-posta başka bir hesaba bağlı.')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Giriş yap' }));
    expect(popTo).toHaveBeenCalledWith('SignIn', { email: 'ekin@example.com' });
  });

  it('goes back to signing in from its last line', async () => {
    await renderWithProviders(<RegisterScreen {...props()} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Hesabın var mı? Giriş yap' }));

    expect(popTo).toHaveBeenCalledWith('SignIn', undefined);
  });

  it('speaks English and Arabic', async () => {
    useLanguage.setState({ locale: 'en' });
    register.mockRejectedValue(new ApiError(409, 'email_taken', 'x'));
    const { unmount } = await renderWithProviders(<RegisterScreen {...props()} />);

    await fireEvent.changeText(screen.getByLabelText('Email'), 'ekin@example.com');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'uzun-bir-sifre');
    await fireEvent.changeText(screen.getByLabelText('Confirm password'), 'uzun-bir-sifre');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign up' }));
    expect(await screen.findByText('You already have an account with this email.')).toBeTruthy();
    await unmount();

    useLanguage.setState({ locale: 'ar' });
    await renderWithProviders(<RegisterScreen {...props()} />);
    expect(screen.getByLabelText('تأكيد كلمة المرور')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'لديك حساب؟ سجّل الدخول' })).toBeTruthy();
  });
});
