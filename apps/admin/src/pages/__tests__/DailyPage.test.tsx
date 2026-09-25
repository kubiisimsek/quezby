import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { board, boardKeys, boardRow } from '@/test/factories';
import { fakeApi } from '@/test/fake-api';
import { renderApp } from '@/test/render';

function withDays() {
  const api = fakeApi();
  api.boards.keys.mockResolvedValue(
    boardKeys({
      board: 'challenge',
      keys: [
        { key: '2026-09-25', players: 0, number: 2, topScore: null, topPlayer: null, attempts: 3 },
        { key: '2026-09-24', players: 31, number: 1, topScore: 99000, topPlayer: null, attempts: 40 },
        { key: '2026-09-23', players: 4, number: null, topScore: 12000, topPlayer: null, attempts: 4 },
      ],
    }),
  );
  api.boards.get.mockResolvedValue(board([boardRow()], { board: 'challenge', key: '2026-09-24', number: 1 }));
  return api;
}

describe('DailyPage', () => {
  it('lists the days with their number and players, today first', async () => {
    const api = withDays();
    renderApp({ path: '/daily', api });

    expect(await screen.findByRole('cell', { name: '#2' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '—' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '24 Eyl Per tablosunu aç' })).toHaveAttribute('href', '/daily?day=2026-09-24');
    await waitFor(() => expect(api.boards.get).toHaveBeenCalledWith({ board: 'challenge', key: '2026-09-25', page: 1 }));
  });

  it('opens the day the address names', async () => {
    const api = withDays();
    renderApp({ path: '/daily?day=2026-09-24', api });

    expect(await screen.findByText('@kerem.35')).toBeInTheDocument();
    expect(api.boards.get).toHaveBeenCalledWith({ board: 'challenge', key: '2026-09-24', page: 1 });
    expect(screen.getByText('#1 · 24 Eyl Per')).toBeInTheDocument();
  });

  it('names a day before the first Günün akışı by its date alone', async () => {
    const api = withDays();
    api.boards.get.mockResolvedValue(board([boardRow()], { board: 'challenge', key: '2026-09-23', number: null }));
    renderApp({ path: '/daily?day=2026-09-23', api });

    expect(await screen.findByText('@kerem.35')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '23 Eyl Çar' })).toBeInTheDocument();
  });
});
