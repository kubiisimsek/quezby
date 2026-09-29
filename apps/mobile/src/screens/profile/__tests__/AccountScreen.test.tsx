import { ApiError } from '@quezby/sdk';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { iso } from '@/i18n';
import { useLanguage } from '@/i18n/language';
import { AccountScreen } from '@/screens/profile/AccountScreen';
import { buildMe } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/config/env', () => ({
  ...jest.requireActual('@/config/env'),
  GOOGLE_CLIENTS: null,
}));

jest.mock('@/api/client', () => ({
  api: {
    me: {
      updateUsername: jest.fn(),
      delete: jest.fn(),
      linkCredentials: jest.fn(),
      unregisterPushToken: jest.fn(),
    },
    auth: { nonce: jest.fn() },
    usernames: { check: jest.fn() },
  },
}));

const mocked = api as unknown as {
  me: { updateUsername: jest.Mock; delete: jest.Mock; linkCredentials: jest.Mock };
  usernames: { check: jest.Mock };
};

const PICK_DESCRIPTION =
  'Şimdilik @guest48128742 olarak görünüyorsun. Seçtiğin ad bütün skorlarında görünür ve bir daha değişmez.';

type Props = Parameters<typeof AccountScreen>[0];

async function renderAccount() {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  await renderWithProviders(
    <AccountScreen
      navigation={navigation as unknown as Props['navigation']}
      route={{ key: 'Account-test', name: 'Account' } as Props['route']}
    />,
  );
  return navigation;
}

beforeEach(() => {
  jest.clearAllMocks();
  useSession.setState({ token: 'token', user: buildMe(), ranks: null, hydrated: true });
});

describe('AccountScreen', () => {
  it('is Hesap bilgileri: the name, the linked accounts and deleting, with a way back', async () => {
    const navigation = await renderAccount();

    expect(screen.getByText('Hesap bilgileri')).toBeOnTheScreen();
    expect(screen.getByText('Kullanıcı adı')).toBeOnTheScreen();
    expect(screen.getByText('Bağlı hesaplar')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Hesabı sil' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Geri' }));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  describe('the name', () => {
    it('shows a picked name locked, with no door to change it', async () => {
      await renderAccount();

      expect(screen.getByText('Kullanıcı adın')).toBeOnTheScreen();
      expect(screen.getByText('@ekin · kalıcı')).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: /Kullanıcı adın/ })).not.toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: /^Adını seç/ })).not.toBeOnTheScreen();
      expect(screen.queryByText(/değiştir/)).not.toBeOnTheScreen();
    });

    it('opens the one pick while the name is still the automatic one', async () => {
      useSession.setState({ user: buildMe({ username: 'guest48128742' }) });
      await renderAccount();

      expect(screen.getByText('Şimdilik @guest48128742 · bir kez seçersin')).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: /^Adını seç/ }));

      expect(screen.getByText(PICK_DESCRIPTION)).toBeOnTheScreen();
      expect(screen.getByPlaceholderText('ornek.kullanici').props.value ?? '').toBe('');
    });

    it('asks an account with no name for one, without an empty @', async () => {
      useSession.setState({ user: buildMe({ username: null }) });
      await renderAccount();

      expect(screen.getByRole('button', { name: /^Adını seç/ })).toBeOnTheScreen();
      expect(screen.getByText('Henüz bir adın yok')).toBeOnTheScreen();
      expect(screen.queryByText(/@null/)).not.toBeOnTheScreen();
    });

    it('saves the one pick, and from then on shows the name locked', async () => {
      useSession.setState({ user: buildMe({ username: 'guest48128742' }) });
      mocked.usernames.check.mockResolvedValue({ username: 'ekin.su', available: true, reason: null });
      mocked.me.updateUsername.mockResolvedValue({ user: buildMe({ username: 'ekin.su' }) });
      await renderAccount();
      await fireEvent.press(screen.getByRole('button', { name: /^Adını seç/ }));

      await fireEvent.changeText(screen.getByPlaceholderText('ornek.kullanici'), 'Ekin.Su');
      await waitFor(() => expect(screen.getByRole('button', { name: 'Kaydet' })).toBeEnabled());
      await fireEvent.press(screen.getByRole('button', { name: 'Kaydet' }));

      await waitFor(() => expect(mocked.me.updateUsername).toHaveBeenCalledWith('ekin.su'));
      await waitFor(() => expect(useSession.getState().user?.username).toBe('ekin.su'));
      expect(await screen.findByText('@ekin.su · kalıcı')).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: /^Adını seç/ })).not.toBeOnTheScreen();
    });

    it('says why a second pick is refused', async () => {
      useSession.setState({ user: buildMe({ username: 'guest48128742' }) });
      mocked.usernames.check.mockResolvedValue({ username: 'ekin.su', available: true, reason: null });
      mocked.me.updateUsername.mockRejectedValue(
        new ApiError(409, 'username_locked', 'Kullanıcı adını zaten seçtin; seçilen ad değişmez.'),
      );
      await renderAccount();
      await fireEvent.press(screen.getByRole('button', { name: /^Adını seç/ }));

      await fireEvent.changeText(screen.getByPlaceholderText('ornek.kullanici'), 'ekin.su');
      await waitFor(() => expect(screen.getByRole('button', { name: 'Kaydet' })).toBeEnabled());
      await fireEvent.press(screen.getByRole('button', { name: 'Kaydet' }));

      expect(await screen.findByText('Kullanıcı adını zaten seçtin; seçilen ad değişmez.')).toBeOnTheScreen();
    });
  });

  describe('the linked accounts', () => {
    it('offers a guest the ways this build has to keep the account', async () => {
      await renderAccount();

      expect(screen.getByText('Hesabını koru')).toBeOnTheScreen();
      expect(
        screen.getByText('Apple ya da e-posta bağla; telefon değişse de skorların kaybolmaz.'),
      ).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Apple ile devam et' })).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Google ile devam et' })).not.toBeOnTheScreen();
    });

    it('opens the email form over the page', async () => {
      await renderAccount();

      await fireEvent.press(screen.getByRole('button', { name: 'E-postayla koru' }));

      expect(screen.getByRole('button', { name: 'Hesabı koru' })).toBeOnTheScreen();
    });

    it('lists what a kept account is linked to, the email with its address', async () => {
      useSession.setState({
        user: buildMe({ isGuest: false, identities: ['apple'], email: 'ekin@example.com' }),
      });
      await renderAccount();

      expect(screen.getByText('Apple')).toBeOnTheScreen();
      expect(screen.getByText('ekin@example.com')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Bağı kaldır' })).toBeOnTheScreen();
      expect(screen.queryByText('Hesabını koru')).not.toBeOnTheScreen();
      expect(screen.queryByText('Bağlı yollar')).not.toBeOnTheScreen();
    });
  });

  describe('deleting the account', () => {
    it('asks first, then deletes when the name is typed as the label shows it', async () => {
      mocked.me.delete.mockResolvedValue(undefined);
      await renderAccount();

      await fireEvent.press(screen.getByRole('button', { name: 'Hesabı sil' }));
      expect(screen.getByRole('button', { name: 'Hesabı kalıcı olarak sil' })).toBeOnTheScreen();

      await fireEvent.changeText(screen.getByLabelText('Onay için @ekin yaz'), '@Ekin ');
      await fireEvent.press(screen.getByRole('button', { name: 'Hesabı kalıcı olarak sil' }));

      await waitFor(() => expect(mocked.me.delete).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(useSession.getState().token).toBeNull());
    });

    it('keeps the account while the name typed does not match', async () => {
      await renderAccount();

      await fireEvent.press(screen.getByRole('button', { name: 'Hesabı sil' }));
      await fireEvent.changeText(screen.getByLabelText('Onay için @ekin yaz'), 'deniz');

      expect(screen.getByRole('button', { name: 'Hesabı kalıcı olarak sil' })).toBeDisabled();
      expect(mocked.me.delete).not.toHaveBeenCalled();
    });
  });

  describe('in other languages', () => {
    const speak = (locale: 'en' | 'ar') => {
      useLanguage.setState({ locale, account: buildMe().id });
    };

    afterEach(async () => {
      await act(async () => useLanguage.setState({ locale: 'tr' }));
    });

    it('speaks English, and names what the delete door takes', async () => {
      speak('en');
      await renderAccount();

      expect(screen.getByText('Account info')).toBeOnTheScreen();
      expect(screen.getByText('Username')).toBeOnTheScreen();
      expect(screen.getByText('Linked accounts')).toBeOnTheScreen();
      expect(screen.getByText('@ekin · permanent')).toBeOnTheScreen();
      expect(screen.queryByText(/change/i)).not.toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Delete account' }));
      expect(
        screen.getByText("This can't be undone: your name, your scores and your place in the rankings are deleted."),
      ).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Delete account permanently' })).toBeOnTheScreen();
      expect(screen.getByLabelText('Type @ekin to confirm')).toBeOnTheScreen();
    });

    it('speaks Arabic, a name kept whole inside its line', async () => {
      speak('ar');
      useSession.setState({ user: buildMe({ username: 'guest48128742' }) });
      await renderAccount();

      expect(screen.getByText('معلومات الحساب')).toBeOnTheScreen();
      expect(screen.getByText(`حاليًا ${iso('@guest48128742')} · تختار مرة واحدة فقط`)).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: /^اختر اسمك/ }));

      expect(
        screen.getByText(
          `تظهر حاليًا باسم ${iso('@guest48128742')}. الاسم الذي تختاره يظهر مع كل نتائجك ولن يتغيّر أبدًا.`,
        ),
      ).toBeOnTheScreen();
    });
  });
});
