import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { adminSession, auditEntry, page } from '@/test/factories';
import { fakeApi } from '@/test/fake-api';
import { renderApp } from '@/test/render';

describe('AuditPage', () => {
  it('lists who did what to whom, and links to what it was about', async () => {
    const api = fakeApi();
    api.audit.list.mockResolvedValue(
      page([
        auditEntry({ ip: '10.0.0.9' }),
        auditEntry({ id: 2, via: 'cli', reason: 'Bot gibi', actor: { id: null, name: 'Komut satırı' }, action: 'run.reject', subject: { type: 'run', id: '01jrun000000000000000000ab', label: 'kerem.35' } }),
      ]),
    );
    renderApp({ path: '/audit', api });

    await screen.findByText('Oyuncuyu yasakladı');
    const table = screen.getByRole('table');
    expect(within(table).getByRole('link', { name: '@kerem.35' })).toHaveAttribute('href', '/players/01jplayer00000000000000000a');
    expect(within(table).getByRole('link', { name: /Tur 000000AB/ })).toHaveAttribute('href', '/runs/01jrun000000000000000000ab');
    expect(within(table).getByText('Hız hilesi')).toBeInTheDocument();
    expect(within(table).getByText('10.0.0.9')).toBeInTheDocument();
  });

  it('names an owner setting a qb by hand', async () => {
    const api = fakeApi();
    api.audit.list.mockResolvedValue(
      page([auditEntry({ action: 'player.rating', reason: 'Lig testi', details: { from: 2450, to: 3250, tierFrom: 'gold', tierTo: 'platinum' } })]),
    );
    const { user } = renderApp({ path: '/audit', api });

    expect(await screen.findByText('qb’yi değiştirdi')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Lig testi')).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: 'İşlem' }));
    await user.click(await screen.findByRole('option', { name: 'qb’yi değiştirdi' }));
    await waitFor(() => expect(api.audit.list).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'player.rating' })));
  });

  it('keeps the address column from anyone but an owner', async () => {
    const api = fakeApi();
    api.audit.list.mockResolvedValue(page([auditEntry()]));
    renderApp({ path: '/audit', api, session: adminSession({ role: 'moderator' }) });

    await screen.findByText('Oyuncuyu yasakladı');
    expect(screen.queryByRole('columnheader', { name: 'Adres' })).not.toBeInTheDocument();
  });

  it('filters by channel and by one record\'s history', async () => {
    const api = fakeApi();
    api.audit.list.mockResolvedValue(page([auditEntry()]));
    const { user } = renderApp({ path: '/audit?subjectType=player&subjectId=01jplayer00000000000000000a', api });

    await screen.findByText('Oyuncuyu yasakladı');
    expect(api.audit.list).toHaveBeenCalledWith({ action: undefined, via: undefined, subjectType: 'player', subjectId: '01jplayer00000000000000000a', page: 1 });

    await user.click(screen.getByRole('radio', { name: 'Komut satırı' }));
    await waitFor(() => expect(api.audit.list).toHaveBeenLastCalledWith(expect.objectContaining({ via: 'cli' })));

    await user.click(screen.getByRole('button', { name: 'Filtreyi kaldır' }));
    await waitFor(() => expect(api.audit.list).toHaveBeenLastCalledWith(expect.objectContaining({ subjectType: undefined, subjectId: undefined })));
  });
});
