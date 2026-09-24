import { fireEvent, screen } from '@testing-library/react-native';

import { api } from '@/api/client';
import { REEL_GUIDE } from '@/game/howTo';
import { WelcomeScreen } from '@/screens/welcome/WelcomeScreen';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/config/env', () => ({
  ...jest.requireActual('@/config/env'),
  GOOGLE_CLIENTS: {
    webClientId: 'web-local.apps.googleusercontent.com',
    iosClientId: 'ios-local.apps.googleusercontent.com',
  },
}));

jest.mock('@/api/client', () => ({
  api: { auth: { guest: jest.fn(), nonce: jest.fn(), apple: jest.fn(), google: jest.fn() } },
}));

type Props = Parameters<typeof WelcomeScreen>[0];
const props = { navigation: { navigate: jest.fn() }, route: { key: 'Welcome', name: 'Welcome' } } as unknown as Props;

describe('WelcomeScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('offers Apple, Google and a guest start, with the four reels from the one guide', async () => {
    await renderWithProviders(<WelcomeScreen {...props} />);

    expect(screen.getByText('Apple ile devam et')).toBeTruthy();
    expect(screen.getByText('Google ile devam et')).toBeTruthy();
    expect(screen.getByText('Misafir olarak başla')).toBeTruthy();
    for (const guide of Object.values(REEL_GUIDE)) expect(screen.getByText(guide.title)).toBeTruthy();
  });

  it('starts a guest account', async () => {
    (api.auth.guest as jest.Mock).mockResolvedValue({ token: 't', user: { id: '1' } });
    await renderWithProviders(<WelcomeScreen {...props} />);

    await fireEvent.press(screen.getByText('Misafir olarak başla'));

    expect(api.auth.guest).toHaveBeenCalledWith(expect.objectContaining({ platform: 'ios' }));
  });

  it('goes to the email login', async () => {
    await renderWithProviders(<WelcomeScreen {...props} />);

    await fireEvent.press(screen.getByText('Hesabım var, giriş yap'));

    expect(props.navigation.navigate).toHaveBeenCalledWith('Login');
  });
});
