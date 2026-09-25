import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RequireRole } from '@/components/layout/gate';
import { useSession } from '@/stores/session';
import { adminSession } from '@/test/factories';
import { renderApp, renderWithProviders } from '@/test/render';

describe('the session gate', () => {
  it('sends a visitor with no session to sign in, and back afterwards', async () => {
    const { router } = renderApp({ path: '/players?status=banned', session: null });

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(router.state.location.state).toEqual({ from: '/players?status=banned' });
  });

  it('tells an admin below the role why a typed-in owner page stays shut', () => {
    useSession.setState({ session: { ...adminSession({ role: 'moderator' }), remember: false } });
    renderWithProviders(
      <RequireRole least="owner">
        <p>Sistem ayarları</p>
      </RequireRole>,
    );

    expect(screen.getByText('Yetkin yok')).toBeInTheDocument();
    expect(screen.queryByText('Sistem ayarları')).not.toBeInTheDocument();
  });

  it('opens an owner page for an owner', () => {
    useSession.setState({ session: { ...adminSession({ role: 'owner' }), remember: false } });
    renderWithProviders(
      <RequireRole least="owner">
        <p>Sistem ayarları</p>
      </RequireRole>,
    );

    expect(screen.getByText('Sistem ayarları')).toBeInTheDocument();
  });
});
