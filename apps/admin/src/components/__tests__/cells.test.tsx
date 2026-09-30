import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EloDelta, FlagTags, PlayerCell, TierTag, When } from '@/lib/columns';
import { renderWithProviders } from '@/test/render';

describe('When', () => {
  it('keeps a moment on one line, with the exact time on hover', () => {
    renderWithProviders(<When at="2026-09-25T11:05:00.000Z" as="dateTime" />);

    const time = screen.getByText('25 Eyl 2026 14:05');
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute('datetime', '2026-09-25T11:05:00.000Z');
    expect(time).toHaveAttribute('title', '25 Eyl 2026 14:05');
    expect(time).toHaveClass('whitespace-nowrap');
  });

  it('reads as time ago unless told otherwise', () => {
    const at = new Date(Date.now() - 12 * 60_000).toISOString();
    renderWithProviders(
      <>
        <When at={at} />
        <When at="2026-09-25T21:30:00.000Z" as="date" />
      </>,
    );

    expect(screen.getByText('12 dk önce')).toHaveAttribute('datetime', at);
    expect(screen.getByText('26 Eyl 2026')).toBeInTheDocument();
  });

  it('dashes a moment that never came', () => {
    const { container } = renderWithProviders(<When at={null} />);

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(container.querySelector('time')).toBeNull();
  });
});

describe('FlagTags', () => {
  it('puts the hard signals first and counts what does not fit', () => {
    renderWithProviders(
      <FlagTags
        max={2}
        flags={[
          { code: 'reaction_cv', severity: 'soft', details: {} },
          { code: 'wall_clock', severity: 'hard', details: {} },
          { code: 'fast_decisions', severity: 'soft', details: {} },
        ]}
      />,
    );

    const words = screen.getAllByText(/Süre tutmuyor|Makine gibi ritim|İnsanüstü hız|\+1/).map((tag) => tag.textContent);
    expect(words).toEqual(['Süre tutmuyor', 'Makine gibi ritim', '+1']);
  });

  it('dashes a clean run', () => {
    renderWithProviders(<FlagTags flags={[]} />);

    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('PlayerCell', () => {
  it('names the player, says a ban out loud and links when asked', () => {
    renderWithProviders(<PlayerCell player={{ id: '01jplayer00000000000000000a', username: 'kerem.35', bannedAt: '2026-09-24T10:00:00.000Z' }} hint="Son sinyal dün" link />);

    expect(screen.getByRole('link', { name: '@kerem.35' })).toHaveAttribute('href', '/players/01jplayer00000000000000000a');
    expect(screen.getByText('Yasaklı')).toBeInTheDocument();
    expect(screen.getByText('Son sinyal dün')).toBeInTheDocument();
  });

  it('shows the player\'s photo where the row carries it, and initials where it does not', () => {
    const photo = 'https://api.quezby.com/api/v1/media/avatars/0123456789abcdef01234567.jpg';
    const player = { id: '01jplayer00000000000000000a', username: 'kerem.35', bannedAt: null };
    const { container } = renderWithProviders(
      <>
        <PlayerCell player={player} avatarUrl={photo} />
        <PlayerCell player={{ ...player, id: '01jplayer00000000000000000b', username: 'ekin' }} />
      </>,
    );

    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(container.querySelector('img')).toHaveAttribute('src', photo);
    expect(screen.getByText('EK')).toBeInTheDocument();
  });

  it('says so when the player is gone', () => {
    renderWithProviders(<PlayerCell player={null} />);

    expect(screen.getByText('Silinmiş oyuncu')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('TierTag', () => {
  it('names the league', () => {
    renderWithProviders(
      <>
        <TierTag tier="gold" />
        <TierTag tier="master" />
      </>,
    );

    expect(screen.getByText('Altın')).toBeInTheDocument();
    expect(screen.getByText('MasterClass')).toBeInTheDocument();
  });
});

describe('EloDelta', () => {
  it('signs a move and colours it by its news: green up, red down, grey for none', () => {
    renderWithProviders(
      <>
        <EloDelta value={42} />
        <EloDelta value={-18} />
        <EloDelta value={0} />
        <EloDelta value={50} unit />
      </>,
    );

    expect(screen.getByText('+42')).toHaveClass('text-ok-text');
    expect(screen.getByText('−18')).toHaveClass('text-bad-text');
    expect(screen.getByText('0')).toHaveClass('text-ink-muted');
    expect(screen.getByText('+50 qb')).toHaveClass('text-ok-text');
  });
});

