import { ApiError } from '@quezby/sdk/admin';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { fakeApi } from '@/test/fake-api';
import { overview } from '@/test/factories';
import { renderApp } from '@/test/render';

describe('OverviewPage', () => {
  it('shows today\'s numbers, the last thirty days and the queue', async () => {
    const api = fakeApi();
    api.overview.get.mockResolvedValue(overview());
    renderApp({ path: '/', api });

    expect(await screen.findByText('1.234')).toBeInTheDocument();
    expect(screen.getByText('Günün akışı #2')).toBeInTheDocument();
    expect(screen.getByText('1.450')).toBeInTheDocument();
    expect(screen.getByText('Yasaklı').parentElement).toHaveTextContent('5');
    expect(screen.getByRole('table', { name: 'Son 30 günün turları' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Son 30 günün yeni oyuncuları' })).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Bu haftanın sinyalleri' })).getByText('Süre tutmuyor')).toBeInTheDocument();
    expect(screen.getByText('99.000')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tümü' })).toHaveAttribute('href', '/suspects');
  });

  it('says so when the week was clean and nothing waits', async () => {
    const api = fakeApi();
    api.overview.get.mockResolvedValue(overview({ topFlags: [], queue: [] }));
    renderApp({ path: '/', api });

    expect(await screen.findByText('Son 7 günde hiçbir tura bayrak konmadı.')).toBeInTheDocument();
    expect(screen.getByText('Kuyruk boş')).toBeInTheDocument();
  });

  it('shows a failure in place of the page', async () => {
    const api = fakeApi();
    api.overview.get.mockRejectedValue(new ApiError(0, 'network', 'x'));
    renderApp({ path: '/', api });

    expect(await screen.findByText('Sunucuya ulaşılamadı. Bağlantını kontrol et.')).toBeInTheDocument();
  });
});
