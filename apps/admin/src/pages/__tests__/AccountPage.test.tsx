import { ApiError } from '@quezby/sdk/admin';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useSession } from '@/stores/session';
import { adminSession } from '@/test/factories';
import { fakeApi } from '@/test/fake-api';
import { renderApp } from '@/test/render';

async function fillPassword(user: ReturnType<typeof renderApp>['user'], currentLabel: string, current: string, next: string) {
  await user.type(screen.getByLabelText(currentLabel), current);
  await user.type(screen.getByLabelText('Yeni şifre'), next);
  await user.type(screen.getByLabelText('Yeni şifre (tekrar)'), next);
  await user.click(screen.getByRole('button', { name: 'Şifreyi değiştir' }));
}

describe('AccountPage', () => {
  it('shows who is signed in', async () => {
    renderApp({ path: '/account' });

    expect(await screen.findByRole('heading', { name: 'Hesabım' })).toBeInTheDocument();
    expect(screen.getByText('kubi@quezby.com')).toBeInTheDocument();
    expect(screen.getAllByText('Sahip').length).toBeGreaterThan(0);
  });

  it('keeps an admin on a temporary password here until they choose their own', async () => {
    const api = fakeApi();
    const session = adminSession({ mustChangePassword: true });
    api.me.changePassword.mockResolvedValue(undefined);
    const { user, router } = renderApp({ path: '/players', api, session });

    await waitFor(() => expect(router.state.location.pathname).toBe('/account'));
    expect(screen.getByText('Önce kendi şifreni belirle')).toBeInTheDocument();

    await fillPassword(user, 'Geçici şifre', 'gecici-sifre-16', 'yeni-ve-uzun-sifre');

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(api.me.changePassword).toHaveBeenCalledWith({
      currentPassword: 'gecici-sifre-16',
      password: 'yeni-ve-uzun-sifre',
      passwordConfirmation: 'yeni-ve-uzun-sifre',
    });
    expect(useSession.getState().session?.admin.mustChangePassword).toBe(false);
  });

  it('puts the API\'s field problems under their fields', async () => {
    const api = fakeApi();
    api.me.changePassword.mockRejectedValue(
      new ApiError(422, 'validation_failed', 'x', { currentPassword: ['Şu anki şifren doğru değil.'] }),
    );
    const { user } = renderApp({ path: '/account', api });

    await fillPassword(user, 'Şu anki şifre', 'yanlis', 'yeni-ve-uzun-sifre');

    expect(await screen.findByText('Şu anki şifren doğru değil.')).toBeInTheDocument();
  });
});
