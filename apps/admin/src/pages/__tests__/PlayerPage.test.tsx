import { ApiError } from '@quezby/sdk/admin';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { adminSession, playerResponse, playersPage } from '@/test/factories';
import { fakeApi } from '@/test/fake-api';
import { renderApp } from '@/test/render';

const ID = '01jplayer00000000000000000a';

function withPlayer(response = playerResponse()) {
  const api = fakeApi();
  api.players.get.mockResolvedValue(response);
  return api;
}

describe('PlayerPage', () => {
  it('shows who the player is and what they played', async () => {
    renderApp({ path: `/players/${ID}`, api: withPlayer() });

    expect(await screen.findByRole('heading', { name: '@kerem.35' })).toBeInTheDocument();
    expect(screen.getByText('Sezon 2 rekoru')).toBeInTheDocument();
    expect(screen.getAllByText('250.311').length).toBeGreaterThan(0);
    expect(screen.getByText('Altın · 4/28')).toBeInTheDocument();
    expect(screen.getByText('×2,5')).toBeInTheDocument();
    expect(screen.getByText('Makine gibi ritim')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tüm turları' })).toHaveAttribute('href', `/runs?player=${ID}`);
  });

  it('bans with a reason, and says so', async () => {
    const api = withPlayer();
    api.players.ban.mockResolvedValue({ changed: true });
    const { user } = renderApp({ path: `/players/${ID}`, api });

    await user.click(await screen.findByRole('button', { name: 'İşlemler' }));
    await user.click(await screen.findByRole('menuitem', { name: /Yasakla/ }));
    const dialog = await screen.findByRole('dialog', { name: '@kerem.35 yasaklansın mı?' });
    await user.type(within(dialog).getByLabelText('Sebep'), 'Hız hilesi');
    await user.click(within(dialog).getByRole('button', { name: 'Yasakla' }));

    await waitFor(() => expect(api.players.ban).toHaveBeenCalledWith(ID, { reason: 'Hız hilesi' }));
    expect(await screen.findByText('Oyuncu yasaklandı')).toBeInTheDocument();
  });

  it('shows the API\'s problem with a reason under the reason', async () => {
    const api = withPlayer();
    api.players.ban.mockRejectedValue(new ApiError(422, 'validation_failed', 'x', { reason: ['Sebep en az 3 karakter olmalı.'] }));
    const { user } = renderApp({ path: `/players/${ID}`, api });

    await user.click(await screen.findByRole('button', { name: 'İşlemler' }));
    await user.click(await screen.findByRole('menuitem', { name: /Yasakla/ }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Sebep'), 'ab');
    await user.click(within(dialog).getByRole('button', { name: 'Yasakla' }));

    expect(await within(dialog).findByText('Sebep en az 3 karakter olmalı.')).toBeInTheDocument();
  });

  it('offers to lift a ban instead, and shows why the player was banned', async () => {
    const api = withPlayer(playerResponse({ best: null, league: null }, { bannedAt: '2026-09-24T10:00:00.000Z', banReason: 'Bot gibi oynuyor' }));
    api.players.unban.mockResolvedValue({ changed: true });
    const { user } = renderApp({ path: `/players/${ID}`, api });

    expect(await screen.findByText('Bot gibi oynuyor')).toBeInTheDocument();
    expect(screen.getByText('Yasaklıyken tablolarda yer almaz; yasak kalkınca geri gelir.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'İşlemler' }));
    await user.click(await screen.findByRole('menuitem', { name: /Yasağı kaldır/ }));
    await user.click(await screen.findByRole('button', { name: 'Yasağı kaldır' }));

    await waitFor(() => expect(api.players.unban).toHaveBeenCalledWith(ID));
  });

  it('cannot sign a guest out, and says why', async () => {
    const { user } = renderApp({
      path: `/players/${ID}`,
      api: withPlayer(playerResponse({}, { isGuest: true, email: null, identities: [], identityDetails: [] })),
    });

    await user.click(await screen.findByRole('button', { name: 'İşlemler' }));
    const item = await screen.findByRole('menuitem', { name: /Oturumları kapat/ });
    expect(item).toHaveAttribute('data-disabled');
    expect(item).toHaveTextContent('Misafirde yapılamaz: hesap kaybolur');
  });

  it('lets only an owner delete, after the name is typed, then leaves the page', async () => {
    const api = withPlayer();
    api.players.remove.mockResolvedValue(undefined);
    api.players.list.mockResolvedValue(playersPage([]));
    const { user, router } = renderApp({ path: `/players/${ID}`, api });

    await user.click(await screen.findByRole('button', { name: 'İşlemler' }));
    await user.click(await screen.findByRole('menuitem', { name: /Hesabı sil/ }));
    const dialog = await screen.findByRole('dialog', { name: '@kerem.35 hesabı silinsin mi?' });
    await user.type(within(dialog).getByLabelText('Sebep'), 'Oyuncu istedi');
    await user.type(within(dialog).getByLabelText('Onaylamak için “kerem.35” yaz'), 'kerem.35');
    await user.click(within(dialog).getByRole('button', { name: 'Hesabı sil' }));

    await waitFor(() => expect(api.players.remove).toHaveBeenCalledWith(ID, { reason: 'Oyuncu istedi', confirm: 'kerem.35' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/players'));
  });

  it('shows a moderator no delete, and a viewer no actions at all', async () => {
    const { unmount, user } = renderApp({ path: `/players/${ID}`, api: withPlayer(), session: adminSession({ role: 'moderator' }) });
    await user.click(await screen.findByRole('button', { name: 'İşlemler' }));
    expect(await screen.findByRole('menuitem', { name: /Yasakla/ })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /Hesabı sil/ })).not.toBeInTheDocument();
    unmount();

    renderApp({ path: `/players/${ID}`, api: withPlayer(), session: adminSession({ role: 'viewer' }) });
    expect(await screen.findByRole('heading', { name: '@kerem.35' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'İşlemler' })).not.toBeInTheDocument();
  });

  it('says so when there is no such player', async () => {
    const api = fakeApi();
    api.players.get.mockRejectedValue(new ApiError(404, 'not_found', 'Aradığın şey bulunamadı.'));
    renderApp({ path: `/players/${ID}`, api });

    expect(await screen.findByText('Böyle bir oyuncu yok')).toBeInTheDocument();
  });
});
