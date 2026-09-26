import { ApiError } from '@quezby/sdk';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { I18nManager } from 'react-native';
import * as Keychain from 'react-native-keychain';
import RNRestart from 'react-native-restart';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { useLanguage } from '@/i18n/language';
import { buildMe } from '@/test/factories';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/config/env', () => ({
  ...jest.requireActual('@/config/env'),
  GOOGLE_CLIENTS: {
    webClientId: 'web-local.apps.googleusercontent.com',
    iosClientId: 'ios-local.apps.googleusercontent.com',
  },
}));

jest.mock('@/api/client', () => ({
  api: { auth: { login: jest.fn(), nonce: jest.fn(), apple: jest.fn(), google: jest.fn() } },
}));

describe('LoginScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('offers Apple and Google above the email form', async () => {
    await renderWithProviders(<LoginScreen />);

    expect(screen.getByText('Apple ile devam et')).toBeTruthy();
    expect(screen.getByText('Google ile devam et')).toBeTruthy();
    expect(screen.getByText('ya da e-postayla')).toBeTruthy();
  });

  it('asks for both fields before calling the API', async () => {
    await renderWithProviders(<LoginScreen />);

    await fireEvent.press(screen.getByText('Giriş yap'));

    expect(screen.getByText('E-postanı ve şifreni yaz.')).toBeTruthy();
    expect(api.auth.login).not.toHaveBeenCalled();
  });

  it('signs back in in English, and says what the API refused', async () => {
    useLanguage.setState({ locale: 'en' });
    jest.mocked(api.auth.login).mockRejectedValue(new ApiError(401, 'invalid_credentials', 'x'));
    await renderWithProviders(<LoginScreen />);

    expect(screen.getByText('Welcome back')).toBeTruthy();
    expect(screen.getByText(/^If you protected your account with Apple, Google or email/)).toBeTruthy();
    expect(screen.getByText('or with email')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Enter your email and password.')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Email'), 'ekin@example.com');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'uzun-bir-sifre');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(api.auth.login).toHaveBeenCalledWith({ email: 'ekin@example.com', password: 'uzun-bir-sifre' });
    expect(await screen.findByText('Wrong email or password.')).toBeTruthy();
  });

  it('speaks Arabic', async () => {
    useLanguage.setState({ locale: 'ar' });
    await renderWithProviders(<LoginScreen />);

    expect(screen.getByText('مرحبًا بعودتك')).toBeTruthy();
    expect(screen.getByText('أو بالبريد الإلكتروني')).toBeTruthy();
    expect(screen.getByLabelText('البريد الإلكتروني')).toBeTruthy();
    expect(screen.getByLabelText('كلمة المرور')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'تسجيل الدخول' }));

    expect(screen.getByText('اكتب بريدك الإلكتروني وكلمة المرور.')).toBeTruthy();
    expect(api.auth.login).not.toHaveBeenCalled();
  });

  it('opens an account in its own language, taken before the lobby draws', async () => {
    useLanguage.setState({ phase: 'ready', locale: 'tr', account: null });
    jest.mocked(api.auth.login).mockResolvedValue({ token: 'token-7', user: buildMe({ id: 'p7', locale: 'de' }) });
    const signIn = jest.spyOn(useSession.getState(), 'signIn');
    await renderWithProviders(<LoginScreen />);

    await fireEvent.changeText(screen.getByLabelText('E-posta'), 'ekin@example.com');
    await fireEvent.changeText(screen.getByLabelText('Şifre'), 'uzun-bir-sifre');
    await fireEvent.press(screen.getByRole('button', { name: 'Giriş yap' }));

    await waitFor(() => expect(useSession.getState().token).toBe('token-7'));
    expect(useLanguage.getState()).toMatchObject({ locale: 'de', account: 'p7' });
    expect(signIn).toHaveBeenCalledTimes(1);
    expect(RNRestart.restart).not.toHaveBeenCalled();
  });

  it('reloads for an account that plays in Arabic, only once its token is in the keychain', async () => {
    jest.spyOn(I18nManager, 'allowRTL').mockImplementation(() => undefined);
    jest.spyOn(I18nManager, 'forceRTL').mockImplementation(() => undefined);
    useLanguage.setState({ phase: 'ready', locale: 'tr', account: null });
    jest.mocked(api.auth.login).mockResolvedValue({ token: 'token-8', user: buildMe({ id: 'p8', locale: 'ar' }) });
    jest.mocked(RNRestart.restart).mockImplementation(() => {
      expect(Keychain.setGenericPassword).toHaveBeenCalledWith('player', 'token-8', expect.anything());
    });
    await renderWithProviders(<LoginScreen />);

    await fireEvent.changeText(screen.getByLabelText('E-posta'), 'ekin@example.com');
    await fireEvent.changeText(screen.getByLabelText('Şifre'), 'uzun-bir-sifre');
    await fireEvent.press(screen.getByRole('button', { name: 'Giriş yap' }));

    await waitFor(() => expect(RNRestart.restart).toHaveBeenCalledTimes(1));
    expect(I18nManager.forceRTL).toHaveBeenCalledWith(true);
  });
});
