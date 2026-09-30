import { fireEvent, render, screen } from '@testing-library/react-native';

import { Avatar, IconButton, NoticeCard, Txt } from '@/ui/kit';
import { arena } from '@/ui/tokens';

describe('NoticeCard', () => {
  it('says what it is, its one line and its live line', async () => {
    await render(
      <NoticeCard
        eyebrow="GÜNÜN AKIŞI #17"
        title="Herkes aynı akışı oynar · tek hak"
        meta="Bitmesine 11 sa 0 dk"
        icon="calendar"
      />,
    );

    expect(screen.getByText('GÜNÜN AKIŞI #17')).toBeOnTheScreen();
    expect(screen.getByText('Herkes aynı akışı oynar · tek hak')).toBeOnTheScreen();
    expect(screen.getByText('Bitmesine 11 sa 0 dk')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });

  it('shrinks a long title onto its line, unless the title always fits', async () => {
    await render(
      <>
        <NoticeCard eyebrow="GÜNÜN AKIŞI #17" title="Herkes aynı akışı oynar · tek hak" icon="calendar" />
        <NoticeCard eyebrow="LİG" title="Gümüş lig · 1.100 Elo" icon="shield" fit={false} />
      </>,
    );

    expect(screen.getByText('Herkes aynı akışı oynar · tek hak').props.adjustsFontSizeToFit).toBe(true);
    expect(screen.getByText('Gümüş lig · 1.100 Elo').props.adjustsFontSizeToFit).toBe(false);
  });

  it('keeps its body and its answers two targets: ✓ never opens the body', async () => {
    const open = jest.fn();
    const accept = jest.fn();
    await render(
      <NoticeCard
        eyebrow="SENİ BEKLEYEN VS"
        title="@deniz sana VS attı"
        lead={<Avatar name="deniz" size="md" />}
        accessibilityLabel="@deniz sana VS attı, sohbeti aç"
        onPress={open}
        right={<IconButton icon="check" label="Kabul et" tone="ok" size="sm" onPress={accept} />}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Kabul et' }));
    expect(accept).toHaveBeenCalledTimes(1);
    expect(open).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: '@deniz sana VS attı, sohbeti aç' }));
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('takes a node for its live line — a countdown, a meter, a tag', async () => {
    await render(
      <NoticeCard eyebrow="LİG" title="#7/30 · 17.000 puan" meta={<Txt variant="micro">Terfiye 1.001 puan</Txt>} />,
    );

    expect(screen.getByText('Terfiye 1.001 puan')).toBeOnTheScreen();
  });

  it('lights a notice not seen yet', async () => {
    await render(<NoticeCard eyebrow="VS" title="@deniz sana VS attı" fresh />);

    expect(screen.getByText('VS')).toHaveStyle({ color: arena.primaryText });

    await screen.rerender(<NoticeCard eyebrow="VS" title="@deniz sana VS attı" />);
    expect(screen.getByText('VS')).toHaveStyle({ color: arena.inkFaint });
  });

  it('speaks as one when it only shows', async () => {
    await render(
      <NoticeCard eyebrow="SIRALAMA" title="Bu cihazda kapalı" accessibilityLabel="Bu cihazda kapalı, skorların sıralamaya girmez" />,
    );

    expect(screen.getByLabelText('Bu cihazda kapalı, skorların sıralamaya girmez')).toBeOnTheScreen();
  });
});
