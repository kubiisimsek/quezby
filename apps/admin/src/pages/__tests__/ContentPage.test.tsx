import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { contentResponse } from '@/test/factories';
import { fakeApi } from '@/test/fake-api';
import { renderApp } from '@/test/render';

describe('ContentPage', () => {
  it('labels every post from the catalog the app plays with', async () => {
    const api = fakeApi();
    api.content.list.mockResolvedValue(contentResponse());
    renderApp({ path: '/content', api });

    expect(await screen.findByText('Kimse sormadı ama kahvem soğudu')).toBeInTheDocument();
    expect(screen.getByText('kedim yine beni yargılıyor')).toBeInTheDocument();
    // The catalog speaks six languages; the panel reads its Turkish source.
    expect(screen.getByText('@zeynep.k ·')).toBeInTheDocument();
    expect(screen.getAllByText('%75').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Gösterilmedi')).toHaveLength(2);
    expect(screen.getByRole('list', { name: 'En çok kaçırılan postlar' })).toBeInTheDocument();
  });

  it('ranks the most missed and the most liked posts by their rate', async () => {
    const api = fakeApi();
    api.content.list.mockResolvedValue(contentResponse());
    renderApp({ path: '/content', api });

    const missed = await screen.findByRole('list', { name: 'En çok kaçırılan postlar' });
    expect(within(missed).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      expect.stringContaining('Kimse sormadı ama kahvem soğudu'),
      expect.stringContaining('kedim yine beni yargılıyor'),
    ]);
    const liked = screen.getByRole('list', { name: 'En çok beğenilen postlar' });
    expect(within(liked).getAllByRole('listitem')).toHaveLength(1);
    expect(within(liked).getByText(/kedim yine beni yargılıyor/)).toBeInTheDocument();
  });

  it('filters by kind and sorts by a rate', async () => {
    const api = fakeApi();
    api.content.list.mockResolvedValue(contentResponse());
    const { user } = renderApp({ path: '/content', api });

    await user.click(await screen.findByRole('radio', { name: 'Arkadaş' }));
    await waitFor(() => expect(api.content.list).toHaveBeenLastCalledWith({ kind: 'like', sort: 'shows' }));
  });
});
