import { fireEvent, render, screen } from '@testing-library/react-native';

import { buildEntry } from '@/test/factories';
import { ClimbRow } from '@/ui/kit';
import { arena as light } from '@/ui/tokens';

describe('ClimbRow', () => {
  it('shows rank, player, score, reels and the gap to the row above', async () => {
    const entry = buildEntry({
      rank: 4,
      username: 'deniz',
      score: 9_870,
      reels: 64,
      gap: 1_240,
    });
    await render(<ClimbRow {...entry} />);

    expect(screen.getByText('4')).toBeOnTheScreen();
    expect(screen.getByText('@deniz')).toBeOnTheScreen();
    expect(screen.getByText('9.870')).toBeOnTheScreen();
    expect(screen.getByText('64 reel')).toBeOnTheScreen();
    expect(screen.getByText('▲ 1.240')).toBeOnTheScreen();
    expect(
      screen.getByLabelText(
        '4. sıra, @deniz, 9.870 puan, geçmek için 1.240 puan',
      ),
    ).toBeOnTheScreen();
  });

  it('hides the gap pill when there is nobody to pass', async () => {
    await render(<ClimbRow {...buildEntry({ gap: null })} />);

    expect(screen.queryByText(/▲/)).not.toBeOnTheScreen();
    expect(
      screen.getByLabelText('4. sıra, @deniz, 9.870 puan'),
    ).toBeOnTheScreen();
  });

  it('groups big ranks and leaves reels out when not given', async () => {
    await render(
      <ClimbRow
        rank={1_204}
        username="mert"
        score={120}
        gap={3}
        isMe={false}
      />,
    );

    expect(screen.getByText('1.204')).toBeOnTheScreen();
    expect(screen.queryByText(/reel/)).not.toBeOnTheScreen();
  });

  it('says one more fact under the name when given a detail', async () => {
    await render(
      <ClimbRow
        rank={2}
        username="oya"
        score={31_400}
        detail="3 gün"
        gap={120}
        isMe={false}
      />,
    );

    expect(screen.getByText('3 gün')).toBeOnTheScreen();
    expect(screen.queryByText(/reel/)).not.toBeOnTheScreen();
    expect(
      screen.getByLabelText(
        '2. sıra, @oya, 31.400 puan, 3 gün, geçmek için 120 puan',
      ),
    ).toBeOnTheScreen();
  });

  it('keeps the reels first when a detail comes with them', async () => {
    await render(<ClimbRow {...buildEntry({ reels: 64 })} detail="3 gün" />);

    expect(screen.getByText('64 reel · 3 gün')).toBeOnTheScreen();
  });

  it('marks your own row as a magenta tile, with your place in gold', async () => {
    await render(
      <ClimbRow {...buildEntry({ isMe: true, username: 'ekin', rank: 44 })} />,
    );

    expect(screen.getByText('· sen')).toBeOnTheScreen();
    expect(screen.getByLabelText(/^44\. sıra, @ekin, sen,/)).toHaveStyle({
      backgroundColor: light.primarySoft,
      borderColor: light.outline,
    });
    expect(screen.getByText('44')).toHaveStyle({ color: light.gold });
  });

  it("stands everyone else's row on the violet tile", async () => {
    await render(<ClimbRow {...buildEntry()} />);

    expect(screen.getByLabelText(/^4\. sıra, @deniz,/)).toHaveStyle({
      backgroundColor: light.tile,
      borderColor: light.outline,
    });
    expect(screen.getByText('4')).toHaveStyle({ color: light.ink });
  });

  it('strikes the top three places in their metal', async () => {
    await render(
      <>
        <ClimbRow rank={1} username="ekin" score={900} gap={null} isMe />
        <ClimbRow rank={2} username="mert" score={800} gap={101} isMe={false} />
        <ClimbRow rank={3} username="oya" score={700} gap={101} isMe={false} />
      </>,
    );

    expect(screen.getByText('1')).toHaveStyle({ color: light.medalGoldInk });
    expect(screen.getByText('2')).toHaveStyle({ color: light.medalSilverInk });
    expect(screen.getByText('3')).toHaveStyle({ color: light.medalBronzeInk });
  });

  it('draws the gap to the row above in green, solid on your own row', async () => {
    await render(
      <>
        <ClimbRow {...buildEntry({ gap: 1_240 })} />
        <ClimbRow
          {...buildEntry({ rank: 5, username: 'kubi', isMe: true, gap: 75 })}
        />
      </>,
    );

    expect(screen.getByText('▲ 1.240')).toHaveStyle({ color: light.okText });
    expect(screen.getByText('▲ 75')).toHaveStyle({ color: light.outline });
  });

  it('is a button only when it has somewhere to go', async () => {
    const onPress = jest.fn();
    await render(<ClimbRow {...buildEntry()} onPress={onPress} />);

    await fireEvent.press(
      screen.getByRole('button', { name: /^4\. sıra, @deniz/ }),
    );
    expect(onPress).toHaveBeenCalledTimes(1);

    await screen.rerender(<ClimbRow {...buildEntry()} />);
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });
});
