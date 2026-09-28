import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { adminSession, runRow, runsPage, suspect, suspectsPage } from '@/test/factories';
import { fakeApi } from '@/test/fake-api';
import { renderApp } from '@/test/render';

describe('SuspectsPage', () => {
  it('opens on the review queue, best score first, and approves from it', async () => {
    const api = fakeApi();
    api.runs.list.mockResolvedValue(runsPage([runRow({ status: 'review', flags: [{ code: 'reaction_cv', severity: 'soft', details: {} }] })]));
    api.runs.approve.mockResolvedValue({ changed: true });
    const { user } = renderApp({ path: '/suspects', api });
    api.overview.counts.mockResolvedValue({ review: 1, reports: 0 });

    expect(await screen.findByText('Makine gibi ritim')).toBeInTheDocument();
    expect(api.runs.list).toHaveBeenCalledWith({ status: 'review', sort: 'score', page: 1 });

    await user.click(screen.getByRole('button', { name: 'Onayla' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Onayla' }));
    await waitFor(() => expect(api.runs.approve).toHaveBeenCalledWith('01jrun000000000000000000ab'));
  });

  it('lists flagged runs by the signal chosen', async () => {
    const api = fakeApi();
    api.runs.list.mockResolvedValue(runsPage([runRow({ status: 'flagged', flags: [{ code: 'slow_motion', severity: 'hard', details: {} }] })]));
    renderApp({ path: '/suspects?tab=flagged&flag=slow_motion', api });

    expect(await screen.findAllByText('Yavaşlatılmış oyun')).not.toHaveLength(0);
    expect(api.runs.list).toHaveBeenCalledWith({ status: 'flagged', flag: 'slow_motion', page: 1 });
  });

  it('offers no decision on a flagged VS run: it never ranks anywhere', async () => {
    const api = fakeApi();
    const flags = [{ code: 'wall_clock' as const, severity: 'hard' as const, details: {} }];
    api.runs.list.mockResolvedValue(
      runsPage([runRow({ status: 'flagged', flags }), runRow({ id: '01jrun000000000000000000cd', mode: 'vs', status: 'flagged', flags })]),
    );
    renderApp({ path: '/suspects?tab=flagged', api, session: adminSession({ role: 'moderator' }) });

    const vs = (await screen.findByRole('link', { name: 'Tur 000000CD aç' })).closest('tr') as HTMLElement;
    const free = screen.getByRole('link', { name: 'Tur 000000AB aç' }).closest('tr') as HTMLElement;
    expect(within(free).getByRole('button', { name: 'Reddet' })).toBeInTheDocument();
    expect(within(vs).getByText(/^VS · /)).toBeInTheDocument();
    expect(within(vs).queryByRole('button', { name: 'Reddet' })).not.toBeInTheDocument();
  });

  it('ranks the suspect players by risk and bans from the list', async () => {
    const api = fakeApi();
    api.suspects.list.mockResolvedValue(suspectsPage([suspect()]));
    api.players.ban.mockResolvedValue({ changed: true });
    const { user } = renderApp({ path: '/suspects?tab=players', api });

    expect(await screen.findByText('@bot.35')).toBeInTheDocument();
    expect(screen.getByText('22')).toBeInTheDocument();
    expect(screen.getByText('Süre tutmuyor ×2')).toBeInTheDocument();
    expect(api.suspects.list).toHaveBeenCalledWith({ days: 30, includeBanned: false, page: 1 });

    await user.click(screen.getByRole('button', { name: 'Yasakla' }));
    const dialog = await screen.findByRole('dialog', { name: '@bot.35 yasaklansın mı?' });
    await user.type(within(dialog).getByLabelText('Sebep'), 'Bot');
    await user.click(within(dialog).getByRole('button', { name: 'Yasakla' }));
    await waitFor(() => expect(api.players.ban).toHaveBeenCalledWith('01jplayer00000000000000000a', { reason: 'Bot' }));
  });

  it('looks back 7 days and shows the banned when asked', async () => {
    const api = fakeApi();
    api.suspects.list.mockResolvedValue(suspectsPage([suspect()]));
    const { user } = renderApp({ path: '/suspects?tab=players', api });

    await screen.findByText('@bot.35');
    await user.click(screen.getByRole('radio', { name: 'Son 7 gün' }));
    await waitFor(() => expect(api.suspects.list).toHaveBeenLastCalledWith(expect.objectContaining({ days: 7 })));
    await user.click(screen.getByRole('checkbox', { name: /Yasaklıları da göster/ }));
    await waitFor(() => expect(api.suspects.list).toHaveBeenLastCalledWith(expect.objectContaining({ includeBanned: true })));
  });

  it('says the queue is empty in so many words', async () => {
    const api = fakeApi();
    api.runs.list.mockResolvedValue(runsPage([]));
    renderApp({ path: '/suspects', api });

    expect(await screen.findByText('Kuyruk boş')).toBeInTheDocument();
  });
});
