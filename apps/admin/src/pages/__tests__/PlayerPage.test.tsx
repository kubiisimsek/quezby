import { ApiError } from '@quezby/sdk/admin';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { adminSession, AVATAR_URL, playerActivity, playerResponse, playersPage } from '@/test/factories';
import { fakeApi } from '@/test/fake-api';
import { renderApp } from '@/test/render';

const ID = '01jplayer00000000000000000a';

function withPlayer(response = playerResponse()) {
  const api = fakeApi();
  api.players.get.mockResolvedValue(response);
  return api;
}

describe('PlayerPage', () => {
  it('shows who the player is and what they played', async () => {
    renderApp({ path: `/players/${ID}`, api: withPlayer() });

    expect(await screen.findByRole('heading', { name: '@kerem.35' })).toBeInTheDocument();
    expect(screen.getByText('Sezon 2 rekoru')).toBeInTheDocument();
    expect(screen.getAllByText('250.311').length).toBeGreaterThan(0);
    expect(screen.getByText('Altın · 4/28')).toBeInTheDocument();
    expect(screen.getByText('×2,5')).toBeInTheDocument();
    expect(screen.getByText('Makine gibi ritim')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tüm turları' })).toHaveAttribute('href', `/runs?player=${ID}`);
  });

  it('says the language the player plays in, in Turkish', async () => {
    renderApp({ path: `/players/${ID}`, api: withPlayer(playerResponse({}, { locale: 'de' })) });

    const fact = (await screen.findByText('Dil')).closest('div');
    expect(fact).not.toBeNull();
    expect(within(fact as HTMLElement).getByText('Almanca')).toBeInTheDocument();
  });

  it('bans with a reason, and says so', async () => {
    const api = withPlayer();
    api.players.ban.mockResolvedValue({ changed: true });
    const { user } = renderApp({ path: `/players/${ID}`, api });

    await user.click(await screen.findByRole('button', { name: 'İşlemler' }));
    await user.click(await screen.findByRole('menuitem', { name: /Yasakla/ }));
    const dialog = await screen.findByRole('dialog', { name: '@kerem.35 yasaklansın mı?' });
    await user.type(within(dialog).getByLabelText('Sebep'), 'Hız hilesi');
    await user.click(within(dialog).getByRole('button', { name: 'Yasakla' }));

    await waitFor(() => expect(api.players.ban).toHaveBeenCalledWith(ID, { reason: 'Hız hilesi' }));
    expect(await screen.findByText('Oyuncu yasaklandı')).toBeInTheDocument();
  });

  it('resets a name with a reason, saying the player gets one more pick, and shows the new name', async () => {
    const api = withPlayer();
    api.players.rename.mockResolvedValue({ changed: true, username: 'guest00000007' });
    const { user } = renderApp({ path: `/players/${ID}`, api });

    await user.click(await screen.findByRole('button', { name: 'İşlemler' }));
    await user.click(await screen.findByRole('menuitem', { name: /Adı sıfırla/ }));
    const dialog = await screen.findByRole('dialog', { name: '@kerem.35 adı sıfırlansın mı?' });
    expect(within(dialog).getByText(/Kendine bir kez daha ad seçebilir; o ad da kalıcıdır\./)).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Sebep'), 'Küfürlü ad');
    await user.click(within(dialog).getByRole('button', { name: 'Adı sıfırla' }));

    await waitFor(() => expect(api.players.rename).toHaveBeenCalledWith(ID, { reason: 'Küfürlü ad' }));
    expect(await screen.findByText('Ad sıfırlandı')).toBeInTheDocument();
    expect(await screen.findByText('Yeni adı: @guest00000007')).toBeInTheDocument();
  });

  it('shows the API\'s problem with a reason under the reason', async () => {
    const api = withPlayer();
    api.players.ban.mockRejectedValue(new ApiError(422, 'validation_failed', 'x', { reason: ['Sebep en az 3 karakter olmalı.'] }));
    const { user } = renderApp({ path: `/players/${ID}`, api });

    await user.click(await screen.findByRole('button', { name: 'İşlemler' }));
    await user.click(await screen.findByRole('menuitem', { name: /Yasakla/ }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Sebep'), 'ab');
    await user.click(within(dialog).getByRole('button', { name: 'Yasakla' }));

    expect(await within(dialog).findByText('Sebep en az 3 karakter olmalı.')).toBeInTheDocument();
  });

  it('offers to lift a ban instead, and shows why the player was banned', async () => {
    const api = withPlayer(playerResponse({ best: null, league: null }, { bannedAt: '2026-09-24T10:00:00.000Z', banReason: 'Bot gibi oynuyor' }));
    api.players.unban.mockResolvedValue({ changed: true });
    const { user } = renderApp({ path: `/players/${ID}`, api });

    expect(await screen.findByText('Bot gibi oynuyor')).toBeInTheDocument();
    expect(screen.getByText('Yasaklıyken tablolarda yer almaz; yasak kalkınca geri gelir.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'İşlemler' }));
    await user.click(await screen.findByRole('menuitem', { name: /Yasağı kaldır/ }));
    await user.click(await screen.findByRole('button', { name: 'Yasağı kaldır' }));

    await waitFor(() => expect(api.players.unban).toHaveBeenCalledWith(ID));
  });

  it('cannot sign a guest out, and says why', async () => {
    const { user } = renderApp({
      path: `/players/${ID}`,
      api: withPlayer(playerResponse({}, { isGuest: true, email: null, identities: [], identityDetails: [] })),
    });

    await user.click(await screen.findByRole('button', { name: 'İşlemler' }));
    const item = await screen.findByRole('menuitem', { name: /Oturumları kapat/ });
    expect(item).toHaveAttribute('data-disabled');
    expect(item).toHaveTextContent('Misafirde yapılamaz: hesap kaybolur');
  });

  it('lets only an owner delete, after the name is typed, then leaves the page', async () => {
    const api = withPlayer();
    api.players.remove.mockResolvedValue(undefined);
    api.players.list.mockResolvedValue(playersPage([]));
    const { user, router } = renderApp({ path: `/players/${ID}`, api });

    await user.click(await screen.findByRole('button', { name: 'İşlemler' }));
    await user.click(await screen.findByRole('menuitem', { name: /Hesabı sil/ }));
    const dialog = await screen.findByRole('dialog', { name: '@kerem.35 hesabı silinsin mi?' });
    await user.type(within(dialog).getByLabelText('Sebep'), 'Oyuncu istedi');
    await user.type(within(dialog).getByLabelText('Onaylamak için “kerem.35” yaz'), 'kerem.35');
    await user.click(within(dialog).getByRole('button', { name: 'Hesabı sil' }));

    await waitFor(() => expect(api.players.remove).toHaveBeenCalledWith(ID, { reason: 'Oyuncu istedi', confirm: 'kerem.35' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/players'));
  });

  it('shows a moderator no delete, and a viewer no actions at all', async () => {
    const { unmount, user } = renderApp({ path: `/players/${ID}`, api: withPlayer(), session: adminSession({ role: 'moderator' }) });
    await user.click(await screen.findByRole('button', { name: 'İşlemler' }));
    expect(await screen.findByRole('menuitem', { name: /Yasakla/ })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /Hesabı sil/ })).not.toBeInTheDocument();
    unmount();

    renderApp({ path: `/players/${ID}`, api: withPlayer(), session: adminSession({ role: 'viewer' }) });
    expect(await screen.findByRole('heading', { name: '@kerem.35' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'İşlemler' })).not.toBeInTheDocument();
  });

  it('says so when there is no such player', async () => {
    const api = fakeApi();
    api.players.get.mockRejectedValue(new ApiError(404, 'not_found', 'Aradığın şey bulunamadı.'));
    renderApp({ path: `/players/${ID}`, api });

    expect(await screen.findByText('Böyle bir oyuncu yok')).toBeInTheDocument();
  });

  it('says in the account whether the player said yes to usage analytics', async () => {
    renderApp({ path: `/players/${ID}`, api: withPlayer() });

    expect((await screen.findByText('Kullanım verisi', { selector: 'dt' })).parentElement).toHaveTextContent('İzinli · 20 Eyl 2026');
  });

  it('shows the player\'s days, visits and firsts on its own tab, asked for only then', async () => {
    const api = withPlayer();
    api.players.activity.mockResolvedValue(playerActivity());
    const { user } = renderApp({ path: `/players/${ID}`, api });

    await screen.findByRole('heading', { name: '@kerem.35' });
    expect(api.players.activity).not.toHaveBeenCalled();
    await user.click(screen.getByRole('tab', { name: /Etkinlik/ }));

    expect(await screen.findByRole('list', { name: 'Son 30 günün etkinliği' })).toBeInTheDocument();
    expect(api.players.activity).toHaveBeenCalledWith(ID);
    expect(screen.getByText('Aktif gün', { selector: 'dt' }).parentElement).toHaveTextContent('3 / 30');
    expect(screen.getByText('Ortalama ziyaret', { selector: 'dt' }).parentElement).toHaveTextContent('6 dk 15 sn');
    expect(screen.getByText('Son ziyaretler')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Yolculuk' })).getByText('Turu paylaştı')).toBeInTheDocument();
    expect(screen.getByText('Yolculuk yok')).toBeInTheDocument();
    expect(screen.getByText('Deneme turunu bitirdi', { selector: 'dt' })).toBeInTheDocument();
  });

  it('says why a player\'s activity is not kept', async () => {
    const api = withPlayer();
    api.players.activity.mockResolvedValue(playerActivity({ status: 'no_consent', consentAt: null, visits: [] }));
    const { user } = renderApp({ path: `/players/${ID}`, api });

    await user.click(await screen.findByRole('tab', { name: /Etkinlik/ }));

    expect(await screen.findByText('İzin vermedi')).toBeInTheDocument();
    expect(screen.getByText('Bu oyuncunun ziyareti tutulmuyor.')).toBeInTheDocument();
  });

  it('lists the phones the player used, with the other accounts seen on them', async () => {
    const { user } = renderApp({ path: `/players/${ID}`, api: withPlayer() });

    await user.click(await screen.findByRole('tab', { name: /Cihazlar/ }));

    expect(await screen.findByText('Cihaz kaydı')).toBeInTheDocument();
    expect(screen.getByText('iPhone 15 Pro')).toBeInTheDocument();
    expect(screen.getByText('1.0.0 (42)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '@kerem.yedek' })).toHaveAttribute('href', '/players/01jplayer00000000000000000b');
  });

  it('shows the player\'s photo, their friends and how many blocked them', async () => {
    const { container } = renderApp({
      path: `/players/${ID}`,
      api: withPlayer(playerResponse({ social: { friends: 7, blockedBy: 2 } }, { avatarUrl: AVATAR_URL })),
    });

    expect(await screen.findByRole('img', { name: '@kerem.35 profil fotoğrafı' })).toHaveAttribute('src', AVATAR_URL);
    expect(container.querySelector('header img')).toHaveAttribute('src', AVATAR_URL);
    expect(screen.getByRole('link', { name: 'Tam boyutta aç' })).toHaveAttribute('href', AVATAR_URL);
    expect(screen.getByText('Arkadaş', { selector: 'dt' }).parentElement).toHaveTextContent('7');
    expect(screen.getByText('Engelleyen', { selector: 'dt' }).parentElement).toHaveTextContent('2');
    expect(screen.getByText('Onu engelleyen oyuncular: bakmaya değer bir işaret.')).toBeInTheDocument();
    expect(screen.queryByText('Takip')).not.toBeInTheDocument();
  });

  it('wears initials without a photo, and has no photo to take down', async () => {
    const { container, user } = renderApp({ path: `/players/${ID}`, api: withPlayer() });

    await screen.findByRole('heading', { name: '@kerem.35' });
    expect(container.querySelector('header img')).toBeNull();
    expect(screen.queryByText('Profil fotoğrafı')).not.toBeInTheDocument();
    expect(screen.queryByText('Açık bildirimler')).not.toBeInTheDocument();
    expect(screen.getByText('Açık bildirim', { selector: 'dt' }).parentElement).toHaveTextContent('0');

    await user.click(screen.getByRole('button', { name: 'İşlemler' }));
    await screen.findByRole('menuitem', { name: /Adı sıfırla/ });
    expect(screen.queryByRole('menuitem', { name: /Fotoğrafı kaldır/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /Bildirimleri kapat/ })).not.toBeInTheDocument();
  });

  it('lets a moderator take a photo down with a reason, closing the reports about it', async () => {
    const api = withPlayer(playerResponse({ openReports: { photo: 2, name: 0 } }, { avatarUrl: AVATAR_URL }));
    api.players.removeAvatar.mockResolvedValue({ changed: true });
    const { user } = renderApp({ path: `/players/${ID}`, api, session: adminSession({ role: 'moderator' }) });

    await user.click(await screen.findByRole('button', { name: 'İşlemler' }));
    await user.click(await screen.findByRole('menuitem', { name: /Fotoğrafı kaldır/ }));
    const dialog = await screen.findByRole('dialog', { name: '@kerem.35 fotoğrafı kaldırılsın mı?' });
    expect(within(dialog).getByText(/Fotoğraf hakkındaki açık bildirimler kapanır\./)).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Sebep')).toBeRequired();
    await user.type(within(dialog).getByLabelText('Sebep'), 'Uygunsuz fotoğraf');
    await user.click(within(dialog).getByRole('button', { name: 'Fotoğrafı kaldır' }));

    await waitFor(() => expect(api.players.removeAvatar).toHaveBeenCalledWith(ID, { reason: 'Uygunsuz fotoğraf' }));
    expect(await screen.findByText('Fotoğraf kaldırıldı')).toBeInTheDocument();
  });

  it('takes no photo down without a reason: the API\'s word shows under it', async () => {
    const api = withPlayer(playerResponse({}, { avatarUrl: AVATAR_URL }));
    api.players.removeAvatar.mockRejectedValue(new ApiError(422, 'validation_failed', 'x', { reason: ['Sebep alanı gereklidir.'] }));
    const { user } = renderApp({ path: `/players/${ID}`, api });

    const photo = (await screen.findByRole('heading', { name: 'Profil fotoğrafı' })).closest('section') as HTMLElement;
    await user.click(within(photo).getByRole('button', { name: 'Fotoğrafı kaldır' }));
    const dialog = await screen.findByRole('dialog', { name: '@kerem.35 fotoğrafı kaldırılsın mı?' });
    await user.click(within(dialog).getByRole('button', { name: 'Fotoğrafı kaldır' }));

    expect(await within(dialog).findByText('Sebep alanı gereklidir.')).toBeInTheDocument();
    expect(api.players.removeAvatar).toHaveBeenCalledWith(ID, { reason: '' });
    expect(screen.getByRole('dialog', { name: '@kerem.35 fotoğrafı kaldırılsın mı?' })).toBeInTheDocument();
  });

  it('lists the open reports and lets them go with a reason', async () => {
    const api = withPlayer(playerResponse({ openReports: { photo: 1, name: 2 } }));
    api.players.dismissReports.mockResolvedValue({ changed: true });
    const { user } = renderApp({ path: `/players/${ID}`, api });

    const reports = (await screen.findByRole('heading', { name: 'Açık bildirimler' })).closest('section') as HTMLElement;
    expect(within(reports).getByText('Fotoğraf', { selector: 'dt' }).parentElement).toHaveTextContent('1 bildirim');
    expect(within(reports).getByText('Kullanıcı adı', { selector: 'dt' }).parentElement).toHaveTextContent('2 bildirim');
    expect(screen.getByText('Açık bildirim', { selector: 'dt' }).parentElement).toHaveTextContent('3');

    await user.click(within(reports).getByRole('button', { name: 'Bildirimleri kapat' }));
    const dialog = await screen.findByRole('dialog', { name: '@kerem.35 hakkındaki bildirimler kapatılsın mı?' });
    expect(within(dialog).getByText('Açık bildirimler işlem yapılmadan kapanır; fotoğraf ve ad olduğu gibi kalır.')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Sebep'), 'Kurallara uygun');
    await user.click(within(dialog).getByRole('button', { name: 'Bildirimleri kapat' }));

    await waitFor(() => expect(api.players.dismissReports).toHaveBeenCalledWith(ID, { reason: 'Kurallara uygun' }));
    expect(await screen.findByText('Bildirimler kapatıldı')).toBeInTheDocument();
  });

  it('offers a moderator the photo and the reports in the menu too', async () => {
    const { user } = renderApp({
      path: `/players/${ID}`,
      api: withPlayer(playerResponse({ openReports: { photo: 0, name: 1 } }, { avatarUrl: AVATAR_URL })),
      session: adminSession({ role: 'moderator' }),
    });

    await user.click(await screen.findByRole('button', { name: 'İşlemler' }));
    expect(await screen.findByRole('menuitem', { name: /Fotoğrafı kaldır/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Bildirimleri kapat/ })).toBeInTheDocument();
  });

  it('shows a viewer the photo and the reports, but nothing to do about them', async () => {
    renderApp({
      path: `/players/${ID}`,
      api: withPlayer(playerResponse({ openReports: { photo: 1, name: 2 } }, { avatarUrl: AVATAR_URL })),
      session: adminSession({ role: 'viewer' }),
    });

    expect(await screen.findByRole('img', { name: '@kerem.35 profil fotoğrafı' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Açık bildirimler' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fotoğrafı kaldır' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bildirimleri kapat' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'İşlemler' })).not.toBeInTheDocument();
  });
});

