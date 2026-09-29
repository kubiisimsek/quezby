import { fireEvent, screen } from '@testing-library/react-native';

import { useSession } from '@/auth/session';
import { SignInWays } from '@/components/SignInWays';
import { buildMe } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/config/env', () => ({
  ...jest.requireActual('@/config/env'),
  GOOGLE_CLIENTS: null,
}));

jest.mock('@/api/client', () => ({
  api: { auth: { nonce: jest.fn() }, me: { linkApple: jest.fn(), unlink: jest.fn() } },
}));

describe('SignInWays', () => {
  beforeEach(() => {
    useSession.setState({ token: 'tok', user: buildMe(), ranks: null, hydrated: true });
  });

  it('draws the ways in outside a sheet, and leaves the email form to the caller', async () => {
    const onEmail = jest.fn();
    await renderWithProviders(<SignInWays onEmail={onEmail} />);

    expect(screen.getByRole('button', { name: 'Apple ile devam et' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'E-postayla koru' }));

    expect(onEmail).toHaveBeenCalledTimes(1);
  });

  it('names the attached ways, unless the page names the section itself', async () => {
    useSession.setState({ user: buildMe({ isGuest: false, identities: ['apple'], email: 'ekin@example.com' }) });
    const view = await renderWithProviders(<SignInWays onEmail={jest.fn()} />);

    expect(screen.getByText('Bağlı yollar')).toBeOnTheScreen();
    expect(screen.getByText('ekin@example.com')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Bağı kaldır' })).toBeOnTheScreen();

    await view.unmount();
    await renderWithProviders(<SignInWays attachedHeading={false} onEmail={jest.fn()} />);

    expect(screen.queryByText('Bağlı yollar')).not.toBeOnTheScreen();
    expect(screen.getByText('ekin@example.com')).toBeOnTheScreen();
  });
});
