import { ApiError } from '@quezby/sdk/admin';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { system } from '@/test/factories';
import { fakeApi } from '@/test/fake-api';
import { renderApp } from '@/test/render';

describe('SystemPage', () => {
  it('shows what the API runs with', async () => {
    const api = fakeApi();
    api.system.get.mockResolvedValue(system());
    renderApp({ path: '/system', api });

    expect(await screen.findByText('8.3.12')).toBeInTheDocument();
    expect(screen.getAllByText('Uygulanıyor').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1.0.0 · 1.1.0')).toHaveLength(2);
    expect(screen.queryByText('Paylaşılan bir anahtar açık')).not.toBeInTheDocument();
    expect(screen.queryByText('APP_KEY eksik')).not.toBeInTheDocument();
    expect(screen.getByText('Tanımlı')).toBeInTheDocument();
  });

  it('says APP_KEY is missing and rebuilds the cache once .env has it', async () => {
    const api = fakeApi();
    api.system.get.mockResolvedValue(system({ appKey: false }));
    api.system.run.mockResolvedValue({ output: 'cached' });
    const { user } = renderApp({ path: '/system', api });

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('APP_KEY eksik')).toBeInTheDocument();
    expect(within(alert).getByText(/Oyuncu istekleri 500 dönüyor/)).toBeInTheDocument();
    expect(screen.getByText('Eksik')).toBeInTheDocument();

    await user.click(within(alert).getByRole('button', { name: 'Önbelleği yenile' }));
    await user.click(await screen.findByRole('button', { name: 'Önbelleği yenile' }));

    await waitFor(() => expect(api.system.run).toHaveBeenCalledWith('optimize'));
  });

  it('warns about waiting migrations and runs them after asking', async () => {
    const api = fakeApi();
    api.system.get.mockResolvedValue(system({ pendingMigrations: ['2026_09_27_000100_create_admins_table'] }));
    api.system.run.mockResolvedValue({ output: 'Migrated: 2026_09_27_000100_create_admins_table' });
    const { user } = renderApp({ path: '/system', api });

    expect(await screen.findByText('1 migration bekliyor')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Çalıştır' }));
    await user.click(await screen.findByRole('button', { name: 'Migration’ları çalıştır' }));

    await waitFor(() => expect(api.system.run).toHaveBeenCalledWith('migrate'));
    expect(await screen.findByText('Migrated: 2026_09_27_000100_create_admins_table')).toBeInTheDocument();
  });

  it('warns when a shared key is left open', async () => {
    const api = fakeApi();
    api.system.get.mockResolvedValue(system({ tokens: { ops: true, moderation: false } }));
    renderApp({ path: '/system', api });

    expect(await screen.findByText('Paylaşılan bir anahtar açık')).toBeInTheDocument();
    expect(screen.getByText(/OPS_TOKEN dolu/)).toBeInTheDocument();
  });

  it('shows why a chore failed', async () => {
    const api = fakeApi();
    api.system.get.mockResolvedValue(system());
    api.system.run.mockRejectedValue(new ApiError(500, 'server_error', 'optimize başarısız (çıkış kodu 1): disk dolu'));
    const { user } = renderApp({ path: '/system', api });

    await user.click(await screen.findByRole('button', { name: 'Önbelleği yenile' }));
    await user.click(await screen.findByRole('button', { name: 'Önbelleği yenile' }));

    expect(await screen.findByText('optimize başarısız (çıkış kodu 1): disk dolu', { selector: 'pre' })).toBeInTheDocument();
  });
});
