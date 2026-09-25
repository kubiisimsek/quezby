import { ApiError } from '@quezby/sdk';
import { fireEvent, screen } from '@testing-library/react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { WelcomeScreen } from '@/screens/welcome/WelcomeScreen';
import { useOnboarding } from '@/stores/onboarding';
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
