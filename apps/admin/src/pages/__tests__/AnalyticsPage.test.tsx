import { ApiError } from '@quezby/sdk/admin';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { analytics } from '@/test/factories';
import { fakeApi } from '@/test/fake-api';
import { renderApp } from '@/test/render';

describe('AnalyticsPage', () => {
  it('shows who is here now, today and over the month, as the API counts them', async () => {
    const api = fakeApi();
    api.analytics.get.mockResolvedValue(analytics());
    renderApp({ path: '/analytics', api });

    expect((await screen.findByText('Şu an bağlı')).parentElement).toHaveTextContent('17');
    expect(api.analytics.get).toHaveBeenCalledWith({ days: 30 });
    expect(screen.getByText('Bugün aktif').parentElement).toHaveTextContent('69');
    expect(screen.getByText('7 günde aktif').parentElement).toHaveTextContent('240');
    expect(screen.getByText('30 günde aktif').parentElement).toHaveTextContent('610');
    expect(screen.getByText('Yapışkanlık').parentElement).toHaveTextContent('%11,3');
    expect(screen.getByText('İzin veren %75')).toBeInTheDocument();
    expect(screen.getByText('Yeni oyuncuda izin').parentElement?.parentElement).toHaveTextContent('%85');
    expect(screen.getByText('4 dk 29 sn')).toBeInTheDocument();
  });

  it('stacks the returning players and the new ones, the new ones green', async () => {
    const api = fakeApi();
    api.analytics.get.mockResolvedValue(analytics());
    renderApp({ path: '/analytics', api });

    const chart = (await screen.findByRole('table', { name: 'Günlük aktif oyuncular' })).closest('figure');
    expect(chart?.querySelectorAll('rect.fill-secondary')).toHaveLength(30);
    expect(chart?.querySelector('rect.fill-ok')).not.toBeNull();
    expect(chart?.querySelector('.fill-primary')).toBeNull();
    expect(screen.getByRole('table', { name: 'Günlük ziyaretler' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Günlük dakikalar' })).toBeInTheDocument();
  });

  it('follows each week back and walks the newcomers through their first steps', async () => {
    const api = fakeApi();
    api.analytics.get.mockResolvedValue(analytics());
    renderApp({ path: '/analytics', api });

    const retention = await screen.findByRole('table', { name: 'Haftalık geri dönüş' });
    const week = within(retention).getAllByRole('row')[2];
    expect(week).toHaveTextContent('%45');
    expect(week).toHaveTextContent('%30');
    expect(week).toHaveTextContent('%15');
    expect(week).toHaveTextContent('—');

    const steps = screen.getByRole('list', { name: 'İlk adımlar' });
    expect(within(steps).getAllByRole('listitem')).toHaveLength(7);
    expect(within(steps).getByText('Deneme turunu bitirdi').closest('li')).toHaveTextContent('150 · %88,2');
    expect(within(steps).getByText('Ertesi gün döndü').closest('li')).toHaveTextContent('%43,8');
  });

  it('names the screens, the moments and the phones in words', async () => {
    const api = fakeApi();
    api.analytics.get.mockResolvedValue(analytics());
    renderApp({ path: '/analytics', api });

    expect(within(await screen.findByRole('list', { name: 'Ekranlar' })).getByText('Zirve')).toBeInTheDocument();
    expect(screen.getByText('Turu paylaştı').parentElement).toHaveTextContent('40');
    expect(screen.getByText('Gönderilemeyen tur')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Uygulama sürümleri' })).getByText('iOS 1.0.0').closest('li')).toHaveTextContent('200 · %66,7');
    expect(within(screen.getByRole('list', { name: 'Sistemler' })).getByText('Android 14')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Modeller' })).getByText('Pixel 8')).toBeInTheDocument();
  });

  it('shows what analytics keeps, so its growth is plain', async () => {
    const api = fakeApi();
    api.analytics.get.mockResolvedValue(analytics());
    renderApp({ path: '/analytics', api });

    expect((await screen.findByText('Ziyaretler', { selector: 'dt' })).parentElement).toHaveTextContent('5.400 satır');
    expect(screen.getByText('30 gün tutulur')).toBeInTheDocument();
    expect(screen.getByText('Süresiz; günde birkaç düzine satır')).toBeInTheDocument();
    expect(screen.getByText('Geri çevrilen', { selector: 'dt' }).parentElement).toHaveTextContent('4');
  });

  it('covers ninety days when asked, from the address bar', async () => {
    const api = fakeApi();
    api.analytics.get.mockResolvedValue(analytics());
    const { user, router } = renderApp({ path: '/analytics', api });

    await user.click(await screen.findByRole('radio', { name: 'Son 90 gün' }));

    await waitFor(() => expect(api.analytics.get).toHaveBeenLastCalledWith({ days: 90 }));
    expect(router.state.location.search).toBe('?days=90');
  });

  it('says when analytics is switched off, and when only a share is kept', async () => {
    const api = fakeApi();
    api.analytics.get.mockResolvedValue(analytics({ collecting: { enabled: false, sample: 250 } }));
    renderApp({ path: '/analytics', api });

    expect(await screen.findByText('Analitik kapalı')).toBeInTheDocument();
    expect(screen.getByText('Örneklem %25')).toBeInTheDocument();
  });

  it('says so when nobody has been followed from their first day yet', async () => {
    const api = fakeApi();
    api.analytics.get.mockResolvedValue(
      analytics({
        retention: [{ week: '2026-W40', players: 0, d1: null, d3: null, d7: null, d14: null, d30: null }],
        funnel: [{ step: 'joined', players: 0, rate: null }],
        screens: [],
        events: [],
      }),
    );
    renderApp({ path: '/analytics', api });

    expect(await screen.findByText('Henüz ilk gününden izlenen yeni oyuncu yok.')).toBeInTheDocument();
    expect(screen.getByText('Bu dönemde ilk gününden izlenen yeni oyuncu yok.')).toBeInTheDocument();
    expect(screen.getByText('Henüz ekran sayılmadı.')).toBeInTheDocument();
  });

  it('shows a failure in place of the page', async () => {
    const api = fakeApi();
    api.analytics.get.mockRejectedValue(new ApiError(0, 'network', 'x'));
    renderApp({ path: '/analytics', api });

    expect(await screen.findByText('Sunucuya ulaşılamadı. Bağlantını kontrol et.')).toBeInTheDocument();
  });
});
