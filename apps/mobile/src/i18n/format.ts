import { decimalMark, groupDigits } from '@quezby/config';
import type { Locale } from '@quezby/types';

import { IS_RTL } from '@/i18n/native';

/**
 * A left-to-right piece — `#12`, `▲8`, `x1.25`, `@ekin` — kept in its own
 * order inside a right-to-left line: a left-to-right mark (U+200E) on each
 * side. Marks, not the isolates (U+2066 … U+2069) Unicode made for this: iOS
 * draws those but ignores what they mean, and `@ekin` comes out `ekin@`. Only
 * an Arabic app needs them; in every other language the text is left exactly
 * as it is.
 */
export function ltr(text: string): string {
  return IS_RTL ? `\u200E${text}\u200E` : text;
}

/**
 * A left-to-right piece inside a line of the Arabic catalog — a name, `#12`,
 * a score — kept whole, whichever way the app reads (see `ltr`). The Arabic
 * lines import it from here: `@/i18n` would be a require cycle.
 */
export function iso(text: string): string {
  return `\u200E${text}\u200E`;
}

/** A player's name as the game writes it: `@ekin` — whole, whichever way the line reads. */
export function handle(name: string): string {
  return ltr(`@${name}`);
}

/** The units a clock is read in, short: `6 g 14 sa`, `5h 12m`. */
type Units = {
  day: (n: string) => string;
  hour: (n: string) => string;
  minute: (n: string) => string;
  second: (n: string) => string;
};

const NBSP = ' ';

const UNITS: Record<Locale, Units> = {
  tr: { day: (n) => `${n} g`, hour: (n) => `${n} sa`, minute: (n) => `${n} dk`, second: (n) => `${n} sn` },
  en: { day: (n) => `${n}d`, hour: (n) => `${n}h`, minute: (n) => `${n}m`, second: (n) => `${n}s` },
  de: { day: (n) => `${n} T`, hour: (n) => `${n} Std.`, minute: (n) => `${n} Min.`, second: (n) => `${n} Sek.` },
  fr: {
    day: (n) => `${n}${NBSP}j`,
    hour: (n) => `${n}${NBSP}h`,
    minute: (n) => `${n}${NBSP}min`,
    second: (n) => `${n}${NBSP}s`,
  },
  es: { day: (n) => `${n} d`, hour: (n) => `${n} h`, minute: (n) => `${n} min`, second: (n) => `${n} s` },
  ar: { day: (n) => `${n} ي`, hour: (n) => `${n} س`, minute: (n) => `${n} د`, second: (n) => `${n} ث` },
};

/** The months, as a date in running text names them. */
const MONTHS: Record<Locale, readonly string[]> = {
  tr: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
};

/** A day of a month the language's way: `24 Eylül`, `24. September`, `24 de septiembre`. */
const DAY_OF_MONTH: Record<Locale, (day: number, month: string) => string> = {
  tr: (day, month) => `${day} ${month}`,
  en: (day, month) => `${day} ${month}`,
  de: (day, month) => `${day}. ${month}`,
  fr: (day, month) => `${day}${NBSP}${month}`,
  es: (day, month) => `${day} de ${month}`,
  ar: (day, month) => `${day} ${month}`,
};

/** What just happened is called. */
const NOW: Record<Locale, string> = {
  tr: 'şimdi',
  en: 'now',
  de: 'jetzt',
  fr: 'maintenant',
  es: 'ahora',
  ar: 'الآن',
};

/** How a sentence joins the last two of a list. */
const CONJUNCTIONS: Record<Locale, { and: string; or: string; comma: string }> = {
  tr: { and: 've', or: 'ya da', comma: ', ' },
  en: { and: 'and', or: 'or', comma: ', ' },
  de: { and: 'und', or: 'oder', comma: ', ' },
  fr: { and: 'et', or: 'ou', comma: ', ' },
  es: { and: 'y', or: 'o', comma: ', ' },
  ar: { and: 'و', or: 'أو', comma: '، ' },
};

/** `new` on a board the player was not on before. */
const NEW_ON_BOARD: Record<Locale, string> = {
  tr: 'yeni',
  en: 'new',
  de: 'neu',
  fr: 'nouveau',
  es: 'nuevo',
  ar: 'جديد',
};

/** A like count over a thousand, the way each language shortens it. */
const THOUSANDS: Record<Locale, (n: string) => string> = {
  tr: (n) => `${n} B`,
  en: (n) => `${n}K`,
  de: (n) => `${n} Tsd.`,
  fr: (n) => `${n}${NBSP}k`,
  es: (n) => `${n} mil`,
  ar: (n) => `${n} ألف`,
};

/** A per cent, where each language puts the sign. */
const PERCENT: Record<Locale, (n: string) => string> = {
  tr: (n) => `%${n}`,
  en: (n) => `${n}%`,
  de: (n) => `${n}${NBSP}%`,
  fr: (n) => `${n}${NBSP}%`,
  es: (n) => `${n}${NBSP}%`,
  ar: (n) => `${n}%`,
};

export type Formats = {
  /** A score, grouped the language's way: `12.345`, `12,345`, `12 345`. */
  score: (value: number) => string;
  /** A rank, `#12`; `—` when there is none. */
  rank: (rank: number | null | undefined) => string;
  /** Points between two players, without a sign — the arrow says which way. */
  gap: (points: number) => string;
  /** A per-mille value as a per cent with one decimal: `%94,2`, `94.2%`. */
  perMille: (value: number) => string;
  /** A combo multiplier, per-mille, always two decimals: `x1,25`, `x1.25`. */
  combo: (permille: number) => string;
  /** Time played: `2 sa 14 dk`, `14 dk`, and under a minute `45 sn`. */
  playTime: (ms: number) => string;
  /**
   * Time left, as precise as it needs to be: days and hours, hours and
   * minutes, minutes and seconds, then seconds. Seconds round up, so zero
   * seconds only ever means the time is up.
   */
  countdown: (ms: number) => string;
  /** Items as a sentence lists them, the conjunction joining the last two. */
  list: (items: readonly string[], conjunction: 'and' | 'or') => string;
  /** How a rank moved: `▲8` up, `▼2` down, `yeni` on a new board, nothing when it held. */
  rankChange: (before: number | null, after: number | null) => string;
  /** A fake post's like count: `842`, `1,2 B`, `1.2K`. */
  compact: (value: number) => string;
  /** A whole per cent, where the language puts the sign: `%97`, `97%`, `97 %`. */
  percent: (value: number) => string;
  /** A price on a fake receipt, from cents: `1.234,50`, `1,234.50`, `1 234,50`. */
  price: (cents: number) => string;
  /** A day on the phone's calendar: `24 Eylül`, `24 September`. */
  date: (iso: string) => string;
  /** A time of day on the phone's clock, 24-hour: `14:05`. */
  time: (iso: string) => string;
  /** How long ago, short — `şimdi`, `5 dk`, `3 sa`, `2 g` — and past a week its date. */
  ago: (iso: string, now?: number) => string;
};

/** Spanish `y` and `o` change before the sound they would run into. */
function spanishConjunction(word: string, next: string): string {
  const head = next.trim().toLowerCase();
  if (word === 'y' && /^h?i(?![aeou])/.test(head)) return 'e';
  if (word === 'o' && /^h?o/.test(head)) return 'u';
  return word;
}

/** The number formatting of one language — `t.fmt` in its catalog. */
export function formatsFor(locale: Locale): Formats {
  const units = UNITS[locale];
  const group = (value: number) => groupDigits(value, locale);
  const decimals = (value: number, digits: number) =>
    value.toFixed(digits).replace('.', decimalMark(locale));

  return {
    score: group,
    rank: (rank) => (rank ? ltr(`#${group(rank)}`) : '—'),
    gap: (points) => group(Math.abs(points)),
    perMille: (value) => ltr(PERCENT[locale](decimals(value / 10, 1))),
    combo: (permille) => {
      const hundredths = Math.max(0, Math.round(permille / 10));
      const whole = Math.floor(hundredths / 100);
      const fraction = (hundredths % 100).toString().padStart(2, '0');
      return ltr(`x${whole}${decimalMark(locale)}${fraction}`);
    },
    playTime: (ms) => {
      const minutes = Math.floor(Math.max(0, ms) / 60_000);
      if (minutes < 1) return units.second(`${Math.floor(Math.max(0, ms) / 1000)}`);
      const hours = Math.floor(minutes / 60);
      return hours > 0
        ? `${units.hour(group(hours))} ${units.minute(`${minutes % 60}`)}`
        : units.minute(`${minutes}`);
    },
    countdown: (ms) => {
      const total = Math.max(0, Math.ceil(ms / 1000));
      const days = Math.floor(total / 86_400);
      const hours = Math.floor((total % 86_400) / 3_600);
      const minutes = Math.floor((total % 3_600) / 60);
      const seconds = total % 60;
      if (days > 0) return `${units.day(`${days}`)} ${units.hour(`${hours}`)}`;
      if (hours > 0) return `${units.hour(`${hours}`)} ${units.minute(`${minutes}`)}`;
      if (minutes > 0) {
        return `${units.minute(`${minutes}`)} ${units.second(seconds.toString().padStart(2, '0'))}`;
      }
      return units.second(`${seconds}`);
    },
    list: (items, conjunction) => {
      if (items.length < 2) return items[0] ?? '';
      const words = CONJUNCTIONS[locale];
      const last = items[items.length - 1] ?? '';
      const word =
        locale === 'es' ? spanishConjunction(words[conjunction], last) : words[conjunction];
      return `${items.slice(0, -1).join(words.comma)} ${word} ${last}`;
    },
    rankChange: (before, after) => {
      if (after === null) return '';
      if (before === null) return NEW_ON_BOARD[locale];
      if (after < before) return ltr(`▲${group(before - after)}`);
      if (after > before) return ltr(`▼${group(after - before)}`);
      return '';
    },
    compact: (value) => {
      if (value < 1000) return `${value}`;
      return THOUSANDS[locale](decimals(value / 1000, 1));
    },
    percent: (value) => ltr(PERCENT[locale](group(value))),
    price: (cents) => {
      const whole = Math.floor(Math.max(0, cents) / 100);
      const rest = (Math.max(0, cents) % 100).toString().padStart(2, '0');
      return `${group(whole)}${decimalMark(locale)}${rest}`;
    },
    date: (iso) => {
      const at = new Date(iso);
      return DAY_OF_MONTH[locale](at.getDate(), MONTHS[locale][at.getMonth()] ?? '');
    },
    time: (iso) => {
      const at = new Date(iso);
      return ltr(`${at.getHours().toString().padStart(2, '0')}:${at.getMinutes().toString().padStart(2, '0')}`);
    },
    ago: (iso, now = Date.now()) => {
      const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
      if (seconds < 60) return NOW[locale];
      if (seconds < 3_600) return units.minute(`${Math.floor(seconds / 60)}`);
      if (seconds < 86_400) return units.hour(`${Math.floor(seconds / 3_600)}`);
      if (seconds < 7 * 86_400) return units.day(`${Math.floor(seconds / 86_400)}`);
      const at = new Date(iso);
      return DAY_OF_MONTH[locale](at.getDate(), MONTHS[locale][at.getMonth()] ?? '');
    },
  };
}
