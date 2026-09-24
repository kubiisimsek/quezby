/**
 * Username rules — the one definition both the app and the API enforce.
 * `apps/api/app/Support/Username.php` is its PHP twin, and both are tested
 * against `fixtures/usernames.json`.
 *
 *   - 3 to 20 characters: a–z, 0–9, `.` and `*`
 *   - starts and ends with a letter or a digit
 *   - `.` and `*` never touch each other (`..`, `**`, `.*`, `*.` are out)
 *   - at least one letter
 *   - case-insensitive: stored and shown in lower case
 *
 * Turkish letters are refused on purpose, with a message of their own: `İ`
 * lower-cases differently by locale, and a leaderboard where `şule` and
 * `sule` are two people is one where nobody can find anybody.
 */
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

export type UsernameProblem =
  | 'required'
  | 'too_short'
  | 'too_long'
  | 'turkish_char'
  | 'invalid_char'
  | 'bad_start'
  | 'bad_end'
  | 'consecutive_symbols'
  | 'no_letter'
  | 'reserved'
  | 'blocked';

export type UsernameValidation =
  | { ok: true; normalized: string }
  | { ok: false; problem: UsernameProblem };

export const RESERVED_USERNAMES: readonly string[] = [
  'admin',
  'administrator',
  'anonim',
  'anonymous',
  'api',
  'destek',
  'guest',
  'guvenlik',
  'help',
  'me',
  'misafir',
  'mod',
  'moderator',
  'null',
  'official',
  'resmi',
  'root',
  'security',
  'staff',
  'support',
  'system',
  'undefined',
  'yardim',
  'yonetici',
];

/** Nobody may pass for the game itself, however they spell around it. */
const RESERVED_FRAGMENTS: readonly string[] = ['quezby'];

/**
 * A short list of words a public leaderboard will not show. Matched with the
 * symbols taken out, so `o.r.o.s.p.u` is caught too. Kept to words that do
 * not hide inside ordinary names — extend it in both languages at once.
 */
const BLOCKED_FRAGMENTS: readonly string[] = [
  'orospu',
  'yarrak',
  'amcik',
  'sikerim',
  'siktir',
  'pezevenk',
  'fuck',
  'bitch',
  'cunt',
];

const TURKISH = /[çğıöşüÇĞİÖŞÜ]/;
const ALLOWED = /^[a-z0-9.*]+$/;
const SYMBOL = /[.*]/;
const TOUCHING_SYMBOLS = /[.*]{2}/;
const LETTER = /[a-z]/;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function validateUsername(input: string): UsernameValidation {
  const raw = input.trim();
  if (raw.length === 0) return { ok: false, problem: 'required' };
  if (TURKISH.test(raw)) return { ok: false, problem: 'turkish_char' };

  const value = raw.toLowerCase();
  if (!ALLOWED.test(value)) return { ok: false, problem: 'invalid_char' };
  if (value.length < USERNAME_MIN_LENGTH) {
    return { ok: false, problem: 'too_short' };
  }
  if (value.length > USERNAME_MAX_LENGTH) {
    return { ok: false, problem: 'too_long' };
  }
  if (SYMBOL.test(value[0] ?? '')) return { ok: false, problem: 'bad_start' };
  if (SYMBOL.test(value[value.length - 1] ?? '')) {
    return { ok: false, problem: 'bad_end' };
  }
  if (TOUCHING_SYMBOLS.test(value)) {
    return { ok: false, problem: 'consecutive_symbols' };
  }
  if (!LETTER.test(value)) return { ok: false, problem: 'no_letter' };

  const bare = value.replace(/[.*]/g, '');
  if (
    RESERVED_USERNAMES.includes(value) ||
    RESERVED_USERNAMES.includes(bare) ||
    RESERVED_FRAGMENTS.some((fragment) => bare.includes(fragment))
  ) {
    return { ok: false, problem: 'reserved' };
  }
  if (BLOCKED_FRAGMENTS.some((fragment) => bare.includes(fragment))) {
    return { ok: false, problem: 'blocked' };
  }

  return { ok: true, normalized: value };
}

/**
 * The rules as a checklist the player can watch fill in while typing. It
 * guides; `validateUsername` decides.
 */
export function usernameChecklist(input: string): Array<{ rule: string; met: boolean }> {
  const value = input.trim().toLowerCase();
  const filled = value.length > 0;
  return [
    {
      rule: `${USERNAME_MIN_LENGTH}–${USERNAME_MAX_LENGTH} karakter`,
      met: value.length >= USERNAME_MIN_LENGTH && value.length <= USERNAME_MAX_LENGTH,
    },
    {
      rule: 'Sadece harf, rakam, nokta (.) ve yıldız (*)',
      met: filled && !TURKISH.test(input) && ALLOWED.test(value),
    },
    {
      rule: 'Harf ya da rakamla başlar ve biter',
      met: filled && !SYMBOL.test(value[0] ?? '') && !SYMBOL.test(value[value.length - 1] ?? ''),
    },
    { rule: 'Nokta ve yıldız art arda gelmez', met: filled && !TOUCHING_SYMBOLS.test(value) },
    { rule: 'En az bir harf', met: LETTER.test(value) },
  ];
}

/** What the player reads under the field. One sentence, no blame. */
export const USERNAME_MESSAGES: Record<UsernameProblem | 'taken', string> = {
  required: 'Bir kullanıcı adı yaz.',
  too_short: 'En az 3 karakter olmalı.',
  too_long: 'En fazla 20 karakter olabilir.',
  turkish_char: 'Türkçe karakter kullanılamaz — ş yerine s, ı yerine i gibi.',
  invalid_char: 'Sadece harf, rakam, nokta (.) ve yıldız (*) kullanılabilir.',
  bad_start: 'Harf ya da rakamla başlamalı.',
  bad_end: 'Harf ya da rakamla bitmeli.',
  consecutive_symbols: 'Nokta ve yıldız art arda gelemez.',
  no_letter: 'En az bir harf içermeli.',
  reserved: 'Bu kullanıcı adı ayrılmış, başka bir tane dene.',
  blocked: 'Bu kullanıcı adı kullanılamaz.',
  taken: 'Bu kullanıcı adı alınmış.',
};
