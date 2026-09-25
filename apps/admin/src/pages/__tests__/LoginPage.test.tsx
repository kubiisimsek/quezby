import { ApiError } from '@quezby/sdk/admin';
import { act, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SESSION_KEY, useSession } from '@/stores/session';
import { adminSession } from '@/test/factories';
import { fakeApi } from '@/test/fake-api';
import { renderApp } from '@/test/render';

describe('LoginPage', () => {
  it('signs in, keeps the session in this tab and goes where the admin was headed', async () => {
    const api = fakeApi();
    api.auth.login.mockResolvedValue(adminSession());
    api.me.get.mockResolvedValue({ admin: adminSession().admin });
    api.overview.counts.mockResolvedValue({ review: 0 });
    const { user, router } = renderApp({ path: '/login', api, session: null });

    await user.type(screen.getByLabelText('E-posta'), ' kubi@quezby.com ');
    await user.type(screen.getByLabelText('Şifre'), 'uzun-bir-sifre');
    await user.click(screen.getByRole('button', { name: 'Giriş yap' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(api.auth.login).toHaveBeenCalledWith({ email: 'kubi@quezby.com', password: 'uzun-bir-sifre' });
    expect(sessionStorage.getItem(SESSION_KEY)).toContain('test-token');
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('remembers the session in the browser when asked to', async () => {
    const api = fakeApi();
    api.auth.login.mockResolvedValue(adminSession());
    api.me.get.mockResolvedValue({ admin: adminSession().admin });
    api.overview.counts.mockResolvedValue({ review: 0 });
    const { user } = renderApp({ path: '/login', api, session: null });

    await user.type(screen.getByLabelText('E-posta'), 'kubi@quezby.com');
    await user.type(screen.getByLabelText('Şifre'), 'uzun-bir-sifre');
    await user.click(screen.getByRole('checkbox', { name: /Beni hatırla/ }));
    await user.click(screen.getByRole('button', { name: 'Giriş yap' }));

    await waitFor(() => expect(localStorage.getItem(SESSION_KEY)).toContain('test-token'));
  });

  it('says a wrong email or password in the API\'s words', async () => {
    const api = fakeApi();
    api.auth.login.mockRejectedValue(new ApiError(422, 'invalid_credentials', 'E-posta ya da şifre hatalı.'));
    const { user } = renderApp({ path: '/login', api, session: null });

    await user.type(screen.getByLabelText('E-posta'), 'kubi@quezby.com');
    await user.type(screen.getByLabelText('Şifre'), 'yanlis');
    await user.click(screen.getByRole('button', { name: 'Giriş yap' }));

    expect(await screen.findByText('E-posta ya da şifre hatalı.')).toBeInTheDocument();
    expect(useSession.getState().session).toBeNull();
  });

  it('puts a field\'s problem under the field', async () => {
    const api = fakeApi();
    api.auth.login.mockRejectedValue(
      new ApiError(422, 'validation_failed', 'x', { email: ['E-posta geçerli bir e-posta adresi olmalı.'] }),
    );
    const { user } = renderApp({ path: '/login', api, session: null });

    await user.type(screen.getByLabelText('E-posta'), 'kubi');
    await user.type(screen.getByLabelText('Şifre'), 'x');
    await user.click(screen.getByRole('button', { name: 'Giriş yap' }));

    expect(await screen.findByText('E-posta geçerli bir e-posta adresi olmalı.')).toBeInTheDocument();
    expect(screen.getByLabelText('E-posta')).toHaveAttribute('aria-invalid', 'true');
  });

  it('sends a new admin to choose a password first', async () => {
    const api = fakeApi();
    const session = adminSession({ mustChangePassword: true });
    api.auth.login.mockResolvedValue(session);
    api.me.get.mockResolvedValue({ admin: session.admin });
    api.overview.counts.mockResolvedValue({ review: 0 });
    const { user, router } = renderApp({ path: '/login', api, session: null });

    await user.type(screen.getByLabelText('E-posta'), 'yeni@quezby.com');
    await user.type(screen.getByLabelText('Şifre'), 'gecici-sifre-16');
    await user.click(screen.getByRole('button', { name: 'Giriş yap' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/account'));
  });

  it('says so when a session ran out under an open panel', async () => {
    const { router } = renderApp({ path: '/account' });
    expect(await screen.findByRole('heading', { name: 'Hesabım' })).toBeInTheDocument();

    act(() => useSession.getState().signOut('expired'));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(screen.getByText('Oturumun sona erdi. Devam etmek için yeniden giriş yap.')).toBeInTheDocument();
  });

  it('sends a signed-in admin on from the sign-in page', async () => {
    const { router } = renderApp({ path: '/login' });

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });
});
