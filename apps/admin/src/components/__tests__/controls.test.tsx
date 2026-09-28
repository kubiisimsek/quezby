import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Avatar, initials } from '@/components/base/avatar';
import { Segmented } from '@/components/base/segmented';
import { BarChart } from '@/components/patterns/bar-chart';
import { ConfirmModal } from '@/components/patterns/confirm-modal';
import { FilterChips } from '@/components/patterns/filter-chips';
import { renderWithProviders } from '@/test/render';

describe('initials', () => {
  it('takes two letters from a handle or a name, in Turkish capitals', () => {
    expect(initials('kerem.35')).toBe('KE');
    expect(initials('ilkay irmak')).toBe('İİ');
    expect(initials('guest48128742')).toBe('GU');
    expect(initials(null)).toBe('?');
  });
});

describe('Avatar', () => {
  const photo = 'https://api.quezby.com/api/v1/media/avatars/0123456789abcdef01234567.jpg';

  it('shows the photo when there is one, as decoration beside the name', () => {
    const { container } = render(<Avatar name="kerem.35" src={photo} />);

    const image = container.querySelector('img');
    expect(image).toHaveAttribute('src', photo);
    expect(image).toHaveAttribute('alt', '');
    expect(image).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByText('KE')).not.toBeInTheDocument();
  });

  it('names the photo when the photo is what is being looked at', () => {
    render(<Avatar name="kerem.35" src={photo} alt="@kerem.35 profil fotoğrafı" />);

    expect(screen.getByRole('img', { name: '@kerem.35 profil fotoğrafı' })).toHaveAttribute('src', photo);
  });

  it('wears the initials without a photo', () => {
    const { container } = render(<Avatar name="kerem.35" src={null} />);

    expect(screen.getByText('KE')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  it('falls back to the initials when the photo will not load', () => {
    const { container } = render(<Avatar name="kerem.35" src={photo} />);

    fireEvent.error(container.querySelector('img') as HTMLImageElement);

    expect(screen.getByText('KE')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('Segmented', () => {
  function Tabs({ onChange }: { onChange?: (value: string) => void }) {
    const [value, setValue] = useState('daily');
    return (
      <Segmented
        aria-label="Tablo"
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange?.(next);
        }}
        options={[
          { value: 'daily', label: 'Bugün' },
          { value: 'weekly', label: 'Hafta', count: 4 },
          { value: 'all', label: 'Tüm zamanlar' },
        ]}
      />
    );
  }

  it('is a tablist whose chosen tab is the one focus lands on', () => {
    renderWithProviders(<Tabs />);

    expect(screen.getByRole('tablist', { name: 'Tablo' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Bugün' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Bugün' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: /Hafta/ })).toHaveAttribute('tabindex', '-1');
  });

  it('moves with the arrow keys and wraps around', async () => {
    const onChange = vi.fn();
    const { user } = renderWithProviders(<Tabs onChange={onChange} />);

    await user.click(screen.getByRole('tab', { name: 'Bugün' }));
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /Hafta/ })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Tüm zamanlar' })).toHaveAttribute('aria-selected', 'true');
    expect(onChange.mock.calls.map(([value]) => value)).toEqual(['daily', 'weekly', 'daily', 'all']);
  });
});

describe('FilterChips', () => {
  it('shows everything, what is chosen, and only the chips with something behind them', async () => {
    const onChange = vi.fn();
    const { user } = renderWithProviders(
      <FilterChips
        aria-label="Durum"
        value="all"
        onChange={onChange}
        chips={[
          { value: 'all', label: 'Tümü', count: 12 },
          { value: 'banned', label: 'Yasaklı', count: 2 },
          { value: 'guest', label: 'Misafir', count: 0 },
        ]}
      />,
    );

    expect(screen.getByRole('radio', { name: /Tümü/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByRole('radio', { name: /Misafir/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /Yasaklı/ }));
    expect(onChange).toHaveBeenCalledWith('banned');
  });
});

describe('ConfirmModal', () => {
  it('lands on "Vazgeç", so a stray Enter changes nothing', async () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    const { user } = renderWithProviders(
      <ConfirmModal
        open
        onOpenChange={onOpenChange}
        title="kerem.35 yasaklansın mı?"
        description="Oyuncu tablolardan çıkar."
        confirmLabel="Yasakla"
        onConfirm={onConfirm}
      />,
    );

    expect(await screen.findByRole('dialog', { name: 'kerem.35 yasaklansın mı?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vazgeç' })).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);

    await user.click(screen.getByRole('button', { name: 'Yasakla' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('BarChart', () => {
  it('puts every number in a table for screen readers', () => {
    renderWithProviders(
      <BarChart
        label="Günlük turlar"
        labels={['2026-09-24', '2026-09-25']}
        series={[
          { label: 'Sıralamada', tone: 'primary', values: [120, 1450] },
          { label: 'Bayraklı', tone: 'bad', values: [3, 12] },
        ]}
      />,
    );

    const table = screen.getByRole('table', { name: 'Günlük turlar' });
    expect(table).toHaveTextContent('1.450');
    expect(screen.getByRole('rowheader', { name: '2026-09-25' })).toBeInTheDocument();
    expect(screen.getByText('Bayraklı', { selector: 'figcaption span' })).toBeInTheDocument();
  });
});
