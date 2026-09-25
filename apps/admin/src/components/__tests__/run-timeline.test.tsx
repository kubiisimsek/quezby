import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RunTimeline } from '@/components/patterns/run-timeline';
import { runStep } from '@/test/factories';
import { renderWithProviders } from '@/test/render';

describe('RunTimeline', () => {
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
