import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CLOSED_KEY, COLLAPSE_KEY, Sidebar } from '@/components/layout/sidebar';
import { navFor } from '@/nav';
import { adminMe } from '@/test/factories';
import { renderWithProviders } from '@/test/render';

function renderSidebar({ role = 'owner' as const, path = '/', badges = {}, onSignOut = vi.fn() } = {}) {
  return renderWithProviders(<Sidebar items={navFor(role)} admin={adminMe({ role })} badges={badges} onSignOut={onSignOut} />, { path });
}

describe('Sidebar', () => {
  it('lights the page you are on, and its list on a record', () => {
    renderSidebar({ path: '/players/01jplayer' });

    expect(screen.getByRole('link', { name: 'Oyuncular' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Genel bakış' })).not.toHaveAttribute('aria-current');
  });

  it('never links a viewer or a moderator to the owners\' pages', () => {
    renderWithProviders(<Sidebar items={navFor('viewer')} admin={adminMe({ role: 'viewer' })} onSignOut={vi.fn()} />);

    expect(screen.queryByRole('link', { name: 'Yöneticiler' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sistem' })).not.toBeInTheDocument();
    expect(screen.getByText('İzleyici')).toBeInTheDocument();
  });

  it('counts what waits for review', () => {
    renderSidebar({ badges: { '/suspects': 3 } });

    expect(within(screen.getByRole('link', { name: /Şüpheliler/ })).getByText('3')).toBeInTheDocument();
  });

  it('folds a group away and remembers it, keeping its count in sight', async () => {
    const { user } = renderSidebar({ badges: { '/suspects': 3 } });

    await user.click(screen.getByRole('button', { name: /Oyuncular/ }));

    expect(screen.getByRole('button', { name: /Oyuncular/ })).toHaveAttribute('aria-expanded', 'false');
    expect(JSON.parse(localStorage.getItem(CLOSED_KEY) ?? '[]')).toEqual(['Oyuncular']);
    expect(within(screen.getByRole('button', { name: /Oyuncular/ })).getByText('3')).toBeInTheDocument();
  });

  it('narrows to its icons and remembers that too', async () => {
    const { user } = renderSidebar();

    await user.click(screen.getByRole('button', { name: 'Menüyü daralt' }));

    expect(localStorage.getItem(COLLAPSE_KEY)).toBe('1');
    expect(screen.getByRole('link', { name: 'Oyuncular' })).toHaveAttribute('title', 'Oyuncular');
    expect(screen.queryByText('Yönetim paneli')).not.toBeInTheDocument();
  });

  it('names the panel\'s release under the theme switch, and drops it when narrowed', async () => {
    const { user } = renderSidebar();

    expect(screen.getByText('Sürüm 1.00.00.04')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Menüyü daralt' }));

    expect(screen.queryByText('Sürüm 1.00.00.04')).not.toBeInTheDocument();
  });

  it('switches the theme', async () => {
    const { user } = renderSidebar();

    await user.click(screen.getByRole('radio', { name: 'Koyu tema' }));

    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('quezby.admin.theme')).toBe('dark');
  });

  it('signs out from the account menu', async () => {
    const onSignOut = vi.fn();
    const { user } = renderSidebar({ onSignOut });

    await user.click(screen.getByRole('button', { name: 'Hesap: Kubilay Şimşek' }));
    await user.click(await screen.findByRole('menuitem', { name: /Çıkış yap/ }));

    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
