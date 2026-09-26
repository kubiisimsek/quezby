import { render, screen } from '@testing-library/react-native';

import { iso } from '@/i18n';
import { useLanguage } from '@/i18n/language';
import { RankChips } from '@/ui/kit';
import { arena } from '@/ui/tokens';

describe('RankChips', () => {
  it('shows each board with the rank the API sent, in gold', async () => {
    await render(
      <RankChips
        items={[
          { label: 'Bugün', rank: 44 },
          { label: 'Hafta', rank: 120 },
          { label: 'Ay', rank: 310 },
          { label: 'Tüm zamanlar', rank: 1_204 },
        ]}
      />,
    );

    ['Bugün', 'Hafta', 'Ay', 'Tüm zamanlar'].forEach((label) => {
      expect(screen.getByText(label)).toBeOnTheScreen();
    });
    expect(screen.getByText('#44')).toHaveStyle({ color: arena.gold });
    expect(screen.getByText('#1.204')).toBeOnTheScreen();
    expect(screen.getByLabelText('Tüm zamanlar: #1.204')).toBeOnTheScreen();
  });

  it('says so, quietly, where you have not placed', async () => {
    await render(
      <RankChips
        items={[
          { label: 'Bugün', rank: null },
          { label: 'Hafta', rank: undefined },
        ]}
      />,
    );

    const dashes = screen.getAllByText('—');
    expect(dashes).toHaveLength(2);
    expect(dashes[0]).toHaveStyle({ color: arena.inkFaint });
    expect(
      screen.getByLabelText('Bugün: sıralamada değilsin'),
    ).toBeOnTheScreen();
  });

  it("groups the rank and says it the player's way, in French", async () => {
    useLanguage.setState({ locale: 'fr' });
    await render(
      <RankChips
        items={[
          { label: "Aujourd'hui", rank: 1_204 },
          { label: 'Semaine', rank: null },
        ]}
      />,
    );

    // Exact props: a query would read a no-break space as any space.
    expect(screen.getByText(/^#1/).props.children).toBe('#1\u00a0204');
    expect(screen.getByLabelText(/^Aujourd'hui/).props.accessibilityLabel).toBe(
      "Aujourd'hui\u00a0: #1\u00a0204",
    );
    expect(screen.getByLabelText(/^Semaine/).props.accessibilityLabel).toBe(
      'Semaine\u00a0: hors classement',
    );
  });

  it('keeps the rank whole inside an Arabic label', async () => {
    useLanguage.setState({ locale: 'ar' });
    await render(
      <RankChips
        items={[
          { label: 'اليوم', rank: 44 },
          { label: 'الأسبوع', rank: null },
        ]}
      />,
    );

    expect(screen.getByLabelText(`اليوم: ${iso('#44')}`)).toBeOnTheScreen();
    expect(screen.getByLabelText('الأسبوع: لست في الترتيب')).toBeOnTheScreen();
  });
});
