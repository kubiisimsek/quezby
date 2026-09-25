import { ApiError } from '@quezby/sdk/admin';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { leagueGroup, leaguesWeek } from '@/test/factories';
import { fakeApi } from '@/test/fake-api';
import { renderApp } from '@/test/render';

describe('LeaguesPage', () => {
  it('lists this week\'s groups with how many sit in each tier', async () => {
    const api = fakeApi();
    api.leagues.list.mockResolvedValue(leaguesWeek());
    renderApp({ path: '/leagues', api });

    expect(await screen.findByText('#7')).toBeInTheDocument();
    expect(screen.getByText('28 / 30')).toBeInTheDocument();
    expect(screen.getByText('Sürüyor')).toBeInTheDocument();
    expect(screen.getByText('Bitti')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Grup #7 tablosunu aç' })).toHaveAttribute('href', '/leagues/7');
    expect(screen.getByText('Altın oyuncusu')).toBeInTheDocument();
  });

  it('offers only the tiers someone sits in', async () => {
    const api = fakeApi();
    api.leagues.list.mockResolvedValue(leaguesWeek());
    renderApp({ path: '/leagues', api });

    expect(await screen.findByText('#7')).toBeInTheDocument();
    const tiers = screen.getByRole('radiogroup', { name: 'Lig' });
    expect(within(tiers).getAllByRole('radio')).toHaveLength(3);
    expect(within(tiers).getByRole('radio', { name: 'Bronz' })).toBeInTheDocument();
    expect(within(tiers).queryByRole('radio', { name: 'Elmas' })).not.toBeInTheDocument();
  });

  it('filters by tier', async () => {
    const api = fakeApi();
    api.leagues.list.mockResolvedValue(leaguesWeek());
    const { user } = renderApp({ path: '/leagues', api });

    await user.click(await screen.findByRole('radio', { name: /Altın/ }));

    await waitFor(() => expect(api.leagues.list).toHaveBeenLastCalledWith({ week: undefined, tier: 'gold', page: 1 }));
  });
});

describe('LeagueGroupPage', () => {
  it('shows the table with each player\'s zone', async () => {
    const api = fakeApi();
    api.leagues.group.mockResolvedValue(leagueGroup({ banned: [{ id: '01jplayer00000000000000000z', username: 'hileci', bannedAt: '2026-09-22T10:00:00.000Z' }] }));
    renderApp({ path: '/leagues/7', api });

    expect(await screen.findByRole('heading', { name: 'Altın ligi · grup #7' })).toBeInTheDocument();
    expect(screen.getByText('912.000')).toBeInTheDocument();
    expect(screen.getByText('Yükseliyor')).toBeInTheDocument();
    expect(screen.getByText('Düşüyor')).toBeInTheDocument();
    expect(screen.getByText(/@hileci bu gruba oturmuştu/)).toBeInTheDocument();
    expect(api.leagues.group).toHaveBeenCalledWith(7);
  });

  it('says so when there is no such group', async () => {
    const api = fakeApi();
    api.leagues.group.mockRejectedValue(new ApiError(404, 'not_found', 'x'));
    renderApp({ path: '/leagues/999', api });

    expect(await screen.findByText('Böyle bir lig grubu yok.')).toBeInTheDocument();
  });
});
