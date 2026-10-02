import { ApiError } from '@quezby/sdk/admin';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { adminSession, runRating, runResponse } from '@/test/factories';
import { fakeApi } from '@/test/fake-api';
import { renderApp } from '@/test/render';

const ID = '01jrun000000000000000000ab';

async function ratingCard(): Promise<HTMLElement> {
  return (await screen.findByRole('heading', { name: 'Reyting' })).closest('section') as HTMLElement;
}

function fact(scope: HTMLElement, label: string): HTMLElement {
  return within(scope).getByText(label, { selector: 'dt' }).parentElement as HTMLElement;
}

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
    expect(within(dialog).getByText(/haftanın, ayın ve sezonun tablolarına girer/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/ligine/)).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Onayla' }));

    await waitFor(() => expect(api.runs.approve).toHaveBeenCalledWith(ID));
    expect(await screen.findByText('Tur onaylandı')).toBeInTheDocument();
  });

  it('says a held rated run waits for the qb board, counts on the rating alone, and was played at its difficulty', async () => {
    const api = fakeApi();
    api.runs.get.mockResolvedValue(runResponse({}, { status: 'review', mode: 'rated', difficulty: 12, difficultyVersion: 1 }));
    const { user } = renderApp({ path: `/runs/${ID}`, api, session: adminSession({ role: 'moderator' }) });

    expect(await screen.findByText(/oyuncuyu qb tablosunun zirvesine taşıyacak/)).toBeInTheDocument();
    const difficulty = screen.getByText('Zorluk', { selector: 'dt' }).parentElement as HTMLElement;
    expect(difficulty).toHaveTextContent('12');
    expect(difficulty).toHaveTextContent('Zorluk tablosu 1; tur bu zorlukla tekrar oynatıldı');

    await user.click(screen.getByRole('button', { name: 'Onayla' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Hiçbir skor tablosuna yazılmaz\./)).toBeInTheDocument();
  });

  it('shows no difficulty for a run that is not rated', async () => {
    const api = fakeApi();
    api.runs.get.mockResolvedValue(runResponse({}, { status: 'ranked' }));
    renderApp({ path: `/runs/${ID}`, api });

    expect(await screen.findByText('Tohum')).toBeInTheDocument();
    expect(screen.queryByText('Zorluk', { selector: 'dt' })).not.toBeInTheDocument();
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

  it('shows a VS run for what it is, with nothing to decide on it even when flagged', async () => {
    const api = fakeApi();
    api.runs.get.mockResolvedValue(
      runResponse({}, { mode: 'vs', status: 'flagged', flags: [{ code: 'wall_clock', severity: 'hard', details: {} }] }),
    );
    renderApp({ path: `/runs/${ID}`, api, session: adminSession({ role: 'moderator' }) });

    expect(await screen.findByText('VS turu: hiçbir yere sayılmaz')).toBeInTheDocument();
    expect(screen.getByText(/bu yüzden onaylanmaz ve reddedilmez/)).toBeInTheDocument();
    expect(screen.getByText('VS')).toBeInTheDocument();
    expect(screen.getByText('Süre tutmuyor')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Onayla' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reddet' })).not.toBeInTheDocument();
  });

  it('names both sides of the VS, their scores and how it stands', async () => {
    const api = fakeApi();
    api.runs.get.mockResolvedValue(
      runResponse(
        {},
        {
          mode: 'vs',
          status: 'played',
          duel: {
            id: '01jduel0000000000000000001',
            status: 'finished',
            challenger: { id: 'p-ben', username: 'ben', bannedAt: null },
            opponent: { id: 'p-ekin', username: 'ekin', bannedAt: null },
            challengerScore: 12450,
            opponentScore: null,
            winnerId: 'p-ben',
          },
        },
      ),
    );
    renderApp({ path: `/runs/${ID}`, api });

    const challenger = await screen.findByRole('link', { name: '@ben' });
    expect(challenger).toHaveAttribute('href', '/players/p-ben');
    const line = within(challenger.closest('p') as HTMLElement);
    expect(line.getByRole('link', { name: '@ekin' })).toHaveAttribute('href', '/players/p-ekin');
    expect(line.getByText(/12\.450 –/)).toBeInTheDocument();
    expect(line.getByText('Bitti')).toBeInTheDocument();
  });

  it('calls a clean VS run played, and says it counts nowhere', async () => {
    const api = fakeApi();
    api.runs.get.mockResolvedValue(runResponse({}, { mode: 'vs', status: 'played' }));
    renderApp({ path: `/runs/${ID}`, api });

    const status = await screen.findByText('Oynandı');
    expect(status.parentElement).toHaveAttribute('title', expect.stringContaining('hiçbir tabloya, lige ya da istatistiğe sayılmaz'));
    expect(screen.queryByRole('button', { name: 'Reddet' })).not.toBeInTheDocument();
  });

  it('says so when there is no such run', async () => {
    const api = fakeApi();
    api.runs.get.mockRejectedValue(new ApiError(404, 'not_found', 'Aradığın şey bulunamadı.'));
    renderApp({ path: `/runs/${ID}`, api });

    expect(await screen.findByText('Böyle bir tur yok')).toBeInTheDocument();
  });

  it('shows what the run did to the rating, against which target', async () => {
    const api = fakeApi();
    api.runs.get.mockResolvedValue(runResponse({}, { rating: runRating() }));
    renderApp({ path: `/runs/${ID}`, api });

    const card = await ratingCard();
    expect(within(fact(card, 'Ne oldu')).getByText('Tur')).toBeInTheDocument();
    expect(within(fact(card, 'Değişim')).getByText('+42 qb')).toHaveClass('text-ok-text');
    expect(fact(card, 'Reyting')).toHaveTextContent('2.408 → 2.450');
    expect(within(fact(card, 'Lig')).getByText('Altın')).toBeInTheDocument();
    expect(fact(card, 'Skor')).toHaveTextContent('140.000');
    expect(fact(card, 'Skor')).toHaveTextContent('hedef 120.000');
    expect(fact(card, 'Performans')).toHaveTextContent('2.560');
    expect(fact(card, 'Hedefe oranı')).toHaveTextContent('%116,7');
    expect(fact(card, 'Hedefe oranı')).toHaveTextContent('Değişimi bu oran belirler');
    expect(fact(card, 'Terfi kalkanı')).toHaveTextContent('Yok');
    expect(within(card).queryByText(/Moderatör geri aldı/)).not.toBeInTheDocument();
  });

  it('says what a moderator\'s reject took back', async () => {
    const api = fakeApi();
    api.runs.get.mockResolvedValue(
      runResponse({}, { status: 'rejected', rating: runRating({ delta: 55, before: 2400, after: 2455, reversedBy: -55, shielded: true }) }),
    );
    renderApp({ path: `/runs/${ID}`, api });

    const card = await ratingCard();
    expect(within(card).getByText('Moderatör geri aldı: −55')).toBeInTheDocument();
    expect(within(fact(card, 'Değişim')).getByText('+55 qb')).toBeInTheDocument();
    expect(fact(card, 'Terfi kalkanı')).toHaveTextContent('Tuttu');
  });

  it('shows a run that did not count as such', async () => {
    const api = fakeApi();
    api.runs.get.mockResolvedValue(
      runResponse({}, { rating: runRating({ kind: 'void', delta: 0, before: 2378, after: 2378, target: null, performance: null, counted: false }) }),
    );
    renderApp({ path: `/runs/${ID}`, api });

    const card = await ratingCard();
    expect(within(fact(card, 'Ne oldu')).getByText('Sayılmadı')).toBeInTheDocument();
    expect(fact(card, 'Değişim')).toHaveTextContent('Sayılmadı');
    expect(fact(card, 'Performans')).toHaveTextContent('—');
    expect(fact(card, 'Hedefe oranı')).toHaveTextContent('—');
  });

  it('says when a run never touched the rating', async () => {
    const api = fakeApi();
    api.runs.get.mockResolvedValue(runResponse({}, { mode: 'vs', status: 'played', rating: null }));
    renderApp({ path: `/runs/${ID}`, api });

    const card = await ratingCard();
    expect(within(card).getByText('Bu tur reytinge dokunmadı')).toBeInTheDocument();
    expect(within(card).queryByText('Değişim', { selector: 'dt' })).not.toBeInTheDocument();
  });
});
