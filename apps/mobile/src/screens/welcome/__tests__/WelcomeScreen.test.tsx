import { ApiError } from '@quezby/sdk';
import { fireEvent, screen } from '@testing-library/react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { WelcomeScreen } from '@/screens/welcome/WelcomeScreen';
import { useOnboarding } from '@/stores/onboarding';
import { useSettings } from '@/stores/settings';
import { buildMe } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/api/client', () => ({
  api: { auth: { guest: jest.fn() } },
}));

type Props = Parameters<typeof WelcomeScreen>[0];
const props = { navigation: { navigate: jest.fn() }, route: { key: 'Welcome', name: 'Welcome' } } as unknown as Props;

describe('WelcomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSession.setState({ token: null, user: null, ranks: null, hydrated: true });
    useOnboarding.setState({ userId: null, step: null, remindedFor: null, hydrated: true });
    useSettings.setState({ hydrated: true, consent: 'synced', analytics: false });
  });

  it('asks first whether the game may count how it is used, and counts nothing before', async () => {
    useSettings.setState({ consent: 'unasked' });
    await renderWithProviders(<WelcomeScreen {...props} />);

    expect(screen.getByText('SENİN SEÇİMİN')).toBeTruthy();
    expect(screen.getByText('Oyunu birlikte geliştirelim mi?')).toBeTruthy();
    expect(screen.queryByText('Oyna')).toBeNull();
    expect(screen.queryByText('Hesabım var, giriş yap')).toBeNull();
    expect(useSettings.getState().analytics).toBe(false);
  });

  it.each([
    ['İzin ver', true],
    ['İzin verme', false],
  ])('takes "%s" for an answer, then lets the player in', async (label, yes) => {
    useSettings.setState({ consent: 'unasked' });
    await renderWithProviders(<WelcomeScreen {...props} />);

    await fireEvent.press(screen.getByRole('button', { name: label }));

    expect(useSettings.getState()).toMatchObject({ analytics: yes, consent: 'pending' });
    expect(screen.getByText('Oyna')).toBeTruthy();
    expect(screen.getByText('Hesabım var, giriş yap')).toBeTruthy();
  });

  it('waits for the phone\'s answer to be read before asking', async () => {
    useSettings.setState({ hydrated: false, consent: 'unasked' });
    await renderWithProviders(<WelcomeScreen {...props} />);

    expect(screen.queryByText('Oyna')).toBeNull();
  });

  it('has one way in to play, and one back in for a player with an account', async () => {
    await renderWithProviders(<WelcomeScreen {...props} />);

    expect(screen.getByText('Quezby')).toBeTruthy();
    expect(screen.getByText('Oyna')).toBeTruthy();
    expect(screen.getByText('Hesabım var, giriş yap')).toBeTruthy();
    expect(screen.queryByText('Apple ile devam et')).toBeNull();
    expect(screen.queryByText('Misafir olarak başla')).toBeNull();
  });

  it('opens a guest account and starts its practice run', async () => {
    const user = buildMe({ id: 'u1', username: 'guest48128742' });
    jest.mocked(api.auth.guest).mockResolvedValue({ token: 'token', user });
    await renderWithProviders(<WelcomeScreen {...props} />);

    await fireEvent.press(screen.getByText('Oyna'));

    expect(api.auth.guest).toHaveBeenCalledWith(expect.objectContaining({ platform: 'ios' }));
    expect(useOnboarding.getState()).toMatchObject({ userId: 'u1', step: 'tutorial' });
    expect(useSession.getState()).toMatchObject({ token: 'token', user });
  });

  it('says why an account could not be opened, and starts nothing', async () => {
    jest.mocked(api.auth.guest).mockRejectedValue(new ApiError(0, 'network', 'offline'));
    await renderWithProviders(<WelcomeScreen {...props} />);

    await fireEvent.press(screen.getByText('Oyna'));

    expect(await screen.findByText(/İnternet bağlantını kontrol et/)).toBeTruthy();
    expect(useOnboarding.getState().step).toBeNull();
    expect(useSession.getState().token).toBeNull();
  });

  it('takes a player with an account to sign in', async () => {
    await renderWithProviders(<WelcomeScreen {...props} />);

    await fireEvent.press(screen.getByText('Hesabım var, giriş yap'));

    expect(props.navigation.navigate).toHaveBeenCalledWith('Login');
  });
});
