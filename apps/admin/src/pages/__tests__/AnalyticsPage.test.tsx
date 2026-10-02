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
  });

  it('splits the phones into a table per system and per maker, the app versions under every row', async () => {
    const api = fakeApi();
    api.analytics.get.mockResolvedValue(analytics());
    renderApp({ path: '/analytics', api });
    const table = async (title: string) => (await screen.findByRole('heading', { name: title })).closest('section') as HTMLElement;

    expect(await screen.findByText('Son 7 günde görülen 300 telefon; izin aranmaz.')).toBeInTheDocument();
    const ios = await table('iOS');
    expect(within(ios).getByText('200 telefon · %66,7')).toBeInTheDocument();
    expect(within(ios).getByRole('table', { name: 'iOS' })).toBeInTheDocument();
    const ios18 = within(ios).getByText('iOS 18').closest('tr');
    expect(ios18).toHaveTextContent('Uygulama 1.0.0 (170) · 0.9.0 (10)');
    expect(ios18).toHaveTextContent('180');
    expect(ios18).toHaveTextContent('%90');
    expect(within(await table('Android')).getByText('Android 14')).toBeInTheDocument();

    // Apple's phones are the iPhones; a row names three versions and counts the phones on the rest.
    const iphone = await table('iPhone');
    expect(within(iphone).getByText('iPhone 15 Pro').closest('tr')).toHaveTextContent('Uygulama 1.0.0 (80) · 0.9.0 (6) · bilinmiyor (2) · diğer (2)');
    expect(within(iphone).getByText('Listede olmayanlar: 110 telefon')).toBeInTheDocument();
    expect(within(await table('Samsung')).getByText('SM-S918B')).toBeInTheDocument();
    expect(within(await table('Markası bilinmeyen')).getByText('Uygulamanın eski sürümü markayı göndermiyor.')).toBeInTheDocument();

    const others = within(await table('Diğer markalar')).getAllByRole('row').slice(1);
    expect(others).toHaveLength(2);
    expect(others[0]).toHaveTextContent('Xiaomi');
    expect(others[1]).toHaveTextContent('Google');
  });

  it('says so when no phone was seen this week', async () => {
    const api = fakeApi();
    api.analytics.get.mockResolvedValue(
      analytics({ devices: { total: 0, platforms: [], brands: [], otherBrands: { devices: 0, share: 0, rows: [], rest: 0 } } }),
    );
    renderApp({ path: '/analytics', api });

    expect(await screen.findByText('Son 7 günde görülen telefon yok.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'iOS' })).toBeNull();
  });

  it('shows what analytics keeps, layer by layer, at the foot of the page', async () => {
    const api = fakeApi();
    api.analytics.get.mockResolvedValue(analytics());
    renderApp({ path: '/analytics', api });

    const storage = (await screen.findByRole('heading', { name: 'Veri hacmi' })).closest('section') as HTMLElement;
    const layer = (name: string) => within(storage).getByText(name).closest('tr');
    expect(layer('Ziyaretler')).toHaveTextContent('5.400');
    expect(layer('Ziyaretler')).toHaveTextContent('30 gün');
    expect(layer('Günlük toplamlar')).toHaveTextContent('Süresiz; günde birkaç düzine satır');
    expect(layer('Cihaz kaydı')).toHaveTextContent('180 gün görülmeyen silinir');
    expect(layer('İlkler')).toHaveTextContent('700');
    expect(within(storage).getByText(/Son 7 günde geri çevrilen/)).toHaveTextContent('Son 7 günde geri çevrilen: 4.');
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
