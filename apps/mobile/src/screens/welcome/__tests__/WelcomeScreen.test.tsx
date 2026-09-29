import { fireEvent, screen } from '@testing-library/react-native';

import { useSession } from '@/auth/session';
import { useLanguage } from '@/i18n/language';
import { WelcomeScreen } from '@/screens/welcome/WelcomeScreen';
import { useOnboarding } from '@/stores/onboarding';
import { useSettings } from '@/stores/settings';
import { renderWithProviders } from '@/test/renderWithProviders';

describe('WelcomeScreen', () => {
  beforeEach(() => {
    useSession.setState({ token: null, user: null, ranks: null, hydrated: true });
    useOnboarding.setState({
      practiced: false,
      playing: false,
      userId: null,
      steps: [],
      remindedFor: null,
      hydrated: true,
    });
  });

  it('shows the game and one way on: the practice run', async () => {
    await renderWithProviders(<WelcomeScreen />);

    expect(screen.getByText('Quezby')).toBeTruthy();
    expect(screen.getByText('Kaydırma alışkanlığın, rekabete dönüştü.')).toBeTruthy();
    expect(screen.getByText('Dört hareket, tek refleks. Önce bir deneme turunda oynayarak öğren.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Oyna' })).toBeTruthy();
    expect(screen.queryByText('Apple ile devam et')).toBeNull();
    expect(screen.queryByText('Misafir olarak devam et')).toBeNull();
  });

  it('asks nothing before the practice run: no account, no usage question', async () => {
    useSettings.setState({ hydrated: true, consent: 'unasked' });
    await renderWithProviders(<WelcomeScreen />);

    expect(screen.queryByText('Oyunu birlikte geliştirelim mi?')).toBeNull();
    expect(screen.getByRole('button', { name: 'Oyna' })).toBeTruthy();
  });

  it('starts the practice run without opening an account', async () => {
    await renderWithProviders(<WelcomeScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Oyna' }));

    expect(useOnboarding.getState()).toMatchObject({ playing: true, practiced: false });
    expect(useSession.getState().token).toBeNull();
  });

  it('speaks English and Arabic', async () => {
    useLanguage.setState({ locale: 'en' });
    const { unmount } = await renderWithProviders(<WelcomeScreen />);

    expect(screen.getByText('Your scrolling habit, now a competition.')).toBeTruthy();
    expect(screen.getByText('Four moves, one reflex. Learn them in a practice run first.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();
    await unmount();

    useLanguage.setState({ locale: 'ar' });
    await renderWithProviders(<WelcomeScreen />);
    expect(screen.getByText('عادتك في التمرير أصبحت منافسة.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'العب' })).toBeTruthy();
  });

  it('names the language it speaks at the top, and opens the picker from there', async () => {
    await renderWithProviders(<WelcomeScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Türkçe' }));

    expect(await screen.findByText('Oyun seçtiğin dilde konuşur.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: 'English, İngilizce' }));
    expect(await screen.findByRole('button', { name: 'English' })).toBeOnTheScreen();
    expect(screen.getByText('Play')).toBeOnTheScreen();
  });
});
