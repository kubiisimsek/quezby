import { appleAuth } from '@invertase/react-native-apple-authentication';
import { ApiError } from '@quezby/sdk';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { useLanguage } from '@/i18n/language';
import { SignInScreen } from '@/screens/onboarding/SignInScreen';
import { useOnboarding } from '@/stores/onboarding';
import { useSettings } from '@/stores/settings';
import { buildMe } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/config/env', () => ({
  ...jest.requireActual('@/config/env'),
  GOOGLE_CLIENTS: {
    webClientId: 'web-local.apps.googleusercontent.com',
    iosClientId: 'ios-local.apps.googleusercontent.com',
  },
}));

jest.mock('@/api/client', () => ({
  api: { auth: { login: jest.fn(), guest: jest.fn(), nonce: jest.fn(), apple: jest.fn(), google: jest.fn() } },
}));

const mocked = api as unknown as {
  auth: { login: jest.Mock; guest: jest.Mock; nonce: jest.Mock; apple: jest.Mock; google: jest.Mock };
};

type Props = Parameters<typeof SignInScreen>[0];
const navigate = jest.fn();
const props = (email?: string) =>
  ({
    navigation: { navigate },
    route: { key: 'SignIn', name: 'SignIn', params: email ? { email } : undefined },
  }) as unknown as Props;

async function fill(email: string, password: string) {
  await fireEvent.changeText(screen.getByLabelText('E-posta'), email);
  await fireEvent.changeText(screen.getByLabelText('Şifre'), password);
}

describe('SignInScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSession.setState({ token: null, user: null, ranks: null, hydrated: true });
    useOnboarding.setState({ practiced: true, playing: false, userId: null, steps: [], remindedFor: null, hydrated: true });
    useSettings.setState({ hydrated: true, consent: 'unasked', analytics: false });
  });

  it('signs in first, then offers a new account, then Apple, Google and a guest', async () => {
    await renderWithProviders(<SignInScreen {...props()} />);

    const order = [
      screen.getByLabelText('E-posta'),
      screen.getByLabelText('Şifre'),
      screen.getByRole('button', { name: 'Şifremi unuttum' }),
      screen.getByRole('button', { name: 'Giriş yap' }),
      screen.getByRole('button', { name: 'Hesabın yok mu? Kayıt ol' }),
      screen.getByText('ya da'),
      screen.getByRole('button', { name: 'Apple ile devam et' }),
      screen.getByRole('button', { name: 'Google ile devam et' }),
      screen.getByRole('button', { name: 'Misafir olarak devam et' }),
    ];
    expect(order.every(Boolean)).toBe(true);
    expect(screen.queryByText('Misafir hesap yalnızca bu telefonda kalır.')).toBeNull();
  });

  it('asks for both fields before calling the API', async () => {
    await renderWithProviders(<SignInScreen {...props()} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Giriş yap' }));

    expect(screen.getByText('E-postanı ve şifreni yaz.')).toBeTruthy();
    expect(mocked.auth.login).not.toHaveBeenCalled();
  });

  it('signs back in with the email: a name picked long ago is never asked again', async () => {
    mocked.auth.login.mockResolvedValue({
      token: 'token-l',
      user: buildMe({ id: 'l1', username: 'ekin', email: 'ekin@example.com', isGuest: false }),
    });
    await renderWithProviders(<SignInScreen {...props()} />);

    await fill(' ekin@example.com ', 'uzun-bir-sifre');
    await fireEvent.press(screen.getByRole('button', { name: 'Giriş yap' }));

    expect(mocked.auth.login).toHaveBeenCalledWith({ email: 'ekin@example.com', password: 'uzun-bir-sifre' });
    await waitFor(() => expect(useSession.getState().token).toBe('token-l'));
    expect(useOnboarding.getState()).toMatchObject({ userId: 'l1', steps: ['consent', 'notifications'] });
  });

  it('says what the API refused', async () => {
    mocked.auth.login.mockRejectedValue(new ApiError(422, 'invalid_credentials', 'x'));
    await renderWithProviders(<SignInScreen {...props()} />);

    await fill('ekin@example.com', 'yanlis-sifre');
    await fireEvent.press(screen.getByRole('button', { name: 'Giriş yap' }));

    expect(await screen.findByText('E-posta ya da şifre hatalı.')).toBeTruthy();
    expect(useSession.getState().token).toBeNull();
  });

  it('takes a sign-up never verified to its code — the API has sent a new one', async () => {
    mocked.auth.login.mockRejectedValue(new ApiError(409, 'email_unverified', 'x'));
    await renderWithProviders(<SignInScreen {...props()} />);

    await fill('ekin@example.com', 'uzun-bir-sifre');
    await fireEvent.press(screen.getByRole('button', { name: 'Giriş yap' }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('VerifyEmail', { email: 'ekin@example.com' }));
    expect(screen.queryByText(/doğrulamadın/)).toBeNull();
  });

  it('opens the sign-up and the forgotten password with the email typed so far', async () => {
    await renderWithProviders(<SignInScreen {...props()} />);
    await fireEvent.changeText(screen.getByLabelText('E-posta'), 'ekin@example.com');

    await fireEvent.press(screen.getByRole('button', { name: 'Hesabın yok mu? Kayıt ol' }));
    expect(navigate).toHaveBeenLastCalledWith('Register', { email: 'ekin@example.com' });

    await fireEvent.press(screen.getByRole('button', { name: 'Şifremi unuttum' }));
    expect(navigate).toHaveBeenLastCalledWith('ForgotPassword', { email: 'ekin@example.com' });
  });

  it('fills in the email the sign-up came back with', async () => {
    await renderWithProviders(<SignInScreen {...props('ekin@example.com')} />);

    expect(screen.getByLabelText('E-posta').props.value).toBe('ekin@example.com');
  });

  it('opens a guest account that keeps its automatic name: usage and notifications come next', async () => {
    const user = buildMe({ id: 'g1', username: 'guest48128742' });
    mocked.auth.guest.mockResolvedValue({ token: 'token-g', user });
    await renderWithProviders(<SignInScreen {...props()} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Misafir olarak devam et' }));

    expect(mocked.auth.guest).toHaveBeenCalledWith({ platform: 'ios', installId: expect.stringMatching(/^[0-9a-f]{32}$/) });
    expect(useOnboarding.getState()).toMatchObject({ userId: 'g1', steps: ['consent', 'notifications'] });
    expect(useSession.getState()).toMatchObject({ token: 'token-g', user });
  });

  it('asks a player who signed in with Apple for a name while the account still has the automatic one', async () => {
    mocked.auth.nonce.mockResolvedValue({ nonce: 'raw-nonce', expiresAt: '2026-09-29T10:10:00.000Z' });
    jest.mocked(appleAuth.performRequest).mockResolvedValue({
      identityToken: 'apple.jwt',
      authorizationCode: 'code-1',
      nonce: 'raw-nonce',
    } as Awaited<ReturnType<typeof appleAuth.performRequest>>);
    mocked.auth.apple.mockResolvedValue({
      token: 'token-a',
      user: buildMe({ id: 'a1', username: 'guest12345678', isGuest: false, identities: ['apple'] }),
      created: true,
    });
    await renderWithProviders(<SignInScreen {...props()} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Apple ile devam et' }));

    expect(useSession.getState().token).toBe('token-a');
    expect(useOnboarding.getState()).toMatchObject({ userId: 'a1', steps: ['username', 'consent', 'notifications'] });
  });

  it('says why a guest account could not be opened, in the language of the moment', async () => {
    mocked.auth.guest.mockRejectedValue(new ApiError(0, 'network', 'offline'));
    await renderWithProviders(<SignInScreen {...props()} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Misafir olarak devam et' }));

    expect(await screen.findByText(/İnternet bağlantını kontrol et/)).toBeTruthy();
    expect(useSession.getState().token).toBeNull();
    await act(async () => {
      useLanguage.setState({ locale: 'en' });
    });
    expect(screen.getByText("Couldn't reach the server. Check your internet connection.")).toBeTruthy();
  });

  it('speaks English and Arabic', async () => {
    useLanguage.setState({ locale: 'en' });
    const { unmount } = await renderWithProviders(<SignInScreen {...props()} />);

    expect(within(screen.getByRole('button', { name: 'Sign in' })).getByText('Sign in')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Forgot password?' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'No account yet? Sign up' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue as guest' })).toBeTruthy();
    await unmount();

    useLanguage.setState({ locale: 'ar' });
    await renderWithProviders(<SignInScreen {...props()} />);
    expect(screen.getByRole('button', { name: 'نسيت كلمة المرور؟' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ليس لديك حساب؟ أنشئ حسابًا' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'المتابعة كضيف' })).toBeTruthy();
  });
});
