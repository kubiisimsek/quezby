import { ApiError } from '@quezby/sdk';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { track } from '@/analytics/track';
import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { iso } from '@/i18n';
import { useLanguage } from '@/i18n/language';
import { UsernameScreen } from '@/screens/username/UsernameScreen';
import { useOnboarding } from '@/stores/onboarding';
import { buildMe } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/analytics/track', () => ({ track: jest.fn() }));

jest.mock('@/api/client', () => ({
  api: { me: { updateUsername: jest.fn() }, usernames: { check: jest.fn() } },
}));

const mocked = api as unknown as {
  me: { updateUsername: jest.Mock };
  usernames: { check: jest.Mock };
};

function signedIn(overrides: Parameters<typeof buildMe>[0] = {}, step: 'nickname' | null = 'nickname') {
  const user = buildMe({ id: 'u1', username: 'guest48128742', ...overrides });
  useSession.setState({ token: 'token', user, ranks: null, hydrated: true });
  useOnboarding.setState({ userId: 'u1', step, remindedFor: null, hydrated: true });
  return user;
}

/** Types a name and waits for the API to call it free: the save slab comes alive. */
async function type(name: string, save: string) {
  await fireEvent.changeText(screen.getByPlaceholderText('ornek.kullanici'), name);
  await waitFor(() => expect(screen.getByRole('button', { name: save })).toBeEnabled());
}

describe('UsernameScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('asks a new player for a name, and says what they are called until then', async () => {
    signedIn();
    await renderWithProviders(<UsernameScreen />);

    expect(screen.getByText('Sana ne diyelim?')).toBeTruthy();
    expect(screen.getByText(/Şimdilik adın @guest48128742/)).toBeTruthy();
    expect(screen.getByText('Kaydet')).toBeTruthy();
  });

  it('says the name it picks is for good, and never promises a change later', async () => {
    signedIn();
    await renderWithProviders(<UsernameScreen />);

    expect(screen.getByText(/seçtiğin ad bir daha değişmez/)).toBeTruthy();
    expect(screen.getByText(/istersen sonra Profil’den seçersin/)).toBeTruthy();
    expect(screen.queryByText(/değiştir/)).toBeNull();
  });

  it('lets a new player skip it, keeping the automatic name, and moves on to keeping the account', async () => {
    signedIn();
    await renderWithProviders(<UsernameScreen />);

    await fireEvent.press(screen.getByText('Şimdilik geç'));

    expect(mocked.me.updateUsername).not.toHaveBeenCalled();
    expect(useOnboarding.getState().step).toBe('protect');
    expect(track).toHaveBeenCalledWith('nickname_skip');
  });

  it('saves a picked name and moves on', async () => {
    signedIn();
    mocked.usernames.check.mockResolvedValue({ username: 'ekin.su', available: true, reason: null });
    mocked.me.updateUsername.mockResolvedValue({ user: buildMe({ id: 'u1', username: 'ekin.su' }) });
    await renderWithProviders(<UsernameScreen />);

    await type('Ekin.Su', 'Kaydet');
    await fireEvent.press(screen.getByText('Kaydet'));

    expect(mocked.me.updateUsername).toHaveBeenCalledWith('ekin.su');
    expect(useSession.getState().user?.username).toBe('ekin.su');
    expect(useOnboarding.getState().step).toBe('protect');
  });

  it('has no step after the name for an account that is already kept', async () => {
    signedIn({ isGuest: false, identities: ['apple'] });
    await renderWithProviders(<UsernameScreen />);

    await fireEvent.press(screen.getByText('Şimdilik geç'));

    expect(useOnboarding.getState().step).toBeNull();
  });

  it('cannot be skipped by an account with no name at all', async () => {
    signedIn({ username: null });
    await renderWithProviders(<UsernameScreen />);

    expect(screen.getByText('Sana ne diyelim?')).toBeTruthy();
    expect(screen.getByText(/^Benzersiz olmalı ve bir daha değişmez/)).toBeTruthy();
    expect(screen.queryByText('Şimdilik geç')).toBeNull();
  });

  it('says why a second name is refused, and still lets the step be skipped', async () => {
    signedIn({ username: 'ekin' });
    mocked.usernames.check.mockResolvedValue({ username: 'baska', available: true, reason: null });
    mocked.me.updateUsername.mockRejectedValue(
      new ApiError(409, 'username_locked', 'Kullanıcı adını zaten seçtin; seçilen ad değişmez.'),
    );
    await renderWithProviders(<UsernameScreen />);

    await type('baska', 'Kaydet');
    await fireEvent.press(screen.getByText('Kaydet'));

    expect(await screen.findByText('Kullanıcı adını zaten seçtin; seçilen ad değişmez.')).toBeTruthy();
    expect(useSession.getState().user?.username).toBe('ekin');
    await fireEvent.press(screen.getByText('Şimdilik geç'));
    expect(useOnboarding.getState().step).toBe('protect');
  });

  it('is the one question before the game for an account from before automatic names', async () => {
    signedIn({ username: null }, null);
    mocked.usernames.check.mockResolvedValue({ username: 'kubi', available: true, reason: null });
    mocked.me.updateUsername.mockResolvedValue({ user: buildMe({ id: 'u1', username: 'kubi' }) });
    await renderWithProviders(<UsernameScreen />);

    expect(screen.getByText('Sıralamada adın ne olsun?')).toBeTruthy();
    expect(screen.queryByText('Şimdilik geç')).toBeNull();
    await type('kubi', 'Devam');
    await fireEvent.press(screen.getByText('Devam'));

    expect(useSession.getState().user?.username).toBe('kubi');
    expect(useOnboarding.getState().step).toBeNull();
  });

  it('asks a new player for a name in English, and says the pick is for good', async () => {
    useLanguage.setState({ locale: 'en' });
    signedIn();
    mocked.usernames.check.mockResolvedValue({ username: 'ekin.su', available: true, reason: null });
    await renderWithProviders(<UsernameScreen />);

    expect(screen.getByText('What should we call you?')).toBeTruthy();
    expect(screen.getByText(/the name you pick never changes\. For now you're @guest48128742/)).toBeTruthy();
    expect(screen.getByText('Everyone on the leaderboard will see you by this name.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Skip for now' })).toBeTruthy();

    await fireEvent.changeText(screen.getByPlaceholderText('example.user'), 'Ekin.Su');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());
    expect(screen.getByText('@ekin.su can be yours.')).toBeTruthy();
  });

  it('asks in Arabic, the automatic name kept whole inside the line', async () => {
    useLanguage.setState({ locale: 'ar' });
    signedIn();
    await renderWithProviders(<UsernameScreen />);

    expect(screen.getByText('بماذا نناديك؟')).toBeTruthy();
    expect(screen.getByText(/الاسم الذي تختاره لن يتغيّر أبدًا/)).toBeTruthy();
    expect(screen.getByText(new RegExp(`اسمك الآن ${iso('@guest48128742')}،`))).toBeTruthy();
    expect(screen.getByRole('button', { name: 'حفظ' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'تخطَّ الآن' }));

    expect(useOnboarding.getState().step).toBe('protect');
  });

  it('asks an account without a name in German, and reads a refusal in the language of the moment', async () => {
    useLanguage.setState({ locale: 'de' });
    signedIn({ username: null }, null);
    mocked.usernames.check.mockResolvedValue({ username: 'kubi', available: true, reason: null });
    mocked.me.updateUsername.mockRejectedValue(new ApiError(409, 'username_taken', 'x'));
    await renderWithProviders(<UsernameScreen />);

    expect(screen.getByText('Wie heißt du in der Rangliste?')).toBeTruthy();
    expect(screen.getByText(/^Dein Name muss einzigartig sein und bleibt für immer\./)).toBeTruthy();
    await fireEvent.changeText(screen.getByPlaceholderText('beispiel.name'), 'kubi');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Weiter' })).toBeEnabled());
    await fireEvent.press(screen.getByRole('button', { name: 'Weiter' }));
    expect(await screen.findByText('Dieser Name ist schon vergeben.')).toBeTruthy();

    await act(async () => {
      useLanguage.setState({ locale: 'en' });
    });

    expect(screen.getByText('This username is taken.')).toBeTruthy();
  });
});
