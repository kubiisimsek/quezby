import { render, screen } from '@testing-library/react-native';

import { Portrait, SeasonBest } from '@/components/PlayerCard';

describe('Portrait', () => {
  it('draws the initials, and leaves the name to the text beside it', async () => {
    await render(<Portrait name="kubi.01" isMe />);

    expect(screen.queryByText('KU')).toBeNull();
    expect(
      screen.getByText('KU', { includeHiddenElements: true }),
    ).toBeTruthy();
  });
});

describe('SeasonBest', () => {
  it('shows the season best the API sent, and how long the run lasted', async () => {
    await render(
      <SeasonBest
        best={{
          score: 41_200,
          reels: 210,
          achievedAt: '2026-09-24T09:30:00.000Z',
        }}
      />,
    );

    expect(screen.getByLabelText('Sezon rekoru: 41.200')).toBeTruthy();
    expect(screen.getByText('Sezon rekoru')).toBeTruthy();
    expect(screen.getByText('41.200')).toBeTruthy();
    expect(screen.getByText('210 reel')).toBeTruthy();
  });

  it('says "—" before the season’s first ranked run', async () => {
    await render(<SeasonBest best={null} />);

    expect(screen.getByLabelText('Sezon rekoru: —')).toBeTruthy();
    expect(screen.queryByText(/reel$/)).toBeNull();
  });
});
