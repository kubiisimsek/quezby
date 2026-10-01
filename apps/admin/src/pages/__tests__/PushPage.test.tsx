import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { adminSession, pushCampaign } from '@/test/factories';
import { fakeApi, type FakeApi } from '@/test/fake-api';
import { renderApp } from '@/test/render';

function pushApi(campaigns = [pushCampaign()]): FakeApi {
  const api = fakeApi();
  api.push.campaigns.mockResolvedValue({ campaigns });
  return api;
}

describe('PushPage', () => {
  it('lists what was sent — words, languages, who, how far, what Firebase said', async () => {
    renderApp({ path: '/push', api: pushApi() });

    expect(await screen.findByText('Today’s feed is waiting!')).toBeInTheDocument();
    expect(screen.getByText('TR')).toBeInTheDocument();
    expect(screen.getByText('EN')).toBeInTheDocument();
    expect(screen.getByText('Elmas · Bugün Günün akışını oynamadı')).toBeInTheDocument();
    expect(screen.getByText('Bitti')).toBeInTheDocument();
    expect(screen.getByText('2× UNAUTHENTICATED · THIRD_PARTY_AUTH_ERROR')).toBeInTheDocument();
  });

  it('opens a new push from the top right', async () => {
    const api = pushApi();
    api.push.audience.mockResolvedValue({ players: 1, reachable: 1, devices: 1, ios: 1, android: 0, locales: { tr: 1 } });
    const { user } = renderApp({ path: '/push', api });

    await user.click(await screen.findByRole('link', { name: 'Yeni bildirim' }));

    expect(await screen.findByRole('heading', { name: 'Yeni bildirim' })).toBeInTheDocument();
  });

  it('keeps a push going out moving while the page is open', async () => {
    const api = pushApi([pushCampaign({ id: 3, status: 'sending', sent: 0, failed: 0, devices: 150 })]);
    api.push.step
      .mockResolvedValueOnce({ campaign: pushCampaign({ id: 3, status: 'sending', sent: 100, failed: 0, devices: 150 }) })
      .mockResolvedValueOnce({ campaign: pushCampaign({ id: 3, status: 'done', sent: 148, failed: 2, devices: 150 }) });
    renderApp({ path: '/push', api });

    expect(await screen.findByText('Gidiyor')).toBeInTheDocument();
    await waitFor(() => expect(api.push.step).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Bitti')).toBeInTheDocument();
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

  it('says when nothing was sent yet, with the way to the first', async () => {
    renderApp({ path: '/push', api: pushApi([]) });

    const empty = (await screen.findByText('Henüz bildirim gönderilmedi')).closest('section') as HTMLElement;
    expect(within(empty).getByRole('link', { name: 'Yeni bildirim' })).toHaveAttribute('href', '/push/new');
  });

  it('is an owner’s page, the new push too', async () => {
    const api = pushApi();
    renderApp({ path: '/push/new', api, session: adminSession({ role: 'moderator' }) });

    expect(await screen.findByText('Bu sayfayı yalnızca Sahip rolündeki yöneticiler açabilir.')).toBeInTheDocument();
    expect(api.push.audience).not.toHaveBeenCalled();
  });
});
