import { appleAuth } from '@invertase/react-native-apple-authentication';
import { ApiError } from '@quezby/sdk';
import { fireEvent, screen } from '@testing-library/react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { ProtectScreen } from '@/screens/onboarding/ProtectScreen';
import { useOnboarding } from '@/stores/onboarding';
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
    auth: { nonce: jest.fn(), apple: jest.fn(), google: jest.fn() },
    me: { linkApple: jest.fn(), linkGoogle: jest.fn(), linkCredentials: jest.fn() },
  },
}));

const mocked = api as unknown as {
  auth: { nonce: jest.Mock; apple: jest.Mock };
  me: { linkApple: jest.Mock };
};
const apple = appleAuth.performRequest as jest.Mock;

describe('ProtectScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSession.setState({ token: 'token', user: buildMe({ id: 'u1', username: 'guest48128742' }), ranks: null, hydrated: true });
    useOnboarding.setState({ userId: 'u1', step: 'protect', remindedFor: null, hydrated: true });
    mocked.auth.nonce.mockResolvedValue({ nonce: 'raw-nonce', expiresAt: '2026-09-26T10:10:00.000Z' });
    apple.mockResolvedValue({ identityToken: 'apple.jwt', authorizationCode: null, nonce: 'raw-nonce' });
  });

  it('offers every way this build has to keep the account, and lets the player skip it', async () => {
    await renderWithProviders(<ProtectScreen />);

    expect(screen.getByText('Hesabını koru')).toBeTruthy();
    expect(screen.getByText('Apple ile devam et')).toBeTruthy();
    expect(screen.getByText('Google ile devam et')).toBeTruthy();
    expect(screen.getByText('E-postayla koru')).toBeTruthy();

    await fireEvent.press(screen.getByText('Şimdi değil'));

    expect(useOnboarding.getState().step).toBeNull();
  });

  it('keeps the account with Apple, says so, and only then moves on', async () => {
    mocked.me.linkApple.mockResolvedValue({ user: buildMe({ id: 'u1', isGuest: false, identities: ['apple'] }) });
    await renderWithProviders(<ProtectScreen />);

    await fireEvent.press(screen.getByText('Apple ile devam et'));

    expect(mocked.me.linkApple).toHaveBeenCalled();
    expect(screen.getByText('Apple bağlandı')).toBeTruthy();
    expect(useOnboarding.getState().step).toBe('protect');

    await fireEvent.press(screen.getByText('Devam et'));
    expect(useOnboarding.getState().step).toBeNull();
  });

  it('opens the email form', async () => {
    await renderWithProviders(<ProtectScreen />);

    await fireEvent.press(screen.getByText('E-postayla koru'));

    expect(screen.getByText('Hesabı koru')).toBeTruthy();
  });

  it('switches to the player an Apple account already belongs to', async () => {
    mocked.me.linkApple.mockRejectedValue(new ApiError(409, 'identity_taken', 'x'));
    mocked.auth.apple.mockResolvedValue({
      token: 'their-token',
      user: buildMe({ id: 'u0', username: 'ekin', isGuest: false, identities: ['apple'] }),
      created: false,
    });
    await renderWithProviders(<ProtectScreen />);

    await fireEvent.press(screen.getByText('Apple ile devam et'));
    expect(screen.getByText(/Bu hesap başka bir Quezby oyuncusuna bağlı\. O hesapla oynamak istersen/)).toBeTruthy();

    await fireEvent.press(screen.getByText('Apple hesabıma geç'));

    expect(useSession.getState()).toMatchObject({ token: 'their-token', user: { id: 'u0' } });
    expect(useOnboarding.getState().step).toBeNull();
  });
});
