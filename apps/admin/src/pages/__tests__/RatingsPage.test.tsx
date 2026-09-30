import { ApiError } from '@quezby/sdk/admin';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { calibration, ratingsOverview } from '@/test/factories';
import { fakeApi } from '@/test/fake-api';
import { renderApp } from '@/test/render';

function withRatings({ overview = ratingsOverview(), fit = calibration() } = {}) {
  const api = fakeApi();
  api.ratings.get.mockResolvedValue(overview);
  api.ratings.calibration.mockResolvedValue(fit);
  return api;
}

describe('RatingsPage', () => {
  it('is on the menu', async () => {
    renderApp({ path: '/ratings', api: withRatings() });

    const link = await screen.findByRole('link', { name: 'Reytingler' });
    expect(link).toHaveAttribute('href', '/ratings');
    expect(link).toHaveAttribute('aria-current', 'page');
  });

  it('shows how many sit in each league, the highest first, and how many of them played lately', async () => {
    renderApp({ path: '/ratings', api: withRatings() });

    expect((await screen.findByText('Yerleşmede')).nextElementSibling).toHaveTextContent('57');
    expect(screen.getByText('Lider reyting').nextElementSibling).toHaveTextContent('5.120');
    expect(screen.getByText('Sezon').nextElementSibling).toHaveTextContent('2');

    const hints = screen.getAllByText(/ son 14 günde oynadı$/).map((hint) => hint.textContent);
    expect(hints).toEqual([
      '2 son 14 günde oynadı',
      '10 son 14 günde oynadı',
      '50 son 14 günde oynadı',
      '150 son 14 günde oynadı',
      '200 son 14 günde oynadı',
      '40 son 14 günde oynadı',
    ]);
    expect(screen.getByText('340')).toBeInTheDocument();
  });

  it('lists the highest ratings with their league, peak and player', async () => {
    renderApp({ path: '/ratings', api: withRatings() });

    const table = (await screen.findByRole('heading', { name: 'En yüksek 50' })).closest('section') as HTMLElement;
    const first = within(table).getByRole('row', { name: /@kerem\.35/ });
    expect(within(first).getByText('#1')).toBeInTheDocument();
    expect(within(first).getByText('MasterClass')).toBeInTheDocument();
    expect(within(first).getByText('5.120')).toBeInTheDocument();
    expect(within(first).getByText('5.200')).toBeInTheDocument();
    expect(within(first).getByRole('link', { name: '@kerem.35' })).toHaveAttribute('href', '/players/01jplayer00000000000000000a');
    const second = within(table).getByRole('row', { name: /@ekin/ });
    expect(within(second).getByText('#2')).toBeInTheDocument();
    expect(within(second).getByText('Elmas')).toBeInTheDocument();
  });

  it('says so when nobody is placed yet', async () => {
    renderApp({ path: '/ratings', api: withRatings({ overview: ratingsOverview({ top: [] }) }) });

    expect(await screen.findByText('Henüz yerleşen yok')).toBeInTheDocument();
    expect(screen.getByText('Oyuncular ilk 5 sayılan turlarından sonra yerleşir.')).toBeInTheDocument();
    expect(screen.getByText('Lider reyting').nextElementSibling).toHaveTextContent('—');
  });

  it('shows the rules and the target table the API runs on', async () => {
    renderApp({ path: '/ratings', api: withRatings() });

    const rules = (await screen.findByRole('heading', { name: 'Kurallar' })).closest('section') as HTMLElement;
    expect(within(rules).getByText('±100 qb')).toBeInTheDocument();
    expect(within(rules).getByText('Geçici dönemde 400: değişimler daha büyük')).toBeInTheDocument();
    expect(within(rules).getByText('1.200 ile 1.800 arasına')).toBeInTheDocument();
    expect(within(rules).getByText('%50')).toBeInTheDocument();
    const unlock = within(rules).getByText('Dereceli kilidi', { selector: 'dt' }).parentElement as HTMLElement;
    expect(unlock).toHaveTextContent('20 oyun');
    expect(unlock).toHaveTextContent('Normal ya da Günlük oyun');
    expect(within(rules).queryByText('Lig bonusu')).not.toBeInTheDocument();

    const difficulty = within(rules).getByText('Zorluk', { selector: 'dt' }).parentElement as HTMLElement;
    expect(difficulty).toHaveTextContent('0–16');
    expect(difficulty).toHaveTextContent('1.000 qb’den sonra her 250 qb’de bir artar · tablo 1');

    // The targets of the difficulty table: what a placed player's run is measured with.
    const targets = screen.getByRole('heading', { name: 'Hedef tablosu' }).closest('section') as HTMLElement;
    const row = within(targets).getByRole('row', { name: /1\.000/ });
    expect(within(row).getByText('31.600')).toBeInTheDocument();
  });

  it('lists the difficulty each of the highest plays at', async () => {
    renderApp({ path: '/ratings', api: withRatings() });

    const top = (await screen.findByRole('heading', { name: 'En yüksek 50' })).closest('section') as HTMLElement;
    expect(within(top).getByRole('columnheader', { name: 'Zorluk' })).toBeInTheDocument();
    expect(within(top).getAllByText('16')).toHaveLength(2);
  });

  it('fits the target table to the players of a window, and changes nothing', async () => {
    const api = withRatings();
    renderApp({ path: '/ratings', api });

    const panel = (await screen.findByRole('heading', { name: 'Kalibrasyon' })).closest('section') as HTMLElement;
    expect(await within(panel).findByText(/Tablo config’de değişir/)).toBeInTheDocument();
    expect(api.ratings.calibration).toHaveBeenCalledWith({ days: 30 });
    expect(within(panel).getByText('Son 30 günde en az 10 sayılan turu olan')).toBeInTheDocument();

    const shares = within(panel).getByRole('list', { name: 'Bugünkü tabloyla oturdukları lig' });
    const bronze = within(shares).getByText('Bronz').closest('li') as HTMLElement;
    expect(bronze).toHaveTextContent('istenen %20');
    expect(bronze).toHaveTextContent('60 · %30');

    const anchors = screen.getByRole('heading', { name: 'Önerilen hedefler' }).closest('section') as HTMLElement;
    const first = within(anchors).getByRole('row', { name: /9\.500/ });
    expect(within(first).getByText('8.000')).toBeInTheDocument();
  });

  it('asks again for another window', async () => {
    const api = withRatings();
    const { user, router } = renderApp({ path: '/ratings', api });

    await user.click(await screen.findByRole('radio', { name: '7 gün' }));

    await waitFor(() => expect(api.ratings.calibration).toHaveBeenLastCalledWith({ days: 7 }));
    expect(router.state.location.search).toBe('?days=7');
    expect(api.ratings.get).toHaveBeenCalledTimes(1);
  });

  it('opens on the window in the address', async () => {
    const api = withRatings();
    renderApp({ path: '/ratings?days=90', api });

    await waitFor(() => expect(api.ratings.calibration).toHaveBeenCalledWith({ days: 90 }));
    expect(await screen.findByRole('radio', { name: '90 gün' })).toHaveAttribute('aria-checked', 'true');
  });

  it('says when nobody played enough to measure', async () => {
    renderApp({ path: '/ratings', api: withRatings({ fit: calibration({ players: 0 }) }) });

    expect(await screen.findByText(/yeterince oynayan oyuncu yok/)).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Bugünkü tabloyla oturdukları lig' })).not.toBeInTheDocument();
  });

  it('says what went wrong', async () => {
    const api = fakeApi();
    api.ratings.get.mockRejectedValue(new ApiError(500, 'server_error', 'Sunucu yanıt vermedi.'));
    api.ratings.calibration.mockResolvedValue(calibration());
    renderApp({ path: '/ratings', api });

    expect(await screen.findByText('Sunucu yanıt vermedi.')).toBeInTheDocument();
  });
});
