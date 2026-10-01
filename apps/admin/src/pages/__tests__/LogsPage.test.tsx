import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { adminSession, logEntry, logsPage, logSummary } from '@/test/factories';
import { fakeApi, type FakeApi } from '@/test/fake-api';
import { renderApp } from '@/test/render';

/** The admin client with the summary answering, as every Loglar page asks for it. */
function logsApi(): FakeApi {
  const api = fakeApi();
  api.logs.summary.mockResolvedValue(logSummary());
  return api;
}

/** The list of rows — not the chart's table for screen readers. */
async function rowsTable(): Promise<HTMLElement> {
  const header = await screen.findByRole('columnheader', { name: 'Seviye' });
  const table = header.closest('table');
  if (!table) throw new Error('no table');
  return table;
}

describe('LogsPage', () => {
  it('lists what went wrong, in words, with the player it is about', async () => {
    const api = logsApi();
    api.logs.list.mockResolvedValue(
      logsPage([
        logEntry(),
        logEntry({ id: 2, level: 'warning', source: 'push', event: 'push.no_device', message: 'Oyuncunun kayıtlı cihazı yok', status: null, method: null, path: null, platform: null }),
        logEntry({ id: 3, level: 'info', source: 'app', event: 'something.new', message: 'Yeni bir şey', player: null }),
      ]),
    );
    renderApp({ path: '/logs', api });

    const table = await rowsTable();
    expect(await within(table).findByText('Firebase')).toBeInTheDocument();
    expect(within(table).getByText('Dış servis · 403')).toBeInTheDocument();
    expect(within(table).getByText('Hata')).toBeInTheDocument();
    expect(within(table).getByText('Kayıtlı cihaz yok')).toBeInTheDocument();
    expect(within(table).getByText('Uyarı')).toBeInTheDocument();
    // An event the panel does not know shows as it is.
    expect(within(table).getByText('something.new')).toBeInTheDocument();
    expect(within(table).getAllByRole('link', { name: '@kerem.35' })[0]).toHaveAttribute('href', '/players/01jplayer00000000000000000a');
  });

  it('opens a row with everything it holds', async () => {
    const api = logsApi();
    api.logs.list.mockResolvedValue(logsPage([logEntry()]));
    const { user } = renderApp({ path: '/logs', api });

    await user.click(await screen.findByRole('button', { name: 'Ayrıntı' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('403 PERMISSION_DENIED: The caller does not have permission')).toBeInTheDocument();
    expect(within(dialog).getByText('POST fcm.googleapis.com/v1/projects/quezby-staging/messages:send')).toBeInTheDocument();
    expect(within(dialog).getByText('182 ms')).toBeInTheDocument();
    expect(within(dialog).getByText(/"device": "…a1b2c3d4"/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Bu oyuncunun logları' }));
    await waitFor(() => expect(api.logs.list).toHaveBeenLastCalledWith(expect.objectContaining({ player: '01jplayer00000000000000000a' })));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('filters by source, level and event', async () => {
    const api = logsApi();
    api.logs.list.mockResolvedValue(logsPage([logEntry()]));
    const { user } = renderApp({ path: '/logs', api });

    await rowsTable();
    expect(api.logs.list).toHaveBeenCalledWith({ source: undefined, level: undefined, event: undefined, player: undefined, page: 1 });

    await user.click(screen.getByRole('radio', { name: 'Push' }));
    await waitFor(() => expect(api.logs.list).toHaveBeenLastCalledWith(expect.objectContaining({ source: 'push' })));

    await user.click(screen.getByRole('combobox', { name: 'Seviye' }));
    await user.click(await screen.findByRole('option', { name: 'Hata' }));
    await waitFor(() => expect(api.logs.list).toHaveBeenLastCalledWith(expect.objectContaining({ source: 'push', level: 'error' })));

    await user.click(screen.getByRole('combobox', { name: 'Olay' }));
    await user.click(await screen.findByRole('option', { name: 'Kayıtlı cihaz yok' }));
    await waitFor(() => expect(api.logs.list).toHaveBeenLastCalledWith(expect.objectContaining({ event: 'push.no_device' })));
  });

  it('shows one player’s logs from the address, and lets the filter go', async () => {
    const api = logsApi();
    api.logs.list.mockResolvedValue(logsPage([logEntry()]));
    const { user } = renderApp({ path: '/logs?player=01jplayer00000000000000000a', api });

    expect(await screen.findByText('Tek bir oyuncunun logları')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Oyuncu filtresini kaldır' }));
    await waitFor(() => expect(api.logs.list).toHaveBeenLastCalledWith(expect.objectContaining({ player: undefined })));
  });

  it('says when there is nothing yet', async () => {
    const api = logsApi();
    api.logs.list.mockResolvedValue(logsPage([], { events: [] }));
    renderApp({ path: '/logs', api });

    expect(await screen.findByText('Henüz log yok')).toBeInTheDocument();
  });

  it('is closed to a viewer, and says who may open it', async () => {
    const api = fakeApi();
    renderApp({ path: '/logs', api, session: adminSession({ role: 'viewer' }) });

    expect(await screen.findByText('Bu sayfayı Moderatör ve üstü roldeki yöneticiler açabilir.')).toBeInTheDocument();
    expect(api.logs.list).not.toHaveBeenCalled();
  });

  it('pages without a total, by whether more follow', async () => {
    const api = logsApi();
    api.logs.list.mockResolvedValue(logsPage([logEntry()], { hasMore: true }));
    const { user } = renderApp({ path: '/logs', api });

    await user.click(await screen.findByRole('button', { name: 'Sonraki sayfa' }));
    await waitFor(() => expect(api.logs.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
  });

  it('counts each level over thirty days or twelve months, and filters by an event seen often', async () => {
    const api = logsApi();
    api.logs.list.mockResolvedValue(logsPage([logEntry()]));
    const { user } = renderApp({ path: '/logs', api });

    const top = await screen.findByRole('list', { name: 'En sık olaylar' });
    expect(api.logs.summary).toHaveBeenCalledWith('30d');
    expect(screen.getByText('Son 30 gün')).toBeInTheDocument();
    expect(screen.getByText('360')).toBeInTheDocument();
    expect(within(top).getAllByRole('button').map((button) => button.textContent)).toEqual([
      'GönderildiPush · Bilgi340',
      'Kayıtlı cihaz yokPush · Uyarı30',
      'FirebaseDış servis · Hata3',
    ]);

    await user.click(within(top).getByRole('button', { name: /Kayıtlı cihaz yok/ }));
    await waitFor(() =>
      expect(api.logs.list).toHaveBeenLastCalledWith(expect.objectContaining({ source: 'push', event: 'push.no_device', level: undefined })),
    );

    await user.click(screen.getByRole('radio', { name: '12 ay' }));
    await waitFor(() => expect(api.logs.summary).toHaveBeenLastCalledWith('12m'));
  });

  it('still lists the rows when the counts cannot be read', async () => {
    const api = fakeApi();
    api.logs.summary.mockRejectedValue(new Error('down'));
    api.logs.list.mockResolvedValue(logsPage([logEntry()]));
    renderApp({ path: '/logs', api });

    expect(await screen.findByText('Özet alınamadı')).toBeInTheDocument();
    expect(await rowsTable()).toBeInTheDocument();
  });
});
