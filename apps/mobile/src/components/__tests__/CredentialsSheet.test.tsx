import { ApiError } from '@quezby/sdk';
import { fireEvent, screen } from '@testing-library/react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { CredentialsSheet } from '@/components/CredentialsSheet';
import { useLanguage } from '@/i18n/language';
import { buildMe } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/api/client', () => ({
  api: { me: { linkCredentials: jest.fn() } },
}));

const link = api.me.linkCredentials as jest.Mock;

async function fill(email: string, password: string) {
  await fireEvent.changeText(screen.getByLabelText('E-posta'), email);
  await fireEvent.changeText(screen.getByLabelText('Şifre'), password);
}

describe('CredentialsSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSession.setState({ token: 'token', user: buildMe(), ranks: null, hydrated: true });
  });

  it('offers a guest to keep the account', async () => {
    await renderWithProviders(<CredentialsSheet open guest onClose={jest.fn()} />);

    expect(screen.getByText('Hesabını koru')).toBeTruthy();
    expect(screen.getByText('Hesabı koru')).toBeTruthy();
  });

  it('asks for a real email and a long enough password before it asks the API', async () => {
    await renderWithProviders(<CredentialsSheet open guest onClose={jest.fn()} />);

    await fill('ekin', 'kisa');
    await fireEvent.press(screen.getByText('Hesabı koru'));

    expect(screen.getByText('Geçerli bir e-posta ve en az 8 karakterlik bir şifre yaz.')).toBeTruthy();
    expect(link).not.toHaveBeenCalled();
  });

  it('keeps the account with the email, and closes', async () => {
    const kept = buildMe({ email: 'ekin@example.com', isGuest: false });
    link.mockResolvedValue({ user: kept });
    const onClose = jest.fn();
    await renderWithProviders(<CredentialsSheet open guest onClose={onClose} />);

    await fill(' ekin@example.com ', 'uzun-bir-sifre');
    await fireEvent.press(screen.getByText('Hesabı koru'));

    expect(link).toHaveBeenCalledWith({ email: 'ekin@example.com', password: 'uzun-bir-sifre' });
    expect(useSession.getState().user?.isGuest).toBe(false);
    expect(onClose).toHaveBeenCalled();
  });

  it('says what the API refused', async () => {
    link.mockRejectedValue(new ApiError(409, 'email_taken', 'x'));
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

    await fireEvent.changeText(screen.getByLabelText('Email'), 'ekin');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'kisa');
    await fireEvent.press(screen.getByText('Protect account'));

    expect(
      screen.getByText('Enter a valid email and a password of at least 8 characters.'),
    ).toBeTruthy();
    expect(link).not.toHaveBeenCalled();
  });

  it('links one more way in to a kept account, in Arabic', async () => {
    useLanguage.setState({ locale: 'ar' });
    link.mockRejectedValue(new ApiError(409, 'email_taken', 'x'));
    await renderWithProviders(<CredentialsSheet open guest={false} onClose={jest.fn()} />);

    expect(screen.getByText('ربط بريد إلكتروني')).toBeTruthy();
    expect(screen.getByText('ستتمكن من الدخول بهذا البريد الإلكتروني وكلمة المرور أيضًا.')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('البريد الإلكتروني'), 'ekin@example.com');
    await fireEvent.changeText(screen.getByLabelText('كلمة المرور'), 'uzun-bir-sifre');
    await fireEvent.press(screen.getByText('ربط البريد الإلكتروني'));

    expect(await screen.findByText('هذا البريد الإلكتروني مرتبط بحساب آخر.')).toBeTruthy();
  });
});
