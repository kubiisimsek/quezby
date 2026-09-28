import { ApiError } from '@quezby/sdk';
import { act, fireEvent, screen } from '@testing-library/react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { useLanguage } from '@/i18n/language';
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

  it('asks and lets the player in, in English', async () => {
    useLanguage.setState({ locale: 'en' });
    useSettings.setState({ consent: 'unasked' });
    await renderWithProviders(<WelcomeScreen {...props} />);

    expect(screen.getByText('Your scrolling habit, now a competition.')).toBeTruthy();
    expect(screen.getByText('Four moves, one reflex. Learn them in a practice run first.')).toBeTruthy();
    expect(screen.getByText('Shall we improve the game together?')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: "Don't allow" }));

    expect(useSettings.getState().analytics).toBe(false);
    expect(screen.getByText('Quezby')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'I have an account, sign in' }));
    expect(props.navigation.navigate).toHaveBeenCalledWith('Login');
  });

  it('speaks Arabic, down to why an account could not be opened', async () => {
    useLanguage.setState({ locale: 'ar' });
    jest.mocked(api.auth.guest).mockRejectedValue(new ApiError(0, 'network', 'offline'));
    await renderWithProviders(<WelcomeScreen {...props} />);

    expect(screen.getByText('عادتك في التمرير أصبحت منافسة.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'لديّ حساب، سجّل الدخول' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'العب' }));

    expect(
      await screen.findByText('تعذّر الوصول إلى الخادم. تحقّق من اتصالك بالإنترنت.'),
    ).toBeTruthy();
  });

  it('says what went wrong in the language of the moment, not the one it failed in', async () => {
    jest.mocked(api.auth.guest).mockRejectedValue(new ApiError(0, 'network', 'offline'));
    await renderWithProviders(<WelcomeScreen {...props} />);
    await fireEvent.press(screen.getByText('Oyna'));
    expect(await screen.findByText(/İnternet bağlantını kontrol et/)).toBeTruthy();

    await act(async () => {
      useLanguage.setState({ locale: 'en' });
    });

    expect(
      screen.getByText("Couldn't reach the server. Check your internet connection."),
    ).toBeTruthy();
    expect(screen.queryByText(/İnternet bağlantını kontrol et/)).toBeNull();
  });

  it('names the language it speaks at the top, and opens the picker from there', async () => {
    await renderWithProviders(<WelcomeScreen {...props} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Türkçe' }));

    expect(await screen.findByText('Oyun seçtiğin dilde konuşur.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: 'English, İngilizce' }));
    expect(await screen.findByRole('button', { name: 'English' })).toBeOnTheScreen();
    expect(screen.getByText('Play')).toBeOnTheScreen();
  });
});
