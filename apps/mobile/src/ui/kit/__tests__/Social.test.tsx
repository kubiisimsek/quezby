import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { useLanguage } from '@/i18n/language';
import { Bubble, Count, EventLine, FaceOff, PhraseChip, RunTile, ThreadRow, Toast } from '@/ui/kit';

describe('FaceOff', () => {
  it('sets two players face to face, a gold VS between them', async () => {
    await render(<FaceOff left={{ name: 'ben', caption: 'SEN' }} right={{ name: 'ekin', caption: '@ekin' }} />);

    expect(screen.getByText('VS')).toBeOnTheScreen();
    expect(screen.getByLabelText('SEN VS @ekin')).toBeOnTheScreen();
  });

  it('shows how two who played stand, and says it its own way', async () => {
    await render(
      <FaceOff left={{ name: 'ben' }} right={{ name: 'ekin' }} middle="3 – 2" label="3 galibiyet · 2 yenilgi" />,
    );

    expect(screen.getByText('3 – 2')).toBeOnTheScreen();
    expect(screen.getByLabelText('3 galibiyet · 2 yenilgi')).toBeOnTheScreen();
  });

  it('says VS in Arabic its own way', async () => {
    await act(async () => useLanguage.setState({ locale: 'ar' }));
    await render(<FaceOff left={{ name: 'ben' }} right={{ name: 'ekin' }} />);

    expect(screen.getByText('ضد')).toBeOnTheScreen();
    await act(async () => useLanguage.setState({ locale: 'tr' }));
  });
});

describe('ThreadRow', () => {
  it('shows the friend, the newest line, when it came and what waits unread — and opens', async () => {
    const onPress = jest.fn();
    await render(
      <ThreadRow
        name="ekin"
        title="@ekin"
        line="İyi oyundu! 👏"
        when="5 dk"
        unread={12}
        tag={{ label: 'SENİN SIRAN', tone: 'warn' }}
        label="@ekin. İyi oyundu! 👏. 5 dk. 12 okunmamış mesaj"
        onPress={onPress}
      />,
    );

    expect(screen.getByText('9+')).toBeOnTheScreen();
    expect(screen.getByText('SENİN SIRAN')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: '@ekin. İyi oyundu! 👏. 5 dk. 12 okunmamış mesaj' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('counts nothing when all is read', async () => {
    await render(
      <ThreadRow name="ekin" title="@ekin" line="Selam! 👋" when="dün" unread={0} label="@ekin" onPress={jest.fn()} />,
    );

    expect(screen.queryByText('0')).toBeNull();
  });
});

describe('Count', () => {
  it('writes up to nine, then 9+', async () => {
    await render(<Count value={3} />);
    expect(screen.getByText('3')).toBeOnTheScreen();
  });
});

describe('Bubble and EventLine', () => {
  it('reads a phrase aloud with who said it and when', async () => {
    await render(<Bubble text="Rövanş? 🔥" mine when="şimdi" label="Sen: Rövanş? 🔥" />);

    expect(screen.getByText('Rövanş? 🔥')).toBeOnTheScreen();
    expect(screen.getByLabelText('Sen: Rövanş? 🔥. şimdi')).toBeOnTheScreen();
  });

  it('reads an event with its detail', async () => {
    await render(<EventLine icon="trophy" tone="ok" title="KAZANDIN" detail="12.450 – 9.800" when="3 sa" strong />);

    expect(screen.getByText('KAZANDIN')).toBeOnTheScreen();
    expect(screen.getByLabelText('KAZANDIN. 12.450 – 9.800. 3 sa')).toBeOnTheScreen();
  });
});

describe('PhraseChip', () => {
  it('sends its phrase, and waits while one is on its way', async () => {
    const onPress = jest.fn();
    const { rerender } = await render(<PhraseChip text="Selam! 👋" label="Gönder: Selam! 👋" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Gönder: Selam! 👋' }));
    expect(onPress).toHaveBeenCalledTimes(1);

    await rerender(<PhraseChip text="Selam! 👋" label="Gönder: Selam! 👋" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole('button', { name: 'Gönder: Selam! 👋' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('RunTile', () => {
  it('shows a past game, its score in gold when it is the best, and what became of it', async () => {
    const onPress = jest.fn();
    await render(
      <RunTile
        icon="calendar"
        tone="warn"
        title="Günün akışı #17"
        meta="87 post · 3 dk · 12:30"
        score="12.345"
        best
        bestLabel="REKOR"
        tag={{ label: 'İncelemede', tone: 'secondary' }}
        label="Günün akışı #17, 12.345 puan, 12:30"
        onPress={onPress}
      />,
    );

    expect(screen.getByText('REKOR')).toBeOnTheScreen();
    expect(screen.getByText('İncelemede')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Günün akışı #17, 12.345 puan, 12:30' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('Toast', () => {
  it('drops in with a notification’s words, opens it on a tap, and leaves', async () => {
    const onPress = jest.fn();
    const { rerender } = await render(
      <Toast notice={{ title: 'Quezby', body: '@ekin seni VS’e çağırdı!' }} onPress={onPress} />,
    );

    const toast = screen.getByRole('button', { name: 'Quezby. @ekin seni VS’e çağırdı!' });
    expect(toast.props.accessibilityHint).toBe('Açmak için dokun');
    await fireEvent.press(toast);
    expect(onPress).toHaveBeenCalledTimes(1);

    await rerender(<Toast notice={null} onPress={onPress} />);
  });

  it('shows nothing without a notification', async () => {
    await render(<Toast notice={null} onPress={jest.fn()} />);

    expect(screen.queryByRole('button')).toBeNull();
  });
});
