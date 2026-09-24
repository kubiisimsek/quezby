import { fireEvent, screen } from '@testing-library/react-native';

import { api } from '@/api/client';
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
});
