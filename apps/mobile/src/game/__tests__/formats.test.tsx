import { render, screen } from '@testing-library/react-native';

import type { Dress, Media } from '@/game/dress';
import { Backdrop } from '@/game/formats/Backdrop';
import { Cctv } from '@/game/formats/Cctv';
import { Chart } from '@/game/formats/Chart';
import { Chat } from '@/game/formats/Chat';
import { Dump } from '@/game/formats/Dump';
import { Fact } from '@/game/formats/Fact';
import { Notifications } from '@/game/formats/Notifications';
import { Polaroid } from '@/game/formats/Polaroid';
import { Poll } from '@/game/formats/Poll';
import { Quote } from '@/game/formats/Quote';
import { Receipt } from '@/game/formats/Receipt';
import { Scene } from '@/game/formats/Scene';
import { Sign } from '@/game/formats/Sign';
import { Tier } from '@/game/formats/Tier';
import { Treasure } from '@/game/formats/Treasure';
import { useLanguage } from '@/i18n/language';

type Of<F extends Media['format']> = Extract<Media, { format: F }>;

function dress(layout: number): Dress {
  return { pattern: 'dots', layout, tilt: 2, sticker: '✨' };
}

const POLL: Of<'poll'> = {
  format: 'poll',
  question: 'Pazartesi iptal edilsin mi?',
  options: [
    { text: 'Evet', share: 97, winner: true },
    { text: 'Hayır', share: 3, winner: false },
  ],
  votes: 12408,
};

const RECEIPT: Of<'receipt'> = {
  format: 'receipt',
  store: 'MARKET',
  number: '0042',
  time: '23:41',
  lines: [
    { text: 'EKMEK', qty: 1, cents: 1500 },
    { text: 'ÇİKOLATA', qty: 4, cents: 4500 },
  ],
  total: 19500,
};

const NOTICES: Of<'notifications'> = {
  format: 'notifications',
  clock: '09:41',
  notices: [
    { icon: '⏳', app: 'Ekran süresi', text: 'Günlük ortalaman 9 sa', minutes: 0 },
    { icon: '🔋', app: 'Pil', text: '%3 kaldı', minutes: 5 },
    { icon: '📦', app: 'Kargo', text: 'Paketin yolda', minutes: 130 },
  ],
};

describe('the formats', () => {
  it('draws a chat screenshot: the contact, who is online, the messages and their times', async () => {
    await render(
      <Chat
        media={{
          format: 'chat',
          contact: 'Kanka',
          avatar: '😎',
          lines: [
            { from: 'them', text: 'neredesin?', stamp: '14:02' },
            { from: 'me', text: 'yoldayım, 5 dk', stamp: null },
            { from: 'me', text: 'tamam çıkıyorum', stamp: '16:47' },
          ],
        }}
      />,
    );

    expect(screen.getByText('Kanka')).toBeOnTheScreen();
    expect(screen.getByText('çevrimiçi')).toBeOnTheScreen();
    expect(screen.getByText('yoldayım, 5 dk')).toBeOnTheScreen();
    expect(screen.getByText('14:02')).toBeOnTheScreen();
    expect(screen.getByText('16:47')).toBeOnTheScreen();
  });

  it('draws a poll: its ribbon, each answer’s share and the votes', async () => {
    await render(<Poll media={POLL} />);

    expect(screen.getByText('ANKET')).toBeOnTheScreen();
    expect(screen.getByText('Pazartesi iptal edilsin mi?')).toBeOnTheScreen();
    expect(screen.getByText('%97')).toBeOnTheScreen();
    expect(screen.getByText('%3')).toBeOnTheScreen();
    expect(screen.getByText('12.408 oy')).toBeOnTheScreen();
  });

  it('draws a chart: its title, its figure and the week under the line', async () => {
    await render(
      <Chart
        media={{ format: 'chart', title: 'MOTİVASYONUM', value: '−%100', axis: 'days', points: [90, 80, 60, 40, 30, 20, 10] }}
        emoji="📉"
      />,
    );

    expect(screen.getByText('MOTİVASYONUM')).toBeOnTheScreen();
    expect(screen.getByText('−%100')).toBeOnTheScreen();
    for (const day of ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']) expect(screen.getByText(day)).toBeOnTheScreen();
    expect(screen.getByText('📉')).toBeOnTheScreen();

    await screen.rerender(
      <Chart media={{ format: 'chart', title: 'GECE', value: null, axis: 'hours', points: [10, 10, 10, 10, 90, 10] }} emoji="🧊" />,
    );
    expect(screen.getByText('09')).toBeOnTheScreen();
    expect(screen.getByText('24')).toBeOnTheScreen();
  });

  it('prints a receipt: the shop, its number and time, the lines and the total', async () => {
    await render(<Receipt media={RECEIPT} angle={-3} />);

    expect(screen.getByText('MARKET')).toBeOnTheScreen();
    expect(screen.getByText('FİŞ NO 0042 · 23:41')).toBeOnTheScreen();
    expect(screen.getByText('EKMEK')).toBeOnTheScreen();
    expect(screen.getByText('15,00')).toBeOnTheScreen();
    expect(screen.getByText('ÇİKOLATA ×4')).toBeOnTheScreen();
    expect(screen.getByText('180,00')).toBeOnTheScreen();
    expect(screen.getByText('TOPLAM')).toBeOnTheScreen();
    expect(screen.getByText('195,00')).toBeOnTheScreen();
  });

  it('shows a big number under the post’s ribbon, or asks “did you know?”', async () => {
    await render(
      <Fact media={{ format: 'fact', eyebrow: null, big: '2.617', text: 'kez telefona dokundun' }} emoji="📱" dress={dress(0)} />,
    );
    expect(screen.getByText('BİLİYOR MUYDUN?')).toBeOnTheScreen();
    expect(screen.getByText('2.617')).toBeOnTheScreen();
    expect(screen.getByText('✨')).toBeOnTheScreen();

    await screen.rerender(
      <Fact media={{ format: 'fact', eyebrow: 'BUGÜNÜN İSTATİSTİĞİ', big: '7', text: 'kez' }} emoji="🧊" dress={dress(1)} />,
    );
    expect(screen.getByText('BUGÜNÜN İSTATİSTİĞİ')).toBeOnTheScreen();
    expect(screen.getByText('🧊')).toBeOnTheScreen();
  });

  it('ranks a tier list from S to C', async () => {
    await render(
      <Tier media={{ format: 'tier', title: 'KAHVALTI TIER LIST', rows: [['🍳', '🧀'], ['🥐'], ['🥣'], ['🥗']] }} />,
    );

    expect(screen.getByText('KAHVALTI TIER LIST')).toBeOnTheScreen();
    for (const letter of ['S', 'A', 'B', 'C']) expect(screen.getByText(letter)).toBeOnTheScreen();
    expect(screen.getByText('🧀')).toBeOnTheScreen();
  });

  it('lights a lock screen: the clock, the post’s notification now, the rest older', async () => {
    await render(<Notifications media={NOTICES} />);

    expect(screen.getByText('09:41')).toBeOnTheScreen();
    expect(screen.getByText('Günlük ortalaman 9 sa')).toBeOnTheScreen();
    expect(screen.getByText('şimdi')).toBeOnTheScreen();
    expect(screen.getByText('5 dk')).toBeOnTheScreen();
    expect(screen.getByText('2 sa')).toBeOnTheScreen();
  });

  it('signs a quote with the account that posted it', async () => {
    await render(<Quote media={{ format: 'quote', text: 'Yarın başlarım.' }} user="@guzel.sozler" dress={dress(1)} />);

    expect(screen.getByText('Yarın başlarım.')).toBeOnTheScreen();
    expect(screen.getByText('— @guzel.sozler')).toBeOnTheScreen();
  });

  it('frames a friend’s photos: a polaroid with its note, a dump of four', async () => {
    await render(<Polaroid media={{ format: 'polaroid', note: 'o bakış…' }} emoji="🐱" dress={dress(1)} />);
    expect(screen.getByText('o bakış…')).toBeOnTheScreen();
    expect(screen.getByText('🐱')).toBeOnTheScreen();

    const photos = ['🏖️', '🌅', '🍉', '🩴'];
    await screen.rerender(<Dump media={{ format: 'dump', photos }} dress={dress(0)} />);
    for (const photo of photos) expect(screen.getByText(photo)).toBeOnTheScreen();

    await screen.rerender(<Dump media={{ format: 'dump', photos }} dress={dress(1)} />);
    expect(screen.getByText('1/4')).toBeOnTheScreen();
  });

  it('sets a gold post’s prize on its pedestal or in a medallion', async () => {
    await render(<Treasure emoji="💎" dress={dress(0)} />);
    expect(screen.getByText('💎')).toBeOnTheScreen();

    await screen.rerender(<Treasure emoji="👑" dress={dress(1)} />);
    expect(screen.getByText('👑')).toBeOnTheScreen();
  });

  it('warns on a sign and watches through a camera', async () => {
    await render(<Sign media={{ format: 'sign', sign: 'YAŞ BOYA', small: 'DOKUNMAYINIZ' }} emoji="🎨" dress={dress(1)} />);
    expect(screen.getByText('YAŞ BOYA')).toBeOnTheScreen();
    expect(screen.getByText('DOKUNMAYINIZ')).toBeOnTheScreen();

    await screen.rerender(
      <Cctv media={{ format: 'cctv', place: 'SALON', camera: 3, time: '23:12:45' }} emoji="👀" dress={dress(1)} />,
    );
    expect(screen.getByText('REC')).toBeOnTheScreen();
    expect(screen.getByText('KAM 3')).toBeOnTheScreen();
    expect(screen.getByText('SALON')).toBeOnTheScreen();
    expect(screen.getByText('23:12:45')).toBeOnTheScreen();
    expect(screen.getByText('KAM 4')).toBeOnTheScreen();
  });

  it('frames a scene five ways', async () => {
    const testIDs = ['scene-disc', 'scene-crop', 'scene-frame', 'scene-wallpaper', 'scene-spotlight'];
    for (const [layout, testID] of testIDs.entries()) {
      await render(<Scene emoji="☕️" caption="POV: pazartesi sabahı" kind="skip" dress={dress(layout)} />);
      expect(screen.getByTestId(testID)).toBeOnTheScreen();
    }
    expect(screen.getByText('✨')).toBeOnTheScreen();

    await render(<Scene emoji="☕️" caption="POV: pazartesi sabahı" kind="skip" dress={dress(1)} />);
    expect(screen.getByText('POV: pazartesi sabahı')).toBeOnTheScreen();
  });

  it('lays each kind’s backdrop: a pattern, the glows, rays, tape or a camera’s lines', async () => {
    await render(<Backdrop kind="skip" format="chat" pattern="waves" paused={false} />);
    expect(screen.getByTestId('backdrop-waves')).toBeOnTheScreen();

    await screen.rerender(<Backdrop kind="hold" format="treasure" pattern="dots" paused={false} />);
    expect(screen.getByTestId('backdrop-rays')).toBeOnTheScreen();

    await screen.rerender(<Backdrop kind="freeze" format="sign" pattern="dots" paused={false} />);
    expect(screen.getByTestId('backdrop-tape')).toBeOnTheScreen();

    await screen.rerender(<Backdrop kind="freeze" format="cctv" pattern="dots" paused={false} />);
    expect(screen.getByTestId('backdrop-scan')).toBeOnTheScreen();
  });

  it('speaks English: the chrome, the votes and the prices', async () => {
    useLanguage.setState({ locale: 'en' });
    await render(<Poll media={POLL} />);
    expect(screen.getByText('POLL')).toBeOnTheScreen();
    expect(screen.getByText('97%')).toBeOnTheScreen();
    expect(screen.getByText('12,408 votes')).toBeOnTheScreen();

    await screen.rerender(<Receipt media={RECEIPT} angle={0} />);
    expect(screen.getByText('RECEIPT #0042 · 23:41')).toBeOnTheScreen();
    expect(screen.getByText('180.00')).toBeOnTheScreen();
    expect(screen.getByText('TOTAL')).toBeOnTheScreen();

    await screen.rerender(<Notifications media={NOTICES} />);
    expect(screen.getByText('now')).toBeOnTheScreen();
    expect(screen.getByText('5m')).toBeOnTheScreen();
    expect(screen.getByText('2h')).toBeOnTheScreen();
  });

  it('speaks Arabic, its votes counted in its own forms', async () => {
    useLanguage.setState({ locale: 'ar' });
    await render(<Poll media={POLL} />);
    expect(screen.getByText('استطلاع')).toBeOnTheScreen();
    expect(screen.getByText('12,408 أصوات')).toBeOnTheScreen();

    await screen.rerender(<Poll media={{ ...POLL, votes: 1011 }} />);
    expect(screen.getByText('1,011 صوتًا')).toBeOnTheScreen();

    await screen.rerender(<Poll media={{ ...POLL, votes: 12400 }} />);
    expect(screen.getByText('12,400 صوت')).toBeOnTheScreen();
  });
});
