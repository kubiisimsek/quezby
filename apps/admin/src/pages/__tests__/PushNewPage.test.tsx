import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { pushCampaign } from '@/test/factories';
import { fakeApi, type FakeApi } from '@/test/fake-api';
import { renderApp } from '@/test/render';

const AUDIENCE = { players: 120, reachable: 80, devices: 95, ios: 40, android: 55, locales: { tr: 60, en: 20, de: 15 } };

function pushApi(): FakeApi {
  const api = fakeApi();
  api.push.audience.mockResolvedValue(AUDIENCE);
  api.push.campaigns.mockResolvedValue({ campaigns: [] });
  return api;
}

describe('PushNewPage', () => {
  it('puts the words first, with how they look on a lock screen', async () => {
    const { user } = renderApp({ path: '/push/new', api: pushApi() });

    const words = await screen.findByLabelText('Mesaj');
    await user.type(words, 'Bugünün akışı seni bekliyor!');

    const preview = screen.getByRole('figure', { name: 'Kilit ekranında görünüşü' });
    expect(within(preview).getByText('Bugünün akışı seni bekliyor!')).toBeInTheDocument();
    expect(within(preview).getByText('Quezby', { selector: 'p' })).toBeInTheDocument();
  });

  it('keeps the filters folded, each saying what it holds, and counts as they change', async () => {
    const api = pushApi();
    const { user } = renderApp({ path: '/push/new', api });

    const filters = within((await screen.findByRole('heading', { name: 'Kime' })).closest('section') as HTMLElement);
    const tiers = filters.getByRole('button', { name: /Lig \(Dereceli\)/ });
    expect(tiers).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('checkbox', { name: 'Elmas' })).not.toBeInTheDocument();
    await waitFor(() => expect(api.push.audience).toHaveBeenCalledWith({}));

    await user.click(tiers);
    await user.click(screen.getByRole('checkbox', { name: 'Elmas' }));
    await user.click(screen.getByRole('checkbox', { name: 'Ligi yok' }));
    expect(tiers).toHaveTextContent('Elmas, Ligi yok');

    await user.click(filters.getByRole('button', { name: /Bugünkü Günün akışı/ }));
    await user.click(screen.getByRole('radio', { name: 'Oynamadı' }));
    await user.click(filters.getByRole('button', { name: /^Son oyun/ }));
    await user.click(screen.getByRole('combobox', { name: 'Son oyun' }));
    await user.click(await screen.findByRole('option', { name: '7 gündür oynamadı' }));
    await user.click(filters.getByRole('button', { name: /^Telefon/ }));
    await user.click(screen.getByRole('radio', { name: 'iOS' }));
    await user.click(filters.getByRole('button', { name: /^Dil/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Almanca' }));
    await user.click(filters.getByRole('button', { name: /^Hesap/ }));
    await user.click(screen.getByRole('radio', { name: 'Misafir' }));

    await waitFor(() =>
      expect(api.push.audience).toHaveBeenLastCalledWith({
        tiers: ['diamond', 'none'],
        daily: 'not_played',
        notPlayedForDays: 7,
        platform: 'ios',
        locales: ['de'],
        account: 'guest',
      }),
    );
    expect(screen.getByText('6 filtre')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Temizle' }));
    expect(screen.queryByText('6 filtre')).not.toBeInTheDocument();
    expect(tiers).toHaveTextContent('Fark etmez');
  });

  it('previews before sending, in each language written, then sends and goes back to the list', async () => {
    const api = pushApi();
    api.push.send.mockResolvedValue({ campaign: pushCampaign({ id: 9, devices: 95, status: 'sending', sent: 0, failed: 0 }) });
    api.push.step.mockReturnValue(new Promise(() => {}));
    const { user } = renderApp({ path: '/push/new', api });

    const send = await screen.findByRole('button', { name: 'Önizle ve gönder' });
    expect(send).toBeDisabled();
    await user.type(screen.getByLabelText('Mesaj'), 'Bugünün akışı seni bekliyor!');
    await user.click(screen.getByRole('tab', { name: 'İngilizce' }));
    expect(screen.getByText('· bu dilde 20 cihaz', { exact: false })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Mesaj'), 'Today’s feed is waiting!');
    expect(screen.getByRole('tab', { name: 'Türkçe, yazıldı' })).toBeInTheDocument();
    expect(screen.getByText('Yazılmamış dillerdeki 15 cihaz bu dili alır.')).toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: 'Çevirisi olmayanlara' }));
    await user.click(await screen.findByRole('option', { name: 'İngilizce' }));

    await user.click(send);
    const dialog = await screen.findByRole('dialog', { name: 'Gönderilmeden önce' });
    expect(within(dialog).getByText('Today’s feed is waiting!')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('radio', { name: 'Türkçe · 60' }));
    expect(within(dialog).getByText('Bugünün akışı seni bekliyor!')).toBeInTheDocument();
    expect(within(dialog).getByText('İngilizce alır · 15 cihaz')).toBeInTheDocument();
    expect(api.push.send).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: '95 cihaza gönder' }));
    await waitFor(() =>
      expect(api.push.send).toHaveBeenCalledWith({
        messages: { tr: { title: 'Quezby', body: 'Bugünün akışı seni bekliyor!' }, en: { title: 'Quezby', body: 'Today’s feed is waiting!' } },
        fallback: 'en',
        filters: {},
      }),
    );
    expect(await screen.findByRole('heading', { name: 'Push bildirimleri' })).toBeInTheDocument();
  });
});
