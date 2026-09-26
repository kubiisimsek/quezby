import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Journey } from '@/components/analytics/journey';
import { ActivityStrip, describeDay } from '@/components/patterns/activity-strip';
import { FunnelList } from '@/components/patterns/funnel-list';
import { RetentionTable } from '@/components/patterns/retention-table';
import { formatWeekKey } from '@/lib/format';

describe('RetentionTable', () => {
  it('writes every rate out, and only tints the cells greener for more', () => {
    render(
      <RetentionTable
        label="Geri dönüş"
        formatWeek={formatWeekKey}
        rows={[
          { week: '2026-W39', players: 20, d1: 600, d3: 120, d7: 0, d14: null, d30: null },
          { week: '2026-W38', players: 0, d1: null, d3: null, d7: null, d14: null, d30: null },
        ]}
      />,
    );

    const table = screen.getByRole('table', { name: 'Geri dönüş' });
    const [, first, second] = within(table).getAllByRole('row');
    const cells = within(first as HTMLElement).getAllByRole('cell');
    expect(cells.map((cell) => cell.textContent)).toEqual(['20', '%60', '%12', '%0', '—', '—']);
    expect(cells[1]).toHaveClass('bg-ok/45');
    expect(cells[2]).toHaveClass('bg-ok/18');
    expect(cells[3]).not.toHaveClass('bg-ok/8');
    expect(within(second as HTMLElement).getAllByRole('cell').slice(1).every((cell) => cell.textContent === '—')).toBe(true);
    expect(table.querySelector('.bg-primary, .bg-bad')).toBeNull();
  });
});

describe('FunnelList', () => {
  it('numbers the steps and shows the API\'s rates, never its own', () => {
    render(
      <FunnelList
        label="İlk adımlar"
        steps={[
          { key: 'joined', label: 'Katıldı', count: 10, rate: 1000 },
          { key: 'named', label: 'Adını seçti', hint: 'Otomatik adda kalmadı', count: 4, rate: 400 },
        ]}
      />,
    );

    const list = screen.getByRole('list', { name: 'İlk adımlar' });
    expect(list.tagName).toBe('OL');
    expect(within(list).getAllByRole('listitem')[1]).toHaveTextContent('2Adını seçtiOtomatik adda kalmadı4 · %40');
    expect(within(list).getByRole('meter', { name: 'Adını seçti' })).toHaveAttribute('aria-valuenow', '40');
  });

  it('lists slices of a whole without numbers', () => {
    render(<FunnelList label="Sürümler" numbered={false} steps={[{ key: 'a', label: 'iOS 1.0.0', count: 3, rate: null }]} />);

    const list = screen.getByRole('list', { name: 'Sürümler' });
    expect(list.tagName).toBe('UL');
    expect(list).toHaveTextContent('iOS 1.0.03 · —');
  });
});

describe('ActivityStrip', () => {
  it('draws a cell a day, saying each in words, greener the longer the player stayed', () => {
    const days = [
      { day: '2026-09-24', visits: 0, seconds: 0 },
      { day: '2026-09-25', visits: 1, seconds: 120 },
      { day: '2026-09-26', visits: 3, seconds: 1800 },
    ];
    render(<ActivityStrip days={days} label="Son 30 gün" />);

    const cells = within(screen.getByRole('list', { name: 'Son 30 gün' })).getAllByRole('listitem');
    expect(cells).toHaveLength(3);
    expect(cells[0]).toHaveAccessibleName(describeDay(days[0]!));
    expect(cells[0]).toHaveClass('bg-fill');
    expect(cells[1]).toHaveClass('bg-ok-soft');
    expect(cells[2]).toHaveClass('bg-ok');
    expect(describeDay(days[2]!)).toBe('26 Eyl Cmt: 3 ziyaret · 30 dk');
    expect(describeDay(days[0]!)).toMatch(/gelmedi$/);
  });
});

describe('Journey', () => {
  it('joins the screens with arrows, and shows the moments between them in their colours', () => {
    render(
      <Journey
        steps={[
          { code: 'home', at: 0 },
          { code: 'game', at: 12 },
          { code: 'unsent_run', at: 300 },
          { code: 'leaderboard', at: 310 },
        ]}
      />,
    );

    const steps = within(screen.getByRole('list', { name: 'Yolculuk' })).getAllByRole('listitem');
    expect(steps.map((step) => step.textContent)).toEqual(['Lobi', 'Oyun', 'Gönderilemeyen tur', 'Zirve']);
    expect(steps[2]).toHaveAttribute('title', '5 dk sonra');
  });

  it('counts the steps past the first few', () => {
    render(<Journey max={2} steps={[{ code: 'home', at: 0 }, { code: 'game', at: 5 }, { code: 'league', at: 9 }]} />);

    expect(screen.getByText('+1 adım')).toBeInTheDocument();
  });

  it('says when a visit went nowhere', () => {
    render(<Journey steps={[]} />);

    expect(screen.getByText('Yolculuk yok')).toBeInTheDocument();
  });
});
