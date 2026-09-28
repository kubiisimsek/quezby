import { NOTICES, RECEIPT_ITEMS, STICKERS, type Localized, type Post, type PostBody } from '@quezby/config';

import { AXIS_POINTS, LAYOUTS, PATTERNS, chartPoints, dressOf, mediaOf, type Media } from '@/game/dress';

/** Words that say which language they are in. */
function words(text: string): Localized {
  return { tr: `tr ${text}`, en: `en ${text}`, de: `de ${text}`, ar: `ar ${text}`, fr: `fr ${text}`, es: `es ${text}` };
}

function post(body: PostBody): Post {
  return { id: 'skip-900', emoji: '☕️', user: words('@user'), caption: words('caption'), headline: null, body };
}

function media<F extends Media['format']>(format: F, body: PostBody, seed = 42, index = 3, locale: 'tr' | 'en' = 'tr') {
  const result = mediaOf(post(body), seed, index, locale);
  if (result.format !== format) throw new Error(`expected ${format}, got ${result.format}`);
  return result as Extract<Media, { format: F }>;
}

const CHAT: PostBody = {
  format: 'chat',
  contact: words('Kanka'),
  lines: [
    { from: 'them', text: words('neredesin?') },
    { from: 'me', text: words('yoldayım') },
    { from: 'me', text: words('şimdi çıkıyorum') },
  ],
};

describe('dressOf', () => {
  it('dresses a reel the same way every time: the daily feed is one look for everyone', () => {
    const scene = post({ format: 'scene' });
    expect(dressOf(scene, 7919, 12)).toEqual(dressOf(scene, 7919, 12));
  });

  it('keeps every choice inside what the format can wear', () => {
    for (let index = 0; index < 200; index += 1) {
      const dress = dressOf(post({ format: 'scene' }), 2024, index);
      expect(PATTERNS).toContain(dress.pattern);
      expect(dress.layout).toBeGreaterThanOrEqual(0);
      expect(dress.layout).toBeLessThan(LAYOUTS.scene);
      expect(dress.tilt).toBeGreaterThanOrEqual(-5);
      expect(dress.tilt).toBeLessThanOrEqual(5);
      expect(STICKERS).toContain(dress.sticker);
    }
    expect(dressOf(post({ format: 'treasure' }), 1, 1).layout).toBeLessThan(LAYOUTS.treasure);
  });

  it('dresses one post differently from run to run', () => {
    const scene = post({ format: 'scene' });
    const looks = new Set(
      Array.from({ length: 40 }, (_, seed) => {
        const dress = dressOf(scene, seed * 977, 5);
        return `${dress.pattern}/${dress.layout}`;
      }),
    );
    expect(looks.size).toBeGreaterThan(10);
  });
});

describe('mediaOf', () => {
  it('speaks the language it is asked for', () => {
    expect(media('chat', CHAT, 1, 1, 'en').contact).toBe('en Kanka');
    expect(media('chat', CHAT, 1, 1, 'tr').lines.map((line) => line.text)).toEqual([
      'tr neredesin?',
      'tr yoldayım',
      'tr şimdi çıkıyorum',
    ]);
  });

  it('times a chat at its first message and, a while later, at its punchline', () => {
    const chat = media('chat', CHAT);
    expect(chat.lines[0]?.stamp).toMatch(/^\d{2}:\d{2}$/);
    expect(chat.lines[1]?.stamp).toBeNull();
    expect(chat.lines[2]?.stamp).toMatch(/^\d{2}:\d{2}$/);
    expect(chat.lines[2]?.stamp).not.toBe(chat.lines[0]?.stamp);
    expect(chat.avatar).not.toBe('');
  });

  it('gives a poll’s winner the landslide and the shares a whole hundred', () => {
    for (let index = 0; index < 100; index += 1) {
      const poll = media(
        'poll',
        { format: 'poll', question: words('?'), options: [words('a'), words('b'), words('c')], winner: 1 },
        5,
        index,
      );
      const shares = poll.options.map((option) => option.share);
      expect(shares.reduce((sum, share) => sum + share, 0)).toBe(100);
      expect(poll.options[1]?.winner).toBe(true);
      expect(poll.options[1]?.share).toBeGreaterThanOrEqual(75);
      expect(Math.max(...shares)).toBe(poll.options[1]?.share);
      expect(poll.votes).toBeGreaterThanOrEqual(800);
    }
  });

  it('draws a chart’s line in its shape, one point for each mark on its axis', () => {
    const fall = chartPoints('fall', AXIS_POINTS.days, 3, 4);
    expect(fall).toHaveLength(7);
    expect(fall[0]).toBeGreaterThan(fall[6] ?? 100);
    const rise = chartPoints('rise', AXIS_POINTS.months, 3, 4);
    expect(rise).toHaveLength(6);
    expect(rise[5]).toBeGreaterThan(rise[0] ?? 0);
    for (const shape of ['crash', 'spike', 'flat', 'zigzag'] as const) {
      for (const point of chartPoints(shape, 6, 9, 9)) {
        expect(point).toBeGreaterThanOrEqual(4);
        expect(point).toBeLessThanOrEqual(96);
      }
    }
    const chart = media('chart', { format: 'chart', title: words('T'), value: null, shape: 'spike', axis: 'hours' });
    expect(chart.points).toHaveLength(AXIS_POINTS.hours);
    expect(chart.value).toBeNull();
  });

  it('fills a receipt: the post’s items first, three from the basket, and their total', () => {
    const receipt = media('receipt', { format: 'receipt', store: words('MARKET'), items: [words('EKMEK')] });
    const lines = 1 + Math.min(3, RECEIPT_ITEMS.length);
    expect(receipt.store).toBe('tr MARKET');
    expect(receipt.lines).toHaveLength(lines);
    expect(receipt.lines[0]).toMatchObject({ text: 'tr EKMEK', qty: 1 });
    const pool = RECEIPT_ITEMS.map((item) => item.tr);
    for (const line of receipt.lines.slice(1)) {
      expect(pool).toContain(line.text);
      expect(line.qty).toBeGreaterThanOrEqual(1);
      expect(line.cents % 50).toBe(0);
    }
    expect(new Set(receipt.lines.map((line) => line.text)).size).toBe(lines);
    expect(receipt.total).toBe(receipt.lines.reduce((sum, line) => sum + line.qty * line.cents, 0));
    expect(receipt.number).toMatch(/^\d{4}$/);
  });

  it('piles a lock screen: the post’s notification now, the everyday ones older and older', () => {
    const screen = media('notifications', {
      format: 'notifications',
      first: { icon: '⏳', app: words('Ekran süresi'), text: words('9 sa') },
    });
    expect(screen.clock).toMatch(/^\d{2}:\d{2}$/);
    expect(screen.notices[0]).toEqual({ icon: '⏳', app: 'tr Ekran süresi', text: 'tr 9 sa', minutes: 0 });
    const pile = screen.notices.slice(1);
    expect(pile).toHaveLength(Math.min(3, NOTICES.length));
    pile.forEach((notice, i) => {
      expect(notice.minutes).toBeGreaterThan(i === 0 ? 0 : (pile[i - 1]?.minutes ?? 0));
    });
  });

  it('picks four different photos of a dump', () => {
    const dump = media('dump', { format: 'dump', emojis: ['🏖️', '🌅', '🍉', '🩴', '🕶️'] });
    expect(dump.photos).toHaveLength(4);
    expect(new Set(dump.photos).size).toBe(4);
  });

  it('numbers a camera and runs its clock', () => {
    const camera = media('cctv', { format: 'cctv', place: words('SALON') });
    expect(camera.place).toBe('tr SALON');
    expect(camera.camera).toBeGreaterThanOrEqual(1);
    expect(camera.camera).toBeLessThanOrEqual(8);
    expect(camera.time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('passes the rest of the formats’ words through', () => {
    expect(media('fact', { format: 'fact', eyebrow: null, big: words('7'), text: words('kez') }).eyebrow).toBeNull();
    expect(media('tier', { format: 'tier', title: words('T'), rows: [['🍳'], ['🥐'], ['🥣'], ['🥗']] }).rows).toEqual([
      ['🍳'],
      ['🥐'],
      ['🥣'],
      ['🥗'],
    ]);
    expect(media('quote', { format: 'quote', text: words('yarın') }).text).toBe('tr yarın');
    expect(media('polaroid', { format: 'polaroid', note: words('o bakış') }).note).toBe('tr o bakış');
    expect(media('sign', { format: 'sign', sign: words('YAŞ BOYA'), small: words('DOKUNMA') })).toEqual({
      format: 'sign',
      sign: 'tr YAŞ BOYA',
      small: 'tr DOKUNMA',
    });
    expect(mediaOf(post({ format: 'treasure' }), 1, 1, 'tr')).toEqual({ format: 'treasure' });
  });
});
