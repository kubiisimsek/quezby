import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { adminSession, board, boardKeys, boardRow } from '@/test/factories';
import { fakeApi } from '@/test/fake-api';
import { renderApp } from '@/test/render';

function withBoard(rows = [boardRow(), boardRow({ rank: 2, player: { id: '01jplayer00000000000000000b', username: 'ekin', bannedAt: null }, score: 99000, run: { id: '01jrun000000000000000000cd', status: 'ranked', flags: [{ code: 'device_unverified', severity: 'soft', details: {} }], deviceVerdict: null } })]) {
  const api = fakeApi();
  api.boards.get.mockResolvedValue(board(rows));
  api.boards.keys.mockResolvedValue(boardKeys());
  return api;
}

describe('BoardsPage', () => {
  it('shows today\'s board ranked, with the signals behind each row', async () => {
    const api = withBoard();
    renderApp({ path: '/boards', api });

    expect(await screen.findByText('@ekin')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getAllByText('250.311').length).toBeGreaterThan(0);
    expect(screen.getByText('Cihaz kararı yok')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '#2 turunu aç' })).toHaveAttribute('href', '/runs/01jrun000000000000000000cd');
    expect(api.boards.get).toHaveBeenCalledWith({ board: 'daily', key: undefined, season: undefined, page: 1 });
  });

  it('switches boards and starts each at its current period', async () => {
    const api = withBoard();
    const { user } = renderApp({ path: '/boards?key=2026-09-24', api });

    await screen.findByText('@ekin');
    await user.click(screen.getByRole('tab', { name: 'Hafta' }));

    await waitFor(() => expect(api.boards.get).toHaveBeenLastCalledWith({ board: 'weekly', key: undefined, season: undefined, page: 1 }));
    expect(api.boards.keys).toHaveBeenLastCalledWith({ board: 'weekly', season: undefined, limit: 60 });
  });

  it('lets a moderator throw out the run behind a row', async () => {
    const api = withBoard();
    api.runs.reject.mockResolvedValue({ changed: true });
    const { user } = renderApp({ path: '/boards', api, session: adminSession({ role: 'moderator' }) });

    await screen.findByText('@ekin');
    await user.click(screen.getAllByRole('button', { name: 'Satır işlemleri' })[1] as HTMLElement);
    await user.click(await screen.findByRole('menuitem', { name: /Turu reddet/ }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Sebep'), 'Bot gibi');
    await user.click(within(dialog).getByRole('button', { name: 'Reddet' }));

    await waitFor(() => expect(api.runs.reject).toHaveBeenCalledWith('01jrun000000000000000000cd', { reason: 'Bot gibi' }));
  });

  it('gives a viewer only the way to the player', async () => {
    const api = withBoard();
    const { user } = renderApp({ path: '/boards', api, session: adminSession({ role: 'viewer' }) });

    await screen.findByText('@ekin');
    await user.click(screen.getAllByRole('button', { name: 'Satır işlemleri' })[0] as HTMLElement);

    expect(await screen.findByRole('menuitem', { name: /Oyuncuya git/ })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /Turu reddet/ })).not.toBeInTheDocument();
  });

  it('says a period has nobody yet', async () => {
    const api = withBoard([]);
    renderApp({ path: '/boards', api });

    expect(await screen.findByText('Bu dönemde kimse yok')).toBeInTheDocument();
  });
});
