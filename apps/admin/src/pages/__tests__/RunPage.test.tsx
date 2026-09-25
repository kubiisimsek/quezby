import { ApiError } from '@quezby/sdk/admin';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { adminSession, runResponse } from '@/test/factories';
import { fakeApi } from '@/test/fake-api';
import { renderApp } from '@/test/render';

const ID = '01jrun000000000000000000ab';

describe('RunPage', () => {
  it('shows the run, its replay and whether the app told the truth', async () => {
    const api = fakeApi();
    api.runs.get.mockResolvedValue(runResponse({}, { clientScore: 60000 }));
    renderApp({ path: `/runs/${ID}`, api });

    expect(await screen.findByRole('heading', { name: 'Tur 000000AB' })).toBeInTheDocument();
    expect(screen.getAllByText('52.340').length).toBeGreaterThan(0);
    expect(screen.getByText('60.000')).toBeInTheDocument();
    expect(screen.getByText('Hayır')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem', { name: /Post \d/ })).toHaveLength(4);
    expect(screen.getByText('1 / 2 karar 250 ms’nin altında')).toBeInTheDocument();
  });

  it('opens a post of the replay', async () => {
    const api = fakeApi();
    api.runs.get.mockResolvedValue(runResponse());
    const { user } = renderApp({ path: `/runs/${ID}`, api });

    await user.click(await screen.findByRole('listitem', { name: 'Post 3: Altın, Mükemmel' }));

    expect(screen.getByText('Post 3')).toBeInTheDocument();
    expect(screen.getByText('900 ms')).toBeInTheDocument();
    expect(screen.getByText('+50 bonus')).toBeInTheDocument();
  });

  it('says why a run has no replay', async () => {
    const api = fakeApi();
    api.runs.get.mockResolvedValue(runResponse({ timeline: null, timelineUnavailable: 'other_engine' }));
    renderApp({ path: `/runs/${ID}`, api });

    expect(await screen.findByText(/başka bir sezonun kurallarıyla oynandı/)).toBeInTheDocument();
  });

  it('explains every signal the run tripped, with what it measured', async () => {
    const api = fakeApi();
    api.runs.get.mockResolvedValue(
      runResponse({}, { status: 'flagged', flags: [{ code: 'wall_clock', severity: 'hard', details: { elapsedMs: 1000, neededMs: 90000 } }] }),
    );
    renderApp({ path: `/runs/${ID}`, api });

    expect(await screen.findByText('Süre tutmuyor')).toBeInTheDocument();
    expect(screen.getByText('Tur, uygulamanın temposunun izin verdiğinden kısa sürede bitti.')).toBeInTheDocument();
    expect(screen.getByText('90.000 ms')).toBeInTheDocument();
  });

  it('lets a moderator approve a held run', async () => {
    const api = fakeApi();
    api.runs.get.mockResolvedValue(runResponse({}, { status: 'review' }));
    api.runs.approve.mockResolvedValue({ changed: true });
    const { user } = renderApp({ path: `/runs/${ID}`, api, session: adminSession({ role: 'moderator' }) });

    expect(await screen.findByText('Bu tur incelemede')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Onayla' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Onayla' }));

    await waitFor(() => expect(api.runs.approve).toHaveBeenCalledWith(ID));
    expect(await screen.findByText('Tur onaylandı')).toBeInTheDocument();
  });

  it('rejects with a reason', async () => {
    const api = fakeApi();
    api.runs.get.mockResolvedValue(runResponse({}, { status: 'ranked' }));
    api.runs.reject.mockResolvedValue({ changed: true });
    const { user } = renderApp({ path: `/runs/${ID}`, api });

    await user.click(await screen.findByRole('button', { name: 'Reddet' }));
    const dialog = await screen.findByRole('dialog', { name: 'Tur 000000AB reddedilsin mi?' });
    await user.type(within(dialog).getByLabelText('Sebep'), 'Bot gibi');
    await user.click(within(dialog).getByRole('button', { name: 'Reddet' }));

    await waitFor(() => expect(api.runs.reject).toHaveBeenCalledWith(ID, { reason: 'Bot gibi' }));
  });

  it('gives a viewer nothing to decide', async () => {
    const api = fakeApi();
    api.runs.get.mockResolvedValue(runResponse({}, { status: 'review' }));
    renderApp({ path: `/runs/${ID}`, api, session: adminSession({ role: 'viewer' }) });

    await screen.findByText('Bu tur incelemede');
    expect(screen.queryByRole('button', { name: 'Onayla' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reddet' })).not.toBeInTheDocument();
  });

  it('says so when there is no such run', async () => {
    const api = fakeApi();
    api.runs.get.mockRejectedValue(new ApiError(404, 'not_found', 'Aradığın şey bulunamadı.'));
    renderApp({ path: `/runs/${ID}`, api });

    expect(await screen.findByText('Böyle bir tur yok')).toBeInTheDocument();
  });
});
