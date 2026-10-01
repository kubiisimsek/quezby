import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { describeFilters, filtersOf } from '@/pages/PushPage';
import { adminSession, pushCampaign } from '@/test/factories';
import { fakeApi, type FakeApi } from '@/test/fake-api';
import { renderApp } from '@/test/render';

const AUDIENCE = { players: 120, reachable: 80, devices: 95, ios: 40, android: 55 };

function pushApi(campaigns = [pushCampaign()]): FakeApi {
  const api = fakeApi();
  api.push.audience.mockResolvedValue(AUDIENCE);
  api.push.campaigns.mockResolvedValue({ campaigns });
  return api;
}

describe('PushPage', () => {
  it('counts who the filters pick, asked again as they change', async () => {
    const api = pushApi();
    const { user } = renderApp({ path: '/push', api });

    expect(await screen.findByText('Push alabilecek oyuncu')).toBeInTheDocument();
    await waitFor(() => expect(api.push.audience).toHaveBeenCalledWith({}));
    expect(await screen.findByText('iOS 40 · Android 55')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Elmas' }));
    await user.click(screen.getByRole('checkbox', { name: 'Ligi yok' }));
    await user.click(screen.getByRole('radio', { name: 'Oynamadı' }));
    await user.click(screen.getByRole('combobox', { name: 'Son oyun' }));
    await user.click(await screen.findByRole('option', { name: '7 gündür oynamadı' }));
    await user.click(screen.getByRole('radio', { name: 'iOS' }));
    await user.click(screen.getByRole('checkbox', { name: 'Almanca' }));
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
  });

  it('sends after asking, to as many phones as it says', async () => {
    const api = pushApi([]);
    api.push.send.mockResolvedValue({ campaign: pushCampaign({ id: 9, status: 'done' }) });
    const { user } = renderApp({ path: '/push', api });

    const send = await screen.findByRole('button', { name: '95 cihaza gönder' });
    expect(send).toBeDisabled();
    await user.type(screen.getByLabelText('Mesaj'), 'Bugünün akışı seni bekliyor!');
    await user.click(send);

    const dialog = await screen.findByRole('dialog', { name: '80 oyuncunun 95 cihazına gönderilsin mi?' });
    await user.click(within(dialog).getByRole('button', { name: 'Gönder' }));

    await waitFor(() =>
      expect(api.push.send).toHaveBeenCalledWith({ title: 'Quezby', body: 'Bugünün akışı seni bekliyor!', filters: {} }),
    );
    expect(await screen.findByText('52 cihaza gidiyor')).toBeInTheDocument();
  });

  it('lists what was sent, and keeps a push going out moving while the page is open', async () => {
    const api = pushApi([pushCampaign({ id: 3, status: 'sending', sent: 0, failed: 0, devices: 150 })]);
    api.push.step
      .mockResolvedValueOnce({ campaign: pushCampaign({ id: 3, status: 'sending', sent: 100, failed: 0, devices: 150 }) })
      .mockResolvedValueOnce({ campaign: pushCampaign({ id: 3, status: 'done', sent: 148, failed: 2, devices: 150 }) });
    renderApp({ path: '/push', api });

    expect(await screen.findByText('Gidiyor')).toBeInTheDocument();
    await waitFor(() => expect(api.push.step).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Bitti')).toBeInTheDocument();
    expect(screen.getByText('148')).toBeInTheDocument();
    expect(api.push.step).toHaveBeenCalledWith(3);
  });

  it('stops a push going out', async () => {
    const api = pushApi([pushCampaign({ id: 3, status: 'sending', sent: 0, failed: 0 })]);
    api.push.step.mockReturnValue(new Promise(() => {}));
    api.push.stop.mockResolvedValue({ campaign: pushCampaign({ id: 3, status: 'stopped', sent: 0, failed: 0 }) });
    const { user } = renderApp({ path: '/push', api });

    await user.click(await screen.findByRole('button', { name: 'Durdur' }));

    await waitFor(() => expect(api.push.stop).toHaveBeenCalledWith(3));
    expect(await screen.findByText('Durduruldu')).toBeInTheDocument();
  });

  it('is an owner’s page', async () => {
    const api = pushApi();
    renderApp({ path: '/push', api, session: adminSession({ role: 'moderator' }) });

    expect(await screen.findByText('Bu sayfayı yalnızca Sahip rolündeki yöneticiler açabilir.')).toBeInTheDocument();
    expect(api.push.audience).not.toHaveBeenCalled();
  });
});

describe('push filters', () => {
  it('leaves out what was not chosen', () => {
    expect(
      filtersOf({ username: ' @Ayse ', tiers: [], daily: 'any', played: 'within:3', joined: '30', platform: 'any', locales: [], account: 'any' }),
    ).toEqual({ username: 'Ayse', playedWithinDays: 3, joinedWithinDays: 30 });
  });

  it('says them in words', () => {
    expect(describeFilters({})).toBe('Herkes');
    expect(describeFilters({ tiers: ['diamond', 'none'], daily: 'not_played', platform: 'android', locales: ['tr'] })).toBe(
      'Elmas, Ligi yok · Bugün Günün akışını oynamadı · Android · Türkçe',
    );
  });
});
