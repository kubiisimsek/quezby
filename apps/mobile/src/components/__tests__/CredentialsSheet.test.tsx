import { ApiError } from '@quezby/sdk';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { CredentialsSheet } from '@/components/CredentialsSheet';
import { useLanguage } from '@/i18n/language';
import { buildMe } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/api/client', () => ({
  api: { me: { linkCredentials: jest.fn(), resendCredentials: jest.fn(), verifyCredentials: jest.fn() } },
}));

const mocked = api as unknown as {
  me: { linkCredentials: jest.Mock; resendCredentials: jest.Mock; verifyCredentials: jest.Mock };
};
const SENT = { email: 'ekin@example.com', resendIn: 60, expiresAt: '2026-09-29T10:15:00.000Z' };

async function fill(email: string, password: string, confirm = password) {
  await fireEvent.changeText(screen.getByLabelText('E-posta'), email);
  await fireEvent.changeText(screen.getByLabelText('Şifre'), password);
  await fireEvent.changeText(screen.getByLabelText('Şifreyi doğrula'), confirm);
}

describe('CredentialsSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSession.setState({ token: 'token', user: buildMe(), ranks: null, hydrated: true });
  });

  it('offers a guest to keep the account with an email and the password twice', async () => {
    await renderWithProviders(<CredentialsSheet open guest onClose={jest.fn()} />);

    expect(screen.getByText('Hesabını koru')).toBeTruthy();
    expect(screen.getByText('Hesabı koru')).toBeTruthy();
    expect(screen.getByLabelText('Şifreyi doğrula')).toBeTruthy();
  });

  it('asks for a real email, a long enough password and the same one twice before it asks the API', async () => {
    await renderWithProviders(<CredentialsSheet open guest onClose={jest.fn()} />);

    await fill('ekin', 'kisa');
    await fireEvent.press(screen.getByText('Hesabı koru'));
    expect(screen.getByText('Geçerli bir e-posta ve en az 8 karakterlik bir şifre yaz.')).toBeTruthy();

    await fill('ekin@example.com', 'uzun-bir-sifre', 'baska-bir-sifre');
    await fireEvent.press(screen.getByText('Hesabı koru'));
    expect(screen.getByText('Şifreler aynı değil.')).toBeTruthy();
    expect(mocked.me.linkCredentials).not.toHaveBeenCalled();
  });

  it('keeps the account only once the emailed code comes back, then closes', async () => {
    mocked.me.linkCredentials.mockResolvedValue(SENT);
    const kept = buildMe({ email: 'ekin@example.com', isGuest: false });
    mocked.me.verifyCredentials.mockResolvedValue({ user: kept });
    const onClose = jest.fn();
    await renderWithProviders(<CredentialsSheet open guest onClose={onClose} />);

    await fill(' ekin@example.com ', 'uzun-bir-sifre');
    await fireEvent.press(screen.getByText('Hesabı koru'));

    expect(mocked.me.linkCredentials).toHaveBeenCalledWith({ email: 'ekin@example.com', password: 'uzun-bir-sifre' });
    expect(await screen.findByText('ekin@example.com adresine 6 haneli bir kod gönderdik.')).toBeTruthy();
    expect(useSession.getState().user?.isGuest).toBe(true);
    expect(onClose).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Kod'), '123456');
    await fireEvent.press(screen.getByRole('button', { name: 'Doğrula' }));

    expect(mocked.me.verifyCredentials).toHaveBeenCalledWith('123456');
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(useSession.getState().user?.isGuest).toBe(false);
  });

  it('says a code is wrong, and sends a new one once the wait is over', async () => {
    mocked.me.linkCredentials.mockResolvedValue({ ...SENT, resendIn: 0 });
    mocked.me.verifyCredentials.mockRejectedValue(new ApiError(422, 'code_invalid', 'x'));
    mocked.me.resendCredentials.mockResolvedValue(SENT);
    await renderWithProviders(<CredentialsSheet open guest onClose={jest.fn()} />);
    await fill('ekin@example.com', 'uzun-bir-sifre');
    await fireEvent.press(screen.getByText('Hesabı koru'));
    await screen.findByLabelText('Kod');

    await fireEvent.changeText(screen.getByLabelText('Kod'), '000000');
    await fireEvent.press(screen.getByRole('button', { name: 'Doğrula' }));
    expect(await screen.findByText('Kod hatalı. Tekrar dene.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Kodu tekrar gönder' }));
    expect(mocked.me.resendCredentials).toHaveBeenCalled();
    expect(await screen.findByText('Yeni kodu gönderdik.')).toBeTruthy();
  });

  it('says what the API refused', async () => {
    mocked.me.linkCredentials.mockRejectedValue(new ApiError(409, 'email_taken', 'x'));
    await renderWithProviders(<CredentialsSheet open guest onClose={jest.fn()} />);

    await fill('ekin@example.com', 'uzun-bir-sifre');
    await fireEvent.press(screen.getByText('Hesabı koru'));

    expect(await screen.findByText('Bu e-posta başka bir hesaba bağlı.')).toBeTruthy();
  });

  it('offers a guest to keep the account in English, and asks for what is missing', async () => {
    useLanguage.setState({ locale: 'en' });
    await renderWithProviders(<CredentialsSheet open guest onClose={jest.fn()} />);

    expect(screen.getByText('Protect your account')).toBeTruthy();
    expect(screen.getByText(/^This account only lives on this phone for now\./)).toBeTruthy();
    expect(screen.getByText('At least 8 characters.')).toBeTruthy();
    expect(screen.getByLabelText('Confirm password')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Email'), 'ekin');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'kisa');
    await fireEvent.press(screen.getByText('Protect account'));

    expect(screen.getByText('Enter a valid email and a password of at least 8 characters.')).toBeTruthy();
  });
});
