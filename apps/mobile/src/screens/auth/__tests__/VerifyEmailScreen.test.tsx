import { ApiError } from '@quezby/sdk';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { useLanguage } from '@/i18n/language';
import { VerifyEmailScreen } from '@/screens/auth/VerifyEmailScreen';
import { useOnboarding } from '@/stores/onboarding';
import { useSettings } from '@/stores/settings';
import { buildMe } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/api/client', () => ({
  api: { auth: { verifyRegistration: jest.fn(), resendRegistration: jest.fn() } },
}));

const mocked = api as unknown as { auth: { verifyRegistration: jest.Mock; resendRegistration: jest.Mock } };

type Props = Parameters<typeof VerifyEmailScreen>[0];
const props = (resendIn?: number) =>
  ({
    navigation: { goBack: jest.fn(), canGoBack: () => true },
    route: { key: 'VerifyEmail', name: 'VerifyEmail', params: { email: 'ekin@example.com', resendIn } },
  }) as unknown as Props;

describe('VerifyEmailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSession.setState({ token: null, user: null, ranks: null, hydrated: true });
    useOnboarding.setState({ practiced: true, playing: false, userId: null, steps: [], remindedFor: null, hydrated: true });
    useSettings.setState({ hydrated: true, consent: 'unasked', analytics: false });
  });

  it('says where the code went, and waits before a new one', async () => {
    await renderWithProviders(<VerifyEmailScreen {...props(42)} />);

    expect(screen.getByText('E-postanı doğrula')).toBeTruthy();
    expect(screen.getByText('ekin@example.com adresine 6 haneli bir kod gönderdik.')).toBeTruthy();
    expect(screen.getByText('Gelmediyse gereksiz klasörüne bak.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Kodu tekrar gönder (0:42)' })).toBeDisabled();
  });

  it('takes only digits, six of them', async () => {
    await renderWithProviders(<VerifyEmailScreen {...props()} />);

    await fireEvent.changeText(screen.getByLabelText('Kod'), '12a 34-5678');
    expect(screen.getByLabelText('Kod').props.value).toBe('123456');

    await fireEvent.changeText(screen.getByLabelText('Kod'), '123');
    await fireEvent.press(screen.getByRole('button', { name: 'Doğrula' }));
    expect(screen.getByText('Kodun 6 hanesini yaz.')).toBeTruthy();
    expect(mocked.auth.verifyRegistration).not.toHaveBeenCalled();
  });

  it('opens the account with the right code, then asks for its name', async () => {
    mocked.auth.verifyRegistration.mockResolvedValue({
      token: 'token-e',
      user: buildMe({ id: 'e1', username: 'guest48128742', email: 'ekin@example.com', isGuest: false }),
    });
    await renderWithProviders(<VerifyEmailScreen {...props()} />);

    await fireEvent.changeText(screen.getByLabelText('Kod'), '123456');
    await fireEvent.press(screen.getByRole('button', { name: 'Doğrula' }));

    expect(mocked.auth.verifyRegistration).toHaveBeenCalledWith({ email: 'ekin@example.com', code: '123456' });
    await waitFor(() => expect(useSession.getState().token).toBe('token-e'));
    expect(useOnboarding.getState()).toMatchObject({ userId: 'e1', steps: ['username', 'consent', 'notifications'] });
  });

  it('says a code is wrong or has run out', async () => {
    mocked.auth.verifyRegistration.mockRejectedValueOnce(new ApiError(422, 'code_invalid', 'x'));
    mocked.auth.verifyRegistration.mockRejectedValueOnce(new ApiError(422, 'code_expired', 'x'));
    await renderWithProviders(<VerifyEmailScreen {...props()} />);
    await fireEvent.changeText(screen.getByLabelText('Kod'), '000000');

    await fireEvent.press(screen.getByRole('button', { name: 'Doğrula' }));
    expect(await screen.findByText('Kod hatalı. Tekrar dene.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Doğrula' }));
    expect(await screen.findByText('Kodun süresi doldu. Yeni kod iste.')).toBeTruthy();
    expect(useSession.getState().token).toBeNull();
  });

  it('sends a new code once the wait is over, and waits again', async () => {
    mocked.auth.resendRegistration.mockResolvedValue({ email: 'ekin@example.com', resendIn: 60, expiresAt: '2026-09-29T10:15:00.000Z' });
    await renderWithProviders(<VerifyEmailScreen {...props(0)} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Kodu tekrar gönder' }));

    expect(mocked.auth.resendRegistration).toHaveBeenCalledWith({ email: 'ekin@example.com' });
    expect(await screen.findByText('Yeni kodu gönderdik.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Kodu tekrar gönder (1:00)' })).toBeDisabled();
  });

  it('speaks English and Arabic', async () => {
    useLanguage.setState({ locale: 'en' });
    const { unmount } = await renderWithProviders(<VerifyEmailScreen {...props(5)} />);
    expect(screen.getByText('We sent a 6-digit code to ekin@example.com.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Send the code again (0:05)' })).toBeTruthy();
    await unmount();

    useLanguage.setState({ locale: 'ar' });
    await renderWithProviders(<VerifyEmailScreen {...props()} />);
    expect(screen.getByText('أكّد بريدك الإلكتروني')).toBeTruthy();
    expect(screen.getByText('أرسلنا رمزًا من 6 أرقام إلى ‎ekin@example.com‎.')).toBeTruthy();
  });
});
