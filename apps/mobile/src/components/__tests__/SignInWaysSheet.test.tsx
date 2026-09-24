import { appleAuth } from '@invertase/react-native-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { ApiError } from '@quezby/sdk';
import { fireEvent, screen } from '@testing-library/react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { SignInWaysSheet, signInWays } from '@/components/SignInWaysSheet';
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
  api: {
    auth: { nonce: jest.fn() },
    me: { linkApple: jest.fn(), linkGoogle: jest.fn(), unlink: jest.fn() },
  },
}));

const mocked = api as unknown as {
  auth: { nonce: jest.Mock };
  me: { linkApple: jest.Mock; linkGoogle: jest.Mock; unlink: jest.Mock };
};
const apple = appleAuth.performRequest as jest.Mock;
const google = GoogleSignin.signIn as jest.Mock;

async function renderSheet(onEmail = jest.fn()) {
  await renderWithProviders(<SignInWaysSheet open onClose={jest.fn()} onEmail={onEmail} />);
  return onEmail;
}

describe('signInWays', () => {
  it('names every way in, Apple before Google before the email', () => {
    expect(signInWays({ identities: ['google', 'apple'], email: 'ekin@example.com' })).toEqual([
      'Apple',
      'Google',
      'e-posta',
    ]);
    expect(signInWays({ identities: [], email: null })).toEqual([]);
  });
});

describe('SignInWaysSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSession.setState({ token: 'tok', user: buildMe(), ranks: null, hydrated: true });
    mocked.auth.nonce.mockResolvedValue({ nonce: 'raw-nonce', expiresAt: '2026-09-26T10:10:00.000Z' });
  });

  it('offers a guest every way to keep the account', async () => {
    await renderSheet();

    expect(screen.getByText('Hesabını koru')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Apple ile devam et' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Google ile devam et' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'E-postayla koru' })).toBeOnTheScreen();
    expect(screen.queryByText('Bağı kaldır')).not.toBeOnTheScreen();
    expect(screen.queryByText('Bağlı yollar')).not.toBeOnTheScreen();
    expect(screen.queryByText('Başka bir yol bağla')).not.toBeOnTheScreen();
  });

  it('links Apple to the guest and says so', async () => {
    apple.mockResolvedValue({ identityToken: 'apple.jwt', authorizationCode: 'code-1', nonce: 'raw-nonce' });
    mocked.me.linkApple.mockResolvedValue({ user: buildMe({ identities: ['apple'], isGuest: false }) });
    await renderSheet();

    await fireEvent.press(screen.getByRole('button', { name: 'Apple ile devam et' }));

    expect(mocked.me.linkApple).toHaveBeenCalledWith({
      identityToken: 'apple.jwt',
      nonce: 'raw-nonce',
      authorizationCode: 'code-1',
    });
    expect(await screen.findByText('Apple bağlandı')).toBeOnTheScreen();
    expect(screen.getByText('Giriş yolları')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Bağı kaldır' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Apple ile devam et' })).not.toBeOnTheScreen();
    expect(useSession.getState().user?.isGuest).toBe(false);
  });

  it('says nothing when the player closes Google’s picker', async () => {
    google.mockResolvedValue({ type: 'cancelled', data: null });
    await renderSheet();

    await fireEvent.press(screen.getByRole('button', { name: 'Google ile devam et' }));

    expect(mocked.me.linkGoogle).not.toHaveBeenCalled();
    expect(screen.queryByText('Google bağlandı')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Google ile devam et' })).toBeOnTheScreen();
  });

  it('explains an account that belongs to another player', async () => {
    google.mockResolvedValue({ type: 'success', data: { idToken: 'google.jwt' } });
    mocked.me.linkGoogle.mockRejectedValue(new ApiError(409, 'identity_taken', 'Taken.'));
    await renderSheet();

    await fireEvent.press(screen.getByRole('button', { name: 'Google ile devam et' }));

    expect(await screen.findByText('Bu hesap başka bir Quezby oyuncusuna bağlı.')).toBeOnTheScreen();
    expect(screen.queryByText('Google bağlandı')).not.toBeOnTheScreen();
  });

  it('lists the ways a kept account has, and only offers the rest', async () => {
    useSession.setState({
      user: buildMe({ isGuest: false, identities: ['apple'], email: 'ekin@example.com' }),
    });
    await renderSheet();

    expect(screen.getByText('Giriş yolları')).toBeOnTheScreen();
    expect(screen.getByText('Bağlı yollar')).toBeOnTheScreen();
    expect(screen.getByText('Apple')).toBeOnTheScreen();
    expect(screen.getByText('Bağlı')).toBeOnTheScreen();
    expect(screen.getByText('E-posta')).toBeOnTheScreen();
    expect(screen.getByText('ekin@example.com')).toBeOnTheScreen();
    expect(screen.getByText('Başka bir yol bağla')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Google ile devam et' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Apple ile devam et' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /E-posta/ })).not.toBeOnTheScreen();
  });

  it('takes a way off the account', async () => {
    useSession.setState({
      user: buildMe({ isGuest: false, identities: ['apple', 'google'] }),
    });
    mocked.me.unlink.mockResolvedValue({ user: buildMe({ isGuest: false, identities: ['google'] }) });
    await renderSheet();

    const [appleRow] = screen.getAllByRole('button', { name: 'Bağı kaldır' });
    expect(appleRow).toBeDefined();
    if (appleRow) await fireEvent.press(appleRow);

    expect(mocked.me.unlink).toHaveBeenCalledWith('apple');
    expect(await screen.findByRole('button', { name: 'Apple ile devam et' })).toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: 'Bağı kaldır' })).toHaveLength(1);
  });

  it('keeps the last way in, as the API insists', async () => {
    useSession.setState({ user: buildMe({ isGuest: false, identities: ['apple'] }) });
    mocked.me.unlink.mockRejectedValue(new ApiError(409, 'last_sign_in_method', 'Last one.'));
    await renderSheet();

    await fireEvent.press(screen.getByRole('button', { name: 'Bağı kaldır' }));

    expect(
      await screen.findByText('Bu, hesabına girmenin tek yolu. Önce başka bir yol bağla.'),
    ).toBeOnTheScreen();
    expect(useSession.getState().user?.identities).toEqual(['apple']);
  });

  it('hands the email form to the profile', async () => {
    const onEmail = await renderSheet();

    await fireEvent.press(screen.getByRole('button', { name: 'E-postayla koru' }));

    expect(onEmail).toHaveBeenCalledTimes(1);
  });

  it('offers a kept account without an email a password too', async () => {
    useSession.setState({ user: buildMe({ isGuest: false, identities: ['google'] }) });
    const onEmail = await renderSheet();

    await fireEvent.press(screen.getByRole('button', { name: 'E-posta ve şifre bağla' }));

    expect(onEmail).toHaveBeenCalledTimes(1);
  });
});
