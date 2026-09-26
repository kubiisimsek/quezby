import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RunTimeline } from '@/components/patterns/run-timeline';
import { runStep } from '@/test/factories';
import { renderWithProviders } from '@/test/render';

const STEPS = [
  runStep(),
  runStep({ index: 1, kind: 'hold', gesture: 'hold', t: 300, d: 900, verdict: 'perfect', points: 400, bonusPoints: 50 }),
  runStep({ index: 2, kind: 'freeze', gesture: 'touch', t: 90, verdict: 'caught', points: 0 }),
];

describe('RunTimeline', () => {
  it('draws a hit soft green with a green edge, a perfect solid green and a miss red', () => {
    renderWithProviders(<RunTimeline steps={STEPS} />);

    expect(screen.getByRole('listitem', { name: 'Post 1: Sıradan, İsabet' })).toHaveClass('border', 'border-ok', 'bg-ok-soft');
    const perfect = screen.getByRole('listitem', { name: 'Post 2: Altın, Mükemmel' });
    expect(perfect).toHaveClass('bg-ok');
    expect(perfect).not.toHaveClass('bg-ok-soft');
    expect(perfect).not.toHaveClass('bg-bad');
    expect(perfect).not.toHaveClass('bg-primary');
    expect(screen.getByRole('listitem', { name: 'Post 3: Kırmızı, Dokundu' })).toHaveClass('bg-bad');
  });

  it('leads each tally pill with its cell\'s swatch, so the tally reads as the legend', () => {
    renderWithProviders(<RunTimeline steps={STEPS} />);
    const swatch = (pill: string) => screen.getByText(pill).parentElement?.querySelector('[aria-hidden]');

    expect(swatch('İsabet 1')).toHaveClass('border', 'border-ok', 'bg-ok-soft');
    expect(swatch('Mükemmel 1')).toHaveClass('bg-ok');
    expect(swatch('Mükemmel 1')).not.toHaveClass('bg-ok-soft');
    expect(swatch('Dokundu 1')).toHaveClass('bg-bad');
  });

  it('rings the chosen cell and keeps a hit\'s green edge under the ring', async () => {
    const { user } = renderWithProviders(<RunTimeline steps={STEPS} />);
    const hit = screen.getByRole('listitem', { name: 'Post 1: Sıradan, İsabet' });

    await user.click(hit);

    expect(hit).toHaveAttribute('aria-pressed', 'true');
    expect(hit).toHaveClass('ring-2', 'ring-offset-1', 'border', 'border-ok', 'bg-ok-soft');
  });

  it('fits every decision of a long run into one strip, the fast ones red', () => {
    const steps = Array.from({ length: 739 }, (_, index) => runStep({ index, t: index % 3 === 0 ? 200 : 400 }));
    const { container } = renderWithProviders(<RunTimeline steps={steps} />);

    const strip = container.querySelector('svg[viewBox="0 0 739 100"]');
    expect(strip).not.toBeNull();
    expect(strip?.getAttribute('preserveAspectRatio')).toBe('none');
    expect(strip?.querySelectorAll('rect')).toHaveLength(739);
    expect(strip?.querySelectorAll('rect.fill-bad')).toHaveLength(247);
    expect(screen.getByText('247 / 739 karar 250 ms’nin altında')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(739);
  });

  it('leaves the strip out when nothing was swiped or liked', () => {
    const { container } = renderWithProviders(<RunTimeline steps={[runStep({ kind: 'hold', gesture: 'hold', t: 0, d: 900 })]} />);

    expect(container.querySelector('svg[viewBox]')).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });
});
