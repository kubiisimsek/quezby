import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { fakeApi } from '@/test/fake-api';
import { playerRow, playersPage } from '@/test/factories';
import { renderApp } from '@/test/render';

describe('PlayersPage', () => {
  it('lists the players with what each one is', async () => {
    const api = fakeApi();
    api.players.list.mockResolvedValue(
      playersPage(
        [
          playerRow(),
          playerRow({ id: '01jplayer00000000000000000b', username: 'guest48128742', isAutoUsername: true, isGuest: true, email: null, identities: [], best: null }),
          playerRow({ id: '01jplayer00000000000000000c', username: 'hileci', best: 999999, bannedAt: '2026-09-24T10:00:00.000Z' }),
        ],
        { counts: { all: 3, active: 2, banned: 1, guest: 1 } },
      ),
    );
    renderApp({ path: '/players', api });

    await screen.findByText('@kerem.35');
    const table = screen.getByRole('table');
    expect(within(table).getByText('250.311')).toBeInTheDocument();
    expect(within(table).getByText('Otomatik ad')).toBeInTheDocument();
    expect(within(table).getAllByText('Misafir').length).toBeGreaterThan(0);
    expect(within(table).getByText('Yasaklı')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'kerem.35 sayfasını aç' })).toHaveAttribute('href', '/players/01jplayer00000000000000000a');
    expect(api.players.list).toHaveBeenCalledWith({ search: undefined, status: undefined, platform: undefined, sort: 'newest', page: 1 });
  });

  it('asks the API again as a search is typed, and keeps the search in the address', async () => {
    const api = fakeApi();
    api.players.list.mockResolvedValue(playersPage([playerRow()]));
    const { user, router } = renderApp({ path: '/players', api });

    await user.type(await screen.findByRole('searchbox', { name: 'Oyuncu ara' }), 'ker');

    await waitFor(() => expect(api.players.list).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'ker', page: 1 })));
    expect(router.state.location.search).toBe('?search=ker');
  });

  it('never writes an email into the address bar', async () => {
    const api = fakeApi();
    api.players.list.mockResolvedValue(playersPage([playerRow()]));
    const { user, router } = renderApp({ path: '/players', api });

    await user.type(await screen.findByRole('searchbox', { name: 'Oyuncu ara' }), 'kerem@quezby.com');

    await waitFor(() => expect(api.players.list).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'kerem@quezby.com' })));
    expect(router.state.location.search).toBe('');
  });

  it('filters by status from its chips and counts each one', async () => {
    const api = fakeApi();
    api.players.list.mockResolvedValue(playersPage([playerRow()], { counts: { all: 12, active: 10, banned: 2, guest: 4 } }));
    const { user } = renderApp({ path: '/players', api });

    await user.click(await screen.findByRole('radio', { name: /Yasaklı/ }));

    await waitFor(() => expect(api.players.list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'banned' })));
    expect(screen.getByRole('radio', { name: /Misafir/ })).toHaveTextContent('4');
  });

  it('opens on the page and filters the address says', async () => {
    const api = fakeApi();
    api.players.list.mockResolvedValue(playersPage([playerRow()], { page: 2, total: 60 }));
    renderApp({ path: '/players?status=guest&sort=best&page=2', api });

    expect(await screen.findByText('26–50')).toBeInTheDocument();
    expect(api.players.list).toHaveBeenCalledWith({ search: undefined, status: 'guest', platform: undefined, sort: 'best', page: 2 });
  });

  it('says when a search finds no one, and how to get back', async () => {
    const api = fakeApi();
    api.players.list.mockResolvedValue(playersPage([]));
    renderApp({ path: '/players?search=yokboyle', api });

    expect(await screen.findByText('Bu aramada oyuncu yok')).toBeInTheDocument();
    expect(screen.getByText('Aramayı temizle ya da Tümü’ne dön.')).toBeInTheDocument();
  });
});
