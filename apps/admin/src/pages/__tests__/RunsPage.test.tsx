import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { fakeApi } from '@/test/fake-api';
import { runRow, runsPage } from '@/test/factories';
import { renderApp } from '@/test/render';

describe('RunsPage', () => {
  it('lists runs with their player, status, score and signals', async () => {
    const api = fakeApi();
    api.runs.list.mockResolvedValue(
      runsPage(
        [
          runRow(),
          runRow({
            id: '01jrun000000000000000000cd',
            status: 'flagged',
            score: 99000,
            flags: [{ code: 'wall_clock', severity: 'hard', details: {} }],
          }),
        ],
        { counts: { ranked: 1, flagged: 1 } },
      ),
    );
    renderApp({ path: '/runs', api });

    expect(await screen.findByText('Süre tutmuyor')).toBeInTheDocument();
    expect(screen.getByText('99.000')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tur 000000CD aç' })).toHaveAttribute('href', '/runs/01jrun000000000000000000cd');
    expect(screen.getByRole('radio', { name: /Bayraklı/ })).toHaveTextContent('1');
  });

  it('filters by status and by a player the address names', async () => {
    const api = fakeApi();
    api.runs.list.mockResolvedValue(runsPage([runRow()]));
    const { user } = renderApp({ path: '/runs?player=01jplayer00000000000000000a', api });

    expect(await screen.findByText('@kerem.35 turları')).toBeInTheDocument();
    expect(api.runs.list).toHaveBeenCalledWith(expect.objectContaining({ player: '01jplayer00000000000000000a', page: 1 }));

    await user.click(screen.getByRole('radio', { name: /Sıralamada/ }));
    await waitFor(() => expect(api.runs.list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'ranked' })));

    await user.click(screen.getByRole('button', { name: 'Oyuncu filtresini kaldır' }));
    await waitFor(() => expect(api.runs.list).toHaveBeenLastCalledWith(expect.objectContaining({ player: undefined })));
  });

  it('finds the VS runs, and calls a clean one played', async () => {
    const api = fakeApi();
    api.runs.list.mockResolvedValue(runsPage([runRow({ mode: 'vs', status: 'played' })], { counts: { played: 1 } }));
    const { user } = renderApp({ path: '/runs', api });

    const table = await screen.findByRole('table');
    expect(await within(table).findByText(/^VS · /)).toBeInTheDocument();
    expect(within(table).getByText('Oynandı')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Oynandı/ })).toHaveTextContent('1');

    await user.click(screen.getByRole('combobox', { name: 'Mod' }));
    await user.click(await screen.findByRole('option', { name: 'VS' }));

    await waitFor(() => expect(api.runs.list).toHaveBeenLastCalledWith(expect.objectContaining({ mode: 'vs', page: 1 })));
  });

  it('keeps day filters in the address', async () => {
    const api = fakeApi();
    api.runs.list.mockResolvedValue(runsPage([runRow()]));
    renderApp({ path: '/runs?from=2026-09-20&to=2026-09-25&sort=score', api });

    await screen.findByText('@kerem.35');
    expect(api.runs.list).toHaveBeenCalledWith(expect.objectContaining({ from: '2026-09-20', to: '2026-09-25', sort: 'score' }));
    expect(screen.getByLabelText('Başlangıç günü')).toHaveValue('2026-09-20');
  });
});
