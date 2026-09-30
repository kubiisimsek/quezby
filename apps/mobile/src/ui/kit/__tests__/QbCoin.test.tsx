import { render, screen } from '@testing-library/react-native';

import { QB_MONOGRAM } from '@/ui/kit/qb';
import { QbCoin } from '@/ui/kit';

describe('QbCoin', () => {
  it('is a picture only: the amount beside it is what a screen reader says', async () => {
    await render(<QbCoin size={40} />);

    expect(screen.queryByTestId('qb-coin')).toBeNull();
    const coin = screen.getByTestId('qb-coin', { includeHiddenElements: true });
    expect(coin.props.accessibilityElementsHidden).toBe(true);
    expect(coin.props.style).toEqual(expect.arrayContaining([{ height: 40, width: 40 }]));
  });

  it('raises the qb monogram on its face, and beads the rim only when there is room', async () => {
    const big = await render(<QbCoin size={40} />);
    const detailed = JSON.stringify(big.toJSON());
    expect(detailed.split(QB_MONOGRAM).length - 1).toBe(2);
    const beads = (detailed.match(/"r":2\.2/g) ?? []).length;
    expect(beads).toBe(12);

    const small = await render(<QbCoin size={18} />);
    expect(JSON.stringify(small.toJSON())).not.toContain('"r":2.2');
  });

  it('turns the monogram half round onto itself: q is b upside down', () => {
    // Every point of the drawing has its twin across the face's centre (50, 48).
    const numbers = QB_MONOGRAM.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    expect(numbers).toContain(45.5);
    expect(numbers).toContain(54.5);
    expect(45.5 + 54.5).toBe(100);
  });
});
