import {
  AVATARS,
  NOTICES,
  RECEIPT_ITEMS,
  SALT,
  STICKERS,
  mix,
  type ChartAxis,
  type ChartShape,
  type Post,
  type PostFormat,
} from '@quezby/config';
import type { Locale } from '@quezby/types';

/**
 * How one reel draws its post. The catalog says what a post is — a chat, a
 * poll, a receipt — and this picks how it looks this time: the pattern on the
 * kind's colour, the format's layout, a tilt, a sticker, and the parts a
 * format borrows (a receipt's other items, a lock screen's other
 * notifications, a poll's shares). All of it comes from the seed and the
 * reel's place: a run always looks the same — the daily feed is one look for
 * everyone — and the same post dresses differently in another run. None of
 * it reaches the rules or the API.
 */

/** The faint patterns an ordinary or a friend's post may wear over its colour. */
export const PATTERNS = ['plain', 'dots', 'stripes', 'grid', 'waves', 'confetti'] as const;
export type Pattern = (typeof PATTERNS)[number];

/** How many ways each format lays itself out. */
export const LAYOUTS: Readonly<Record<PostFormat, number>> = {
  scene: 5,
  chat: 1,
  poll: 1,
  chart: 1,
  receipt: 1,
  fact: 2,
  tier: 1,
  notifications: 1,
  quote: 2,
  polaroid: 2,
  dump: 2,
  treasure: 2,
  sign: 2,
  cctv: 2,
};

/** What every format wears. */
export type Dress = {
  pattern: Pattern;
  /** Which of the format's `LAYOUTS` it takes. */
  layout: number;
  /** Degrees, -5 to 5: a photo or a receipt never lies quite straight. */
  tilt: number;
  sticker: string;
};

/** A receipt's line: what, how many, and the unit price in cents. */
export type ReceiptLine = { text: string; qty: number; cents: number };

/** A lock screen's notification; `minutes` since it came, 0 for now. */
export type NoticeLine = { icon: string; app: string; text: string; minutes: number };

/** A post's format with its words in one language and the parts it borrowed. */
export type Media =
  | { format: 'scene' }
  | {
      format: 'chat';
      contact: string;
      avatar: string;
      lines: { from: 'me' | 'them'; text: string; stamp: string | null }[];
    }
  | { format: 'poll'; question: string; options: { text: string; share: number; winner: boolean }[]; votes: number }
  | { format: 'chart'; title: string; value: string | null; axis: ChartAxis; points: number[] }
  | { format: 'receipt'; store: string; number: string; time: string; lines: ReceiptLine[]; total: number }
  | { format: 'fact'; eyebrow: string | null; big: string; text: string }
  | { format: 'tier'; title: string; rows: string[][] }
  | { format: 'notifications'; clock: string; notices: NoticeLine[] }
  | { format: 'quote'; text: string }
  | { format: 'polaroid'; note: string }
  | { format: 'dump'; photos: string[] }
  | { format: 'treasure' }
  | { format: 'sign'; sign: string; small: string }
  | { format: 'cctv'; place: string; camera: number; time: string };

/** One choice per salt after `SALT.dress`, so no two choices move together. */
const PICK = {
  pattern: 0,
  layout: 1,
  tilt: 2,
  sticker: 3,
  avatar: 4,
  clock: 5,
  gap: 6,
  share: 7,
  votes: 8,
  number: 9,
  camera: 10,
  /** Parts drawn one after another take the salts from here on. */
  parts: 16,
} as const;

function roll(seed: number, index: number, pick: number): number {
  return mix(seed, index, SALT.dress + pick);
}

/** `count` different numbers under `n`, in the order drawn. */
function distinct(seed: number, index: number, pick: number, n: number, count: number): number[] {
  const left = Array.from({ length: n }, (_, i) => i);
  const drawn: number[] = [];
  for (let k = 0; k < count && left.length > 0; k += 1) {
    const [taken] = left.splice(roll(seed, index, pick + k) % left.length, 1);
    if (taken !== undefined) drawn.push(taken);
  }
  return drawn;
}

/** How many of a thing a basket holds: mostly one. */
const QUANTITIES = [1, 1, 1, 1, 2, 2, 3, 4] as const;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** A clock time, `09:05`, some minutes into the day. */
function clockOf(minutes: number): string {
  const day = ((minutes % 1440) + 1440) % 1440;
  return `${pad(Math.floor(day / 60))}:${pad(day % 60)}`;
}

/** What every format wears for reel `index` of the run with `seed`. */
export function dressOf(post: Post, seed: number, index: number): Dress {
  return {
    pattern: PATTERNS[roll(seed, index, PICK.pattern) % PATTERNS.length] ?? 'plain',
    layout: roll(seed, index, PICK.layout) % LAYOUTS[post.body.format],
    tilt: (roll(seed, index, PICK.tilt) % 11) - 5,
    sticker: STICKERS[roll(seed, index, PICK.sticker) % STICKERS.length] ?? '✨',
  };
}

/** How many points a chart's axis has: a week, the waking hours, half a year. */
export const AXIS_POINTS: Readonly<Record<ChartAxis, number>> = { days: 7, hours: 6, months: 6 };

/** The line of a chart, 4 (bottom) to 96 (top), left to right — its shape, a little shaken. */
export function chartPoints(shape: ChartShape, count: number, seed: number, index: number): number[] {
  const last = Math.max(1, count - 1);
  const peak = 1 + (roll(seed, index, PICK.parts) % Math.max(1, count - 2));
  return Array.from({ length: count }, (_, i) => {
    const t = i / last;
    const base = {
      fall: 90 - 80 * t,
      rise: 10 + 80 * t,
      crash: t < 0.6 ? 86 - 10 * t : 12 - 8 * t,
      spike: i === peak ? 94 : 16,
      flat: 50,
      zigzag: i % 2 === 0 ? 24 : 78,
    }[shape];
    const shake = (roll(seed, index, PICK.parts + 1 + i) % 13) - 6;
    return Math.max(4, Math.min(96, Math.round(base + shake)));
  });
}

/** The post's format in `locale`'s words, with what it borrows for reel `index` of `seed`'s run. */
export function mediaOf(post: Post, seed: number, index: number, locale: Locale): Media {
  const body = post.body;
  switch (body.format) {
    case 'scene':
    case 'treasure':
      return { format: body.format };
    case 'chat': {
      const start = roll(seed, index, PICK.clock) % 1440;
      const later = start + 2 + (roll(seed, index, PICK.gap) % 150);
      const final = body.lines.length - 1;
      return {
        format: 'chat',
        contact: body.contact[locale],
        avatar: AVATARS[roll(seed, index, PICK.avatar) % AVATARS.length] ?? '🙂',
        lines: body.lines.map((line, i) => ({
          from: line.from,
          text: line.text[locale],
          stamp: i === 0 ? clockOf(start) : i === final && final >= 2 ? clockOf(later) : null,
        })),
      };
    }
    case 'poll': {
      const count = body.options.length;
      const top = 75 + (roll(seed, index, PICK.share) % 25);
      const rest = 100 - top;
      const second = count > 2 ? roll(seed, index, PICK.share + 1) % (rest + 1) : rest;
      const others = count > 2 ? [second, rest - second] : [rest];
      return {
        format: 'poll',
        question: body.question[locale],
        options: body.options.map((option, i) => ({
          text: option[locale],
          share: i === body.winner ? top : (others.shift() ?? 0),
          winner: i === body.winner,
        })),
        votes: 800 + (roll(seed, index, PICK.votes) % 48000),
      };
    }
    case 'chart':
      return {
        format: 'chart',
        title: body.title[locale],
        value: body.value?.[locale] ?? null,
        axis: body.axis,
        points: chartPoints(body.shape, AXIS_POINTS[body.axis], seed, index),
      };
    case 'receipt': {
      const price = (k: number) => (5 + (roll(seed, index, PICK.parts + 10 + k) % 190)) * 50;
      const own = body.items.map((item, k) => ({ text: item[locale], qty: 1, cents: price(k) }));
      const filler = distinct(seed, index, PICK.parts, RECEIPT_ITEMS.length, 3).map((item, k) => ({
        text: RECEIPT_ITEMS[item]?.[locale] ?? '',
        qty: QUANTITIES[roll(seed, index, PICK.parts + 20 + k) % QUANTITIES.length] ?? 1,
        cents: price(own.length + k),
      }));
      const lines = [...own, ...filler];
      return {
        format: 'receipt',
        store: body.store[locale],
        number: String(1 + (roll(seed, index, PICK.number) % 9999)).padStart(4, '0'),
        time: clockOf(roll(seed, index, PICK.clock) % 1440),
        lines,
        total: lines.reduce((sum, line) => sum + line.qty * line.cents, 0),
      };
    }
    case 'fact':
      return {
        format: 'fact',
        eyebrow: body.eyebrow?.[locale] ?? null,
        big: body.big[locale],
        text: body.text[locale],
      };
    case 'tier':
      return { format: 'tier', title: body.title[locale], rows: body.rows.map((row) => [...row]) };
    case 'notifications': {
      const first = roll(seed, index, PICK.gap) % 9;
      let minutes = first;
      const pile = distinct(seed, index, PICK.parts, NOTICES.length, 3).map((notice, k) => {
        minutes += 3 + (roll(seed, index, PICK.parts + 10 + k) % (k === 2 ? 240 : 50));
        const one = NOTICES[notice];
        return {
          icon: one?.icon ?? '🔔',
          app: one?.app[locale] ?? '',
          text: one?.text[locale] ?? '',
          minutes,
        };
      });
      return {
        format: 'notifications',
        clock: clockOf(roll(seed, index, PICK.clock) % 1440),
        notices: [
          { icon: body.first.icon, app: body.first.app[locale], text: body.first.text[locale], minutes: 0 },
          ...pile,
        ],
      };
    }
    case 'quote':
      return { format: 'quote', text: body.text[locale] };
    case 'polaroid':
      return { format: 'polaroid', note: body.note[locale] };
    case 'dump':
      return {
        format: 'dump',
        photos: distinct(seed, index, PICK.parts, body.emojis.length, 4).map((i) => body.emojis[i] ?? '📸'),
      };
    case 'sign':
      return { format: 'sign', sign: body.sign[locale], small: body.small[locale] };
    case 'cctv': {
      const seconds = roll(seed, index, PICK.clock) % 86400;
      return {
        format: 'cctv',
        place: body.place[locale],
        camera: 1 + (roll(seed, index, PICK.camera) % 8),
        time: `${clockOf(Math.floor(seconds / 60))}:${pad(seconds % 60)}`,
      };
    }
  }
}
