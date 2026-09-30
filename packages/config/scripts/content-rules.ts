/**
 * The rules every post of the feed is held to — by the catalog's tests
 * (`src/__tests__/content.test.ts`) and, while a file of posts is being
 * written, by `scripts/check-content.ts`. A post is words a player reads in a
 * glance, in every language the game speaks, inside a format laid out for
 * lines of a certain length: these checks keep every line inside its box and
 * every language typed the way it is typed.
 */
import { ACCOUNTS } from '../src/content/accounts';
import { AVATARS, NOTICES, RECEIPT_ITEMS, STICKERS } from '../src/content/pools';
import { FORMATS_OF, type ContentKind, type Draft, type Localized } from '../src/content/types';
import { LOCALES } from '../src/locales';
import type { Locale } from '@quezby/types';

/**
 * The most columns a line may take, in any language — the formats are laid
 * out for these. A Latin, Arabic or digit character is one column; a Japanese
 * or Korean one is drawn about twice as wide, and counts two (`widthOf`).
 */
export const LIMITS = {
  caption: 60,
  headline: 40,
  contact: 20,
  chat: 44,
  question: 50,
  option: 22,
  chartTitle: 24,
  chartValue: 10,
  store: 20,
  item: 22,
  eyebrow: 24,
  big: 10,
  factText: 64,
  tierTitle: 28,
  noticeApp: 18,
  noticeText: 40,
  quote: 72,
  note: 26,
  sign: 14,
  small: 30,
  place: 18,
} as const;

/** A post as written (a `Draft`) or as the catalog holds it (a `Post`, its headline `null`). */
export type Written = Omit<Draft, 'headline'> & { readonly headline?: Localized | null };

export type Line = {
  /** Where the line sits in the post: `caption`, `body.lines[2].text`… */
  path: string;
  words: Localized;
  limit: number;
  /** Printed in capitals — a receipt, a sign, a ribbon: typed so, never transformed. */
  capitals?: boolean;
  /** A number shown big: the same digits in every language. */
  digits?: boolean;
};

/** Every line a post makes a player read, with the length it must fit. */
export function linesOf(draft: Written): Line[] {
  const lines: Line[] = [{ path: 'caption', words: draft.caption, limit: LIMITS.caption }];
  if (draft.headline) lines.push({ path: 'headline', words: draft.headline, limit: LIMITS.headline });
  const body = draft.body;
  switch (body.format) {
    case 'chat':
      lines.push({ path: 'body.contact', words: body.contact, limit: LIMITS.contact });
      body.lines.forEach((line, i) =>
        lines.push({ path: `body.lines[${i}].text`, words: line.text, limit: LIMITS.chat }),
      );
      break;
    case 'poll':
      lines.push({ path: 'body.question', words: body.question, limit: LIMITS.question });
      body.options.forEach((option, i) =>
        lines.push({ path: `body.options[${i}]`, words: option, limit: LIMITS.option }),
      );
      break;
    case 'chart':
      lines.push({ path: 'body.title', words: body.title, limit: LIMITS.chartTitle, capitals: true });
      if (body.value) {
        lines.push({ path: 'body.value', words: body.value, limit: LIMITS.chartValue, digits: true });
      }
      break;
    case 'receipt':
      lines.push({ path: 'body.store', words: body.store, limit: LIMITS.store, capitals: true });
      body.items.forEach((item, i) =>
        lines.push({ path: `body.items[${i}]`, words: item, limit: LIMITS.item, capitals: true }),
      );
      break;
    case 'fact':
      if (body.eyebrow) {
        lines.push({ path: 'body.eyebrow', words: body.eyebrow, limit: LIMITS.eyebrow, capitals: true });
      }
      lines.push({ path: 'body.big', words: body.big, limit: LIMITS.big, digits: true });
      lines.push({ path: 'body.text', words: body.text, limit: LIMITS.factText });
      break;
    case 'tier':
      lines.push({ path: 'body.title', words: body.title, limit: LIMITS.tierTitle, capitals: true });
      break;
    case 'notifications':
      lines.push({ path: 'body.first.app', words: body.first.app, limit: LIMITS.noticeApp });
      lines.push({ path: 'body.first.text', words: body.first.text, limit: LIMITS.noticeText });
      break;
    case 'quote':
      lines.push({ path: 'body.text', words: body.text, limit: LIMITS.quote });
      break;
    case 'polaroid':
      lines.push({ path: 'body.note', words: body.note, limit: LIMITS.note });
      break;
    case 'sign':
      lines.push({ path: 'body.sign', words: body.sign, limit: LIMITS.sign, capitals: true });
      lines.push({ path: 'body.small', words: body.small, limit: LIMITS.small, capitals: true });
      break;
    case 'cctv':
      lines.push({ path: 'body.place', words: body.place, limit: LIMITS.place, capitals: true });
      break;
    case 'scene':
    case 'dump':
    case 'treasure':
      break;
  }
  return lines;
}

/** A pictograph with its variation selector or skin tone, joined into one picture by ZWJs. */
const ONE_EMOJI =
  /^\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})*(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})*)*$/u;

/** One emoji, drawn as one picture: `☕️`, `👩‍🏫` — not two, not a letter. */
export function isOneEmoji(text: string): boolean {
  return ONE_EMOJI.test(text);
}

/** Japanese and Korean characters, and the full-width punctuation they are set with: two columns each. */
const WIDE = /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]/u;

/** How many columns a line takes: a Japanese or Korean character counts two. */
export function widthOf(text: string): number {
  return Array.from(text).reduce((width, char) => width + (WIDE.test(char) ? 2 : 1), 0);
}

/** A kana or kanji right before a Latin comma or full stop: Japanese is set with 、 and 。. */
const JAPANESE_LATIN_PUNCTUATION = /[\u3040-\u30FF\u4E00-\u9FFF][,.]/u;

/** The digits of a line, in order: `2.617` and `2 617` are both `2617`. */
function digitsOf(text: string): string {
  return text.replace(/\D/g, '');
}

const LATIN: readonly Locale[] = ['tr', 'en', 'de', 'fr', 'es'];

/** What is wrong with one line, in every language it is written in. */
export function lineProblems(line: Line): string[] {
  const problems: string[] = [];
  const say = (locale: Locale, what: string) => problems.push(`${line.path} · ${locale}: ${what}`);
  const keys = Object.keys(line.words).sort();
  if (keys.join() !== [...LOCALES].sort().join()) {
    problems.push(`${line.path}: written in ${keys.join(', ')}, not in all of ${LOCALES.join(', ')}`);
    return problems;
  }
  for (const locale of LOCALES) {
    const text = line.words[locale];
    if (text.trim() === '') {
      say(locale, 'empty');
      continue;
    }
    if (text !== text.trim() || text.includes('  ')) say(locale, 'stray spaces');
    const width = widthOf(text);
    if (width > line.limit) {
      say(locale, `${width} columns, the most is ${line.limit} (a Japanese or Korean character counts two)`);
    }
    if (locale === 'fr' && /[^ !?][!?:;%]/.test(text)) {
      say(locale, 'a no-break space (U+00A0) goes before ! ? : ; %');
    }
    if (locale === 'ja' && (/[!?]/.test(text) || JAPANESE_LATIN_PUNCTUATION.test(text))) {
      say(locale, 'Japanese is set with full-width ！ ？ 、 。');
    }
    if (locale === 'ko' && /[！？。、]/.test(text)) say(locale, 'Korean is set with ! ? . , as English is');
    if (locale === 'es' && text.includes('?') && !text.includes('¿')) say(locale, 'a question opens with ¿');
    if (locale === 'es' && text.includes('!') && !text.includes('¡')) say(locale, 'an exclamation opens with ¡');
    // A Latin comma may only group digits (`12,345`, as `groupDigits` writes Arabic numbers).
    if (locale === 'ar' && (/[٠-٩۰-۹?;]/.test(text) || /,(?!\d{3})|(?<!\d),/.test(text))) {
      say(locale, 'Latin digits, and Arabic ، ؟ ؛ (a Latin comma only between digit groups)');
    }
    if (line.capitals && LATIN.includes(locale) && text !== text.toLocaleUpperCase(locale)) {
      say(locale, 'typed in capitals (Turkish İ, German SS)');
    }
  }
  if (line.digits) {
    const turkish = digitsOf(line.words.tr);
    for (const locale of LOCALES) {
      if (digitsOf(line.words[locale]) !== turkish) say(locale, `the digits differ from the Turkish ${turkish}`);
    }
  }
  return problems;
}

const HANDLES = new Set<Localized>(Object.values(ACCOUNTS));

/** What is wrong with one post written for `kind`'s list. */
export function draftProblems(kind: ContentKind, draft: Written): string[] {
  const problems: string[] = [];
  if (!isOneEmoji(draft.emoji)) problems.push(`emoji: "${draft.emoji}" is not one emoji`);
  if (!HANDLES.has(draft.user)) problems.push('user: not one of ACCOUNTS');
  if (!FORMATS_OF[kind].includes(draft.body.format)) {
    problems.push(`body.format: a ${kind} post cannot be a ${draft.body.format}`);
  }
  if (kind === 'freeze' && !draft.headline) problems.push('headline: every freeze post shouts one');
  if (kind !== 'freeze' && draft.headline) problems.push('headline: only freeze posts have one');

  const body = draft.body;
  if (body.format === 'chat') {
    if (body.lines.length < 2 || body.lines.length > 5) problems.push('body.lines: 2 to 5 messages');
    if (!body.lines.some((line) => line.from === 'me') || !body.lines.some((line) => line.from === 'them')) {
      problems.push('body.lines: both sides speak');
    }
  }
  if (body.format === 'poll') {
    if (body.options.length < 2 || body.options.length > 3) problems.push('body.options: 2 or 3 answers');
    if (!Number.isInteger(body.winner) || body.winner < 0 || body.winner >= body.options.length) {
      problems.push('body.winner: the index of one of the answers');
    }
  }
  if (body.format === 'receipt' && (body.items.length < 1 || body.items.length > 2)) {
    problems.push('body.items: 1 or 2 items — the rest of the basket is filler');
  }
  if (body.format === 'dump') {
    if (body.emojis.length < 4 || body.emojis.length > 6) problems.push('body.emojis: 4 to 6 photos');
    if (!body.emojis.every(isOneEmoji)) problems.push('body.emojis: one emoji each');
    if (new Set(body.emojis).size !== body.emojis.length) problems.push('body.emojis: no photo twice');
  }
  if (body.format === 'tier') {
    if (body.rows.length !== 4) problems.push('body.rows: four rows, S A B C');
    if (!body.rows.every((row) => row.length >= 1 && row.length <= 4 && row.every(isOneEmoji))) {
      problems.push('body.rows: 1 to 4 emojis a row');
    }
  }
  if (body.format === 'notifications' && !isOneEmoji(body.first.icon)) {
    problems.push('body.first.icon: one emoji');
  }
  for (const line of linesOf(draft)) problems.push(...lineProblems(line));
  return problems;
}

/** What is wrong with the parts the formats borrow (`src/content/pools.ts`). */
export function poolProblems(): string[] {
  const problems: string[] = [];
  RECEIPT_ITEMS.forEach((item, i) =>
    problems.push(...lineProblems({ path: `RECEIPT_ITEMS[${i}]`, words: item, limit: LIMITS.item, capitals: true })),
  );
  NOTICES.forEach((notice, i) => {
    if (!isOneEmoji(notice.icon)) problems.push(`NOTICES[${i}].icon: one emoji`);
    problems.push(...lineProblems({ path: `NOTICES[${i}].app`, words: notice.app, limit: LIMITS.noticeApp }));
    problems.push(...lineProblems({ path: `NOTICES[${i}].text`, words: notice.text, limit: LIMITS.noticeText }));
  });
  for (const [name, list] of [
    ['AVATARS', AVATARS],
    ['STICKERS', STICKERS],
  ] as const) {
    list.forEach((emoji, i) => {
      if (!isOneEmoji(emoji)) problems.push(`${name}[${i}]: one emoji`);
    });
  }
  return problems;
}
