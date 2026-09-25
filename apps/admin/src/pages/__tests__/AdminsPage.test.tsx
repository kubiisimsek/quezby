import { ApiError } from '@quezby/sdk/admin';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { adminAccount, adminSession } from '@/test/factories';
import { fakeApi } from '@/test/fake-api';
import { renderApp } from '@/test/render';

const EKIN = adminAccount({ id: '01jadmin00000000000000000b', name: 'Ekin Aydın', email: 'ekin@quezby.com', role: 'moderator', mustChangePassword: true });

function withAdmins() {
  const api = fakeApi();
  api.admins.list.mockResolvedValue({ admins: [adminAccount(), EKIN] });
  return api;
}

describe('AdminsPage', () => {
  it('lists the accounts and marks your own', async () => {
    renderApp({ path: '/admins', api: withAdmins() });

    expect(await screen.findByText('Ekin Aydın')).toBeInTheDocument();
    expect(screen.getByText('(sen)')).toBeInTheDocument();
    expect(screen.getByText('Şifre bekliyor')).toBeInTheDocument();
  });

  it('adds an admin and shows the temporary password once', async () => {
    const api = withAdmins();
    api.admins.create.mockResolvedValue({ admin: EKIN, temporaryPassword: 'Abcd1234Efgh5678' });
    const { user } = renderApp({ path: '/admins', api });

    await user.click(await screen.findByRole('button', { name: 'Yönetici ekle' }));
    const form = await screen.findByRole('dialog', { name: 'Yönetici ekle' });
    await user.type(within(form).getByLabelText('Ad'), 'Ekin Aydın');
    await user.type(within(form).getByLabelText('E-posta'), 'ekin@quezby.com');
    await user.click(within(form).getByRole('radio', { name: 'İzleyici' }));
    await user.click(within(form).getByRole('button', { name: 'Ekle' }));

    await waitFor(() => expect(api.admins.create).toHaveBeenCalledWith({ name: 'Ekin Aydın', email: 'ekin@quezby.com', role: 'viewer' }));
    expect(await screen.findByTestId('secret')).toHaveTextContent('Abcd1234Efgh5678');

    await user.click(screen.getByRole('button', { name: 'Tamam, kaydettim' }));
    await waitFor(() => expect(screen.queryByTestId('secret')).not.toBeInTheDocument());
  });

  it('shows the API\'s problem with an email under it', async () => {
    const api = withAdmins();
    api.admins.create.mockRejectedValue(new ApiError(422, 'validation_failed', 'x', { email: ['Bu e-posta zaten kullanılıyor.'] }));
    const { user } = renderApp({ path: '/admins', api });

    await user.click(await screen.findByRole('button', { name: 'Yönetici ekle' }));
    const form = await screen.findByRole('dialog');
    await user.type(within(form).getByLabelText('Ad'), 'Ekin');
    await user.type(within(form).getByLabelText('E-posta'), 'kubi@quezby.com');
    await user.click(within(form).getByRole('button', { name: 'Ekle' }));

    expect(await within(form).findByText('Bu e-posta zaten kullanılıyor.')).toBeInTheDocument();
  });

  it('switches another admin off after asking', async () => {
    const api = withAdmins();
    api.admins.update.mockResolvedValue({ admin: { ...EKIN, disabledAt: '2026-09-25T09:00:00.000Z' } });
    const { user } = renderApp({ path: '/admins', api });

    await user.click(await screen.findByRole('button', { name: 'Ekin Aydın işlemleri' }));
    await user.click(await screen.findByRole('menuitem', { name: /Hesabı kapat/ }));
    await user.click(await screen.findByRole('button', { name: 'Hesabı kapat' }));

    await waitFor(() => expect(api.admins.update).toHaveBeenCalledWith(EKIN.id, { disabled: true }));
  });

  it('gives another admin a new password, but never yourself', async () => {
    const api = withAdmins();
    api.admins.resetPassword.mockResolvedValue({ admin: EKIN, temporaryPassword: 'Yeni1234Sifre5678' });
    const { user } = renderApp({ path: '/admins', api });

    await user.click(await screen.findByRole('button', { name: 'Kubilay Şimşek işlemleri' }));
    expect(await screen.findByRole('menuitem', { name: /Şifreyi sıfırla/ })).toHaveAttribute('data-disabled');
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: 'Ekin Aydın işlemleri' }));
    await user.click(await screen.findByRole('menuitem', { name: /Şifreyi sıfırla/ }));
    await user.click(await screen.findByRole('button', { name: 'Şifreyi sıfırla' }));

    expect(await screen.findByTestId('secret')).toHaveTextContent('Yeni1234Sifre5678');
    expect(api.admins.resetPassword).toHaveBeenCalledWith(EKIN.id);
  });

  it('stays shut to anyone but an owner', async () => {
    renderApp({ path: '/admins', api: withAdmins(), session: adminSession({ role: 'moderator' }) });

    expect(await screen.findByText('Yetkin yok')).toBeInTheDocument();
  });
});
