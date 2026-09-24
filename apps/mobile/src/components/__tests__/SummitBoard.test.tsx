import type { LeaderboardEntry } from '@quezby/types';
import { fireEvent, render, screen } from '@testing-library/react-native';

import {
  ClimbItemView,
  SummitPodium,
  climbKey,
  layoutBoard,
  type ClimbItem,
} from '@/components/SummitBoard';
import { buildEntries, buildEntry } from '@/test/factories';
import { BrandBand } from '@/ui/kit';

/** What the climb shows, one short line per item. */
function lines(climb: ClimbItem[]): string[] {
  return climb.map((item) =>
    item.kind === 'gap' ? '…' : `${item.entry.rank} ${item.entry.username}`,
  );
}

describe('layoutBoard', () => {
  it('stands the top three on the podium and sends the rest up the climb', () => {
    const entries = buildEntries(6);

    const layout = layoutBoard({ entries, me: null, neighbors: [] });

    expect(layout.podium.map((entry) => entry.rank)).toEqual([1, 2, 3]);
    expect(lines(layout.climb)).toEqual(['4 deniz', '5 burak', '6 zeynep']);
    expect(layout.alone).toBe(false);
  });

  it('keeps a tied player on the climb rather than dropping them', () => {
    const entries: LeaderboardEntry[] = [
      buildEntry({ rank: 1, username: 'ekin', gap: null }),
      buildEntry({ rank: 2, username: 'mert' }),
      buildEntry({ rank: 2, username: 'oya' }),
      buildEntry({ rank: 4, username: 'deniz' }),
    ];

    const layout = layoutBoard({ entries, me: null, neighbors: [] });

    expect(layout.podium.map((entry) => entry.username)).toEqual([
      'ekin',
      'mert',
    ]);
    expect(lines(layout.climb)).toEqual(['2 oya', '4 deniz']);
  });

  it('follows the list with a break and the rows around you when you are further down', () => {
    const me = buildEntry({ rank: 311, username: 'kubi', isMe: true });
    const neighbors = [
      buildEntry({ rank: 309, username: 'elif' }),
      buildEntry({ rank: 310, username: 'arda' }),
      me,
      buildEntry({ rank: 312, username: 'nil' }),
    ];

    const layout = layoutBoard({ entries: buildEntries(5), me, neighbors });

    expect(lines(layout.climb)).toEqual([
      '4 deniz',
      '5 burak',
      '…',
      '309 elif',
      '310 arda',
      '311 kubi',
      '312 nil',
    ]);
  });

  it('needs no break when your rows continue the list, and never repeats a row', () => {
    const entries = buildEntries(5);
    const me = buildEntry({ rank: 6, username: 'kubi', isMe: true });
    const neighbors = [
      ...entries.slice(3),
      me,
      buildEntry({ rank: 7, username: 'nil' }),
    ];

    const layout = layoutBoard({ entries, me, neighbors });

    expect(lines(layout.climb)).toEqual([
      '4 deniz',
      '5 burak',
      '6 kubi',
      '7 nil',
    ]);
  });

  it('adds nothing when you are already listed', () => {
    const entries = buildEntries(6, { me: 5 });
    const me = entries[4] ?? null;

    const layout = layoutBoard({
      entries,
      me,
      neighbors: entries.slice(2, 6),
    });

    expect(lines(layout.climb)).toEqual(['4 deniz', '5 burak', '6 zeynep']);
  });

  it('puts your own row in place when the neighbours leave it out', () => {
    const me = buildEntry({ rank: 40, username: 'kubi', isMe: true });

    const layout = layoutBoard({ entries: buildEntries(4), me, neighbors: [] });

    expect(lines(layout.climb)).toEqual(['4 deniz', '…', '40 kubi']);
  });

  it('knows when nobody but you is on the board', () => {
    const me = buildEntry({ rank: 1, username: 'kubi', isMe: true });

    expect(layoutBoard({ entries: [], me: null, neighbors: [] }).alone).toBe(
      true,
    );
    expect(layoutBoard({ entries: [me], me, neighbors: [me] }).alone).toBe(
      true,
    );
    expect(
      layoutBoard({ entries: buildEntries(2, { me: 2 }), me, neighbors: [] })
        .alone,
    ).toBe(false);
  });
});

describe('climbKey', () => {
  it('keys a row by rank and name, and the break by itself', () => {
    expect(climbKey({ kind: 'row', entry: buildEntry() })).toBe('4-deniz');
    expect(climbKey({ kind: 'gap' })).toBe('gap');
  });
});

describe('ClimbItemView', () => {
  it('draws a row that opens its player', async () => {
    const entry = buildEntry();
    const onPressEntry = jest.fn();
    await render(
      <ClimbItemView
        item={{ kind: 'row', entry }}
        index={0}
        onPressEntry={onPressEntry}
      />,
    );

    await fireEvent.press(
      screen.getByRole('button', { name: /^4\. sıra, @deniz/ }),
    );

    expect(onPressEntry).toHaveBeenCalledWith(entry);
  });

  it('draws the break as a quiet ellipsis', async () => {
    await render(<ClimbItemView item={{ kind: 'gap' }} index={3} />);

    expect(
      screen.getByLabelText('Arada başka oyuncular var'),
    ).toBeOnTheScreen();
    expect(screen.getByText('…')).toBeOnTheScreen();
  });
});

describe('SummitPodium', () => {
  it('holds the stage with a spinner until the board arrives', async () => {
    await render(
      <BrandBand>
        <SummitPodium board={undefined} podium={[]} />
      </BrandBand>,
    );

    expect(screen.queryByText('—')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });

  it('stands the podium once the board is in, and hands back who was pressed', async () => {
    const entries = buildEntries(3);
    const onPressEntry = jest.fn();
    await render(
      <BrandBand>
        <SummitPodium
          board={{ board: 'weekly', periodKey: '2026-W39', scope: 'everyone' }}
          podium={entries}
          onPressEntry={onPressEntry}
        />
      </BrandBand>,
    );

    await fireEvent.press(
      screen.getByRole('button', { name: /^1\. sıra, @ekin/ }),
    );

    expect(onPressEntry).toHaveBeenCalledWith(entries[0]);
  });
});
