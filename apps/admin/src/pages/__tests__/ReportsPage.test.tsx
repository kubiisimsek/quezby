import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { adminSession, AVATAR_URL, reportRow, reportsPage } from '@/test/factories';
import { fakeApi } from '@/test/fake-api';
import { renderApp } from '@/test/render';

const rowOf = (username: string) => screen.getByRole('link', { name: `${username} sayfasını aç` }).closest('tr') as HTMLElement;

describe('ReportsPage', () => {
  it('lists the reported players with what was reported about them, each opening their page', async () => {
    const api = fakeApi();
    api.reports.list.mockResolvedValue(
      reportsPage([
        reportRow(),
        reportRow({
          player: { id: '01jplayer00000000000000000b', username: 'hileci', bannedAt: '2026-09-24T10:00:00.000Z' },
          avatarUrl: null,
          reasons: { photo: 0, name: 4 },
          reports: 4,
        }),
      ]),
    );
    renderApp({ path: '/reports', api, session: adminSession({ role: 'viewer' }) });

    expect(await screen.findByText('@kerem.35')).toBeInTheDocument();
    expect(api.reports.list).toHaveBeenCalledWith({ status: 'open', page: 1 });
    expect(screen.getByRole('heading', { name: 'Açık bildirimler' })).toBeInTheDocument();

    const kerem = rowOf('kerem.35');
    expect(within(kerem).getByText('Fotoğraf ×2')).toBeInTheDocument();
    expect(within(kerem).getByText('Kullanıcı adı ×1')).toBeInTheDocument();
    expect(within(kerem).getByText('3')).toBeInTheDocument();
    expect(kerem.querySelector('img')).toHaveAttribute('src', AVATAR_URL);
    expect(screen.getByRole('link', { name: 'kerem.35 sayfasını aç' })).toHaveAttribute('href', '/players/01jplayer00000000000000000a');

    const hileci = rowOf('hileci');
    expect(within(hileci).getByText('Kullanıcı adı ×4')).toBeInTheDocument();
    expect(within(hileci).queryByText(/Fotoğraf ×/)).not.toBeInTheDocument();
    expect(within(hileci).getByText('Yasaklı')).toBeInTheDocument();
    expect(hileci.querySelector('img')).toBeNull();
    expect(within(hileci).getByText('Hİ')).toBeInTheDocument();
  });

  it('looks back at the reports already put right or let go, keeping the choice in the address', async () => {
    const api = fakeApi();
    api.reports.list.mockResolvedValue(reportsPage([reportRow()]));
    const { user, router } = renderApp({ path: '/reports', api });

    await screen.findByText('@kerem.35');
    await user.click(screen.getByRole('radio', { name: 'Giderildi' }));

    await waitFor(() => expect(api.reports.list).toHaveBeenLastCalledWith({ status: 'resolved', page: 1 }));
    expect(router.state.location.search).toBe('?status=resolved');
    expect(await screen.findByRole('heading', { name: 'Giderilen bildirimler' })).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Kapatıldı' }));
    await waitFor(() => expect(api.reports.list).toHaveBeenLastCalledWith({ status: 'dismissed', page: 1 }));
  });

  it('counts the players with a report open, on the band and in the menu', async () => {
    const api = fakeApi();
    api.reports.list.mockResolvedValue(reportsPage([reportRow()]));
    renderApp({ path: '/reports', api, counts: { review: 0, reports: 3 } });

    await screen.findByText('@kerem.35');
    await waitFor(() => expect(screen.getByText('Açık bildirimi olan oyuncu').parentElement).toHaveTextContent('3'));
    expect(within(screen.getByRole('link', { name: /Bildirimler/ })).getByText('3')).toBeInTheDocument();
  });

  it('says when nothing waits, in so many words', async () => {
    const api = fakeApi();
    api.reports.list.mockResolvedValue(reportsPage([]));
    renderApp({ path: '/reports', api });

    expect(await screen.findByText('Açık bildirim yok')).toBeInTheDocument();
    expect(screen.getByText('Oyuncular birinin fotoğrafını ya da adını bildirdiğinde burada görünür.')).toBeInTheDocument();
  });

  it('opens nothing for a player who is gone', async () => {
    const api = fakeApi();
    api.reports.list.mockResolvedValue(reportsPage([reportRow({ player: null, avatarUrl: null })]));
    renderApp({ path: '/reports', api });

    expect(await screen.findByText('Silinmiş oyuncu')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).queryByRole('link')).not.toBeInTheDocument();
  });
});
