import { fireEvent, screen } from '@testing-library/react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { iso } from '@/i18n';
import { useLanguage } from '@/i18n/language';
import { SettingsSheet, keepHint } from '@/screens/profile/SettingsSheet';
import { useSettings } from '@/stores/settings';
import { buildMe } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/config/env', () => ({
  ...jest.requireActual('@/config/env'),
  GOOGLE_CLIENTS: null,
}));

jest.mock('@/api/client', () => ({
  api: { me: { updateSettings: jest.fn() } },
}));

const mocked = api as unknown as { me: { updateSettings: jest.Mock } };

async function renderSheet() {
  const onPick = jest.fn();
  await renderWithProviders(
    <SettingsSheet open onClose={jest.fn()} onPick={onPick} />,
  );
  return onPick;
}

describe('SettingsSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSession.setState({ token: 'token', user: buildMe(), hydrated: true });
    useSettings.setState({ haptics: true });
    mocked.me.updateSettings.mockResolvedValue({ user: buildMe() });
  });

  it('names the door a guest picks and leaves opening it to the profile', async () => {
    const onPick = await renderSheet();

    expect(screen.getByText('Ayarlar')).toBeOnTheScreen();
    expect(screen.getByText(keepHint())).toBeOnTheScreen();
    expect(screen.queryByText('Çıkış yap')).not.toBeOnTheScreen();

    for (const [name, door] of [
      [/^Yardım/, 'help'],
      [/^Hesabını koru/, 'ways'],
      [/^Hesabı sil/, 'delete'],
    ] as const) {
      await fireEvent.press(screen.getByRole('button', { name }));
      expect(onPick).toHaveBeenLastCalledWith(door);
    }
    expect(onPick).toHaveBeenCalledTimes(3);
  });

  it('opens with the language, named in its own words, as the first setting of the game', async () => {
    const onPick = await renderSheet();

    await fireEvent.press(screen.getByRole('button', { name: /^Dil.*Türkçe/ }));
    expect(onPick).toHaveBeenLastCalledWith('language');
  });

  it('names the language in its own words whatever the game speaks', async () => {
    useLanguage.setState({ locale: 'de', account: buildMe().id });
    await renderSheet();

    expect(screen.getByText('Sprache')).toBeOnTheScreen();
    expect(screen.getByText('Deutsch')).toBeOnTheScreen();
  });

  it('shows a picked name locked, with no door to change it', async () => {
    const onPick = await renderSheet();

    expect(screen.getByText('Kullanıcı adın')).toBeOnTheScreen();
    expect(screen.getByText('@ekin · kalıcı')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Kullanıcı adın/ })).not.toBeOnTheScreen();
    expect(screen.queryByText(/değiştir/)).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Kullanıcı adın'));
    expect(onPick).not.toHaveBeenCalled();
  });

  it('opens the one pick while the name is still the automatic one', async () => {
    useSession.setState({ user: buildMe({ username: 'guest48128742' }) });
    const onPick = await renderSheet();

    expect(screen.getByText('Şimdilik @guest48128742 · bir kez seçersin')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /^Adını seç/ }));
    expect(onPick).toHaveBeenCalledWith('username');
  });

  it('asks an account with no name for one, without an empty @', async () => {
    useSession.setState({ user: buildMe({ username: null }) });
    await renderSheet();

    expect(screen.getByRole('button', { name: /^Adını seç/ })).toBeOnTheScreen();
    expect(screen.getByText('Henüz bir adın yok')).toBeOnTheScreen();
    expect(screen.queryByText(/@null/)).not.toBeOnTheScreen();
  });

  it('offers a kept account its ways in and the way out', async () => {
    useSession.setState({
      user: buildMe({ isGuest: false, identities: ['google'] }),
    });
    const onPick = await renderSheet();

    expect(screen.getByText('Google bağlı')).toBeOnTheScreen();
    expect(
      screen.getByText('Tekrar Google ile girebilirsin.'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Hesabını koru')).not.toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole('button', { name: /^Giriş yolları/ }),
    );
    expect(onPick).toHaveBeenLastCalledWith('ways');
    await fireEvent.press(screen.getByRole('button', { name: /^Çıkış yap/ }));
    expect(onPick).toHaveBeenLastCalledWith('signOut');
  });

  it('says which build this is', async () => {
    await renderSheet();

    expect(screen.getByText(/^Quezby .+ · Local$/)).toBeOnTheScreen();
  });

  it('turns Titreşim off on the phone at once, then on the account', async () => {
    await renderSheet();

    const toggle = screen.getByRole('switch', { name: 'Titreşim' });
    expect(toggle).toBeChecked();
    await fireEvent.press(toggle);

    expect(useSettings.getState().haptics).toBe(false);
    expect(useSession.getState().user?.settings.haptics).toBe(false);
    expect(mocked.me.updateSettings).toHaveBeenCalledWith({ haptics: false });
    expect(screen.getByRole('switch', { name: 'Titreşim' })).not.toBeChecked();
    expect(screen.getByText('Oyun sessizce oynanır.')).toBeOnTheScreen();
  });

  it('turns Kullanım verisi on and off on the phone, for the account to take it next', async () => {
    useSettings.setState({ analytics: false, consent: 'synced', hydrated: true });
    await renderSheet();

    expect(screen.getByText('Yalnızca oyunun çalışması için gereken cihaz bilgisi gider.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('switch', { name: 'Kullanım verisi' }));

    expect(useSettings.getState()).toMatchObject({ analytics: true, consent: 'pending' });
    expect(screen.getByRole('switch', { name: 'Kullanım verisi' })).toBeChecked();
    expect(screen.getByText('Hangi ekranlara girdiğini ve ne kadar oynadığını sayarız.')).toBeOnTheScreen();
    // `useConsentSync` takes it to the account, not the sheet.
    expect(mocked.me.updateSettings).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('switch', { name: 'Kullanım verisi' }));
    expect(useSettings.getState()).toMatchObject({ analytics: false, consent: 'pending' });
  });

  it('keeps the phone’s choice when the API cannot be reached', async () => {
    mocked.me.updateSettings.mockRejectedValue(new Error('offline'));
    await renderSheet();

    await fireEvent.press(screen.getByRole('switch', { name: 'Titreşim' }));

    expect(useSettings.getState().haptics).toBe(false);
    expect(screen.getByText('Oyun sessizce oynanır.')).toBeOnTheScreen();
  });

  describe('in other languages', () => {
    /** Plays in `locale` on an account this phone has seen, so the account's own language does not take over. */
    const speak = (locale: 'en' | 'ar') => {
      useLanguage.setState({ locale, account: buildMe().id });
    };

    it('speaks English, and still never offers to change a picked name', async () => {
      speak('en');
      const onPick = await renderSheet();

      expect(screen.getByText('Settings')).toBeOnTheScreen();
      expect(screen.getByText('Game')).toBeOnTheScreen();
      expect(screen.getByRole('switch', { name: 'Vibration' })).toBeChecked();
      expect(screen.getByText('Vibrates on every swipe and every mistake.')).toBeOnTheScreen();
      expect(screen.getByRole('switch', { name: 'Usage data' })).not.toBeChecked();
      expect(
        screen.getByText('Only the device info the game needs to run is sent.'),
      ).toBeOnTheScreen();
      expect(screen.getByText('Your username')).toBeOnTheScreen();
      expect(screen.getByText('@ekin · permanent')).toBeOnTheScreen();
      expect(screen.queryByText(/change/i)).not.toBeOnTheScreen();
      expect(
        screen.getByText('Link Apple or email and your scores stay with you, even on a new phone.'),
      ).toBeOnTheScreen();
      expect(screen.getByText(keepHint())).toBeOnTheScreen();
      expect(screen.getByText(/^Quezby .+ · Local$/)).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: /^Help/ }));
      expect(onPick).toHaveBeenLastCalledWith('help');
      await fireEvent.press(screen.getByRole('button', { name: /^Delete account/ }));
      expect(onPick).toHaveBeenLastCalledWith('delete');
    });

    it('names a kept account’s ways in and the way out in English', async () => {
      speak('en');
      useSession.setState({
        user: buildMe({ isGuest: false, identities: ['google'] }),
      });
      await renderSheet();

      expect(screen.getByText('Google linked')).toBeOnTheScreen();
      expect(screen.getByText('You can sign back in with Google.')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: /^Sign-in methods/ })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: /^Sign out/ })).toBeOnTheScreen();
      expect(screen.queryByText('Protect your account')).not.toBeOnTheScreen();
    });

    it('speaks Arabic, a name kept whole inside its line', async () => {
      speak('ar');
      useSession.setState({ user: buildMe({ username: 'guest48128742' }) });
      const onPick = await renderSheet();

      expect(screen.getByText('الإعدادات')).toBeOnTheScreen();
      expect(screen.getByRole('switch', { name: 'الاهتزاز' })).toBeChecked();
      expect(screen.getByRole('switch', { name: 'بيانات الاستخدام' })).toBeOnTheScreen();
      expect(
        screen.getByText(`حاليًا ${iso('@guest48128742')} · تختار مرة واحدة فقط`),
      ).toBeOnTheScreen();
      expect(screen.getByText('اربط Apple أو البريد الإلكتروني، فلا تضيع نتائجك حتى لو تغيّر هاتفك.')).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: /^اختر اسمك/ }));
      expect(onPick).toHaveBeenCalledWith('username');
    });
  });
});
