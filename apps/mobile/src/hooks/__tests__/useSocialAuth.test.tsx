import { appleAuth } from '@invertase/react-native-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { ApiError } from '@quezby/sdk';
import { act, renderHook } from '@testing-library/react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { useSocialAuth } from '@/hooks/useSocialAuth';
import { iso } from '@/i18n';
import { useLanguage } from '@/i18n/language';
import { useOnboarding } from '@/stores/onboarding';
import { buildMe } from '@/test/factories';

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
    me: { linkApple: jest.fn(), linkGoogle: jest.fn(), unlink: jest.fn() },
  },
}));

const mocked = api as unknown as {
  auth: { nonce: jest.Mock; apple: jest.Mock; google: jest.Mock };
  me: { linkApple: jest.Mock; linkGoogle: jest.Mock; unlink: jest.Mock };
};
const apple = appleAuth.performRequest as jest.Mock;
const google = GoogleSignin.signIn as jest.Mock;

async function hook() {
  return renderHook(() => useSocialAuth());
}

describe('useSocialAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSession.setState({ token: null, user: null, ranks: null, hydrated: true });
    useOnboarding.setState({ userId: null, step: null, remindedFor: null, hydrated: true });
    mocked.auth.nonce.mockResolvedValue({ nonce: 'raw-nonce', expiresAt: '2026-09-26T10:10:00.000Z' });
  });

  it('offers Apple on iOS and Google when this build has its client ids', async () => {
    const { result } = await hook();

    expect(result.current.available).toEqual({ apple: true, google: true });
  });

  it('signs a new player up with Apple, carrying the nonce the API issued, and starts their first steps', async () => {
    apple.mockResolvedValue({ identityToken: 'apple.jwt', authorizationCode: 'code-1', nonce: 'raw-nonce' });
    mocked.auth.apple.mockResolvedValue({ token: 'tok', user: buildMe({ id: 'new-1', identities: ['apple'], isGuest: false }), created: true });
    const { result } = await hook();

    await act(async () => {
      await result.current.signIn('apple');
    });

    expect(apple).toHaveBeenCalledWith(expect.objectContaining({ nonce: 'raw-nonce' }));
    expect(mocked.auth.apple).toHaveBeenCalledWith(
      expect.objectContaining({ identityToken: 'apple.jwt', nonce: 'raw-nonce', authorizationCode: 'code-1', platform: 'ios' }),
    );
    expect(useSession.getState().token).toBe('tok');
    expect(useOnboarding.getState()).toMatchObject({ userId: 'new-1', step: 'tutorial' });
    expect(result.current.error).toBeNull();
  });

  it('signs a returning player in with Google, letting them pick the account — no first steps', async () => {
    google.mockResolvedValue({ type: 'success', data: { idToken: 'google.jwt' } });
    mocked.auth.google.mockResolvedValue({ token: 'tok', user: buildMe(), created: false });
    const { result } = await hook();

    await act(async () => {
      await result.current.signIn('google');
    });

    expect(GoogleSignin.configure).toHaveBeenCalledWith(
      expect.objectContaining({ webClientId: 'web-local.apps.googleusercontent.com' }),
    );
    expect(GoogleSignin.signOut).toHaveBeenCalled();
    expect(mocked.auth.google).toHaveBeenCalledWith(expect.objectContaining({ idToken: 'google.jwt' }));
    expect(useSession.getState().token).toBe('tok');
    expect(useOnboarding.getState().step).toBeNull();
  });

  it('says nothing when the player closes the sheet', async () => {
    apple.mockRejectedValue(Object.assign(new Error('closed'), { code: '1001' }));
    google.mockResolvedValue({ type: 'cancelled', data: null });
    const { result } = await hook();

    await act(async () => {
      await result.current.signIn('apple');
      await result.current.signIn('google');
    });

    expect(result.current.error).toBeNull();
    expect(mocked.auth.apple).not.toHaveBeenCalled();
    expect(mocked.auth.google).not.toHaveBeenCalled();
  });

  it('explains what the API refused, and what the provider could not do', async () => {
    google.mockResolvedValue({ type: 'success', data: { idToken: 'google.jwt' } });
    mocked.me.linkGoogle.mockRejectedValue(new ApiError(409, 'identity_taken', 'x'));
    apple.mockRejectedValue(Object.assign(new Error('boom'), { code: '1004' }));
    const { result } = await hook();

    await act(async () => {
      await result.current.link('google');
    });
    expect(result.current.error).toBe('Bu hesap başka bir Quezby oyuncusuna bağlı.');
    expect(result.current.errorCode).toBe('identity_taken');

    await act(async () => {
      await result.current.link('apple');
    });
    expect(result.current.error).toBe('Apple ile giriş şu an yapılamadı. Biraz sonra tekrar dene.');
    expect(result.current.errorCode).toBeNull();
  });

  it('links and unlinks on the current account', async () => {
    useSession.setState({ token: 'tok', user: buildMe(), ranks: null, hydrated: true });
    apple.mockResolvedValue({ identityToken: 'apple.jwt', authorizationCode: null, nonce: 'raw-nonce' });
    mocked.me.linkApple.mockResolvedValue({ user: buildMe({ identities: ['apple'], isGuest: false }) });
    mocked.me.unlink.mockResolvedValue({ user: buildMe() });
    const { result } = await hook();

    await act(async () => {
      await result.current.link('apple');
    });
    expect(mocked.me.linkApple).toHaveBeenCalledWith({ identityToken: 'apple.jwt', nonce: 'raw-nonce', authorizationCode: null });
    expect(useSession.getState().user?.identities).toEqual(['apple']);

    await act(async () => {
      await result.current.unlink('apple');
    });
    expect(mocked.me.unlink).toHaveBeenCalledWith('apple');
    expect(useSession.getState().user?.identities).toEqual([]);
  });

  it('says what went wrong in the language the game speaks now', async () => {
    useLanguage.setState({ locale: 'en' });
    google.mockResolvedValue({ type: 'success', data: { idToken: 'google.jwt' } });
    mocked.me.linkGoogle.mockRejectedValue(new ApiError(409, 'identity_taken', 'x'));
    apple.mockRejectedValue(Object.assign(new Error('boom'), { code: '1004' }));
    const { result } = await hook();

    await act(async () => {
      await result.current.link('google');
    });
    expect(result.current.error).toBe('This account belongs to another Quezby player.');
    expect(result.current.errorCode).toBe('identity_taken');

    await act(async () => {
      await result.current.link('apple');
    });
    expect(result.current.error).toBe("Couldn't sign in with Apple right now. Try again in a bit.");

    await act(async () => {
      useLanguage.setState({ locale: 'ar' });
    });
    expect(result.current.error).toBe(
      `تعذّر تسجيل الدخول باستخدام ${iso('Apple')} الآن. حاول مرة أخرى بعد قليل.`,
    );
    expect(result.current.errorCode).toBeNull();
  });

  it('brings a returning Apple player’s language to this phone, and leaves a new one in the phone’s', async () => {
    useLanguage.setState({ phase: 'ready', locale: 'tr', account: null });
    apple.mockResolvedValue({ identityToken: 'apple.jwt', authorizationCode: 'code-1', nonce: 'raw-nonce' });
    mocked.auth.apple.mockResolvedValue({
      token: 'tok-2',
      user: buildMe({ id: 'back-1', locale: 'fr', identities: ['apple'], isGuest: false }),
      created: false,
    });
    const { result } = await hook();

    await act(async () => {
      await result.current.signIn('apple');
    });

    expect(useLanguage.getState()).toMatchObject({ locale: 'fr', account: 'back-1' });
    expect(useSession.getState().token).toBe('tok-2');

    mocked.auth.apple.mockResolvedValue({
      token: 'tok-3',
      user: buildMe({ id: 'new-2', locale: 'fr', identities: ['apple'], isGuest: false }),
      created: true,
    });
    await act(async () => {
      await result.current.signIn('apple');
    });
    expect(useLanguage.getState()).toMatchObject({ locale: 'fr', account: 'new-2' });
  });
});
