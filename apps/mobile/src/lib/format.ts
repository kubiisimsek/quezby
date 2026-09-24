/** `12345` → `12.345`, the way a Turkish reader groups digits. */
export function formatScore(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** `154000` ms → `2:34`. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Per-mille → `94,2%`. */
export function formatPerMille(value: number): string {
  return `%${(value / 10).toFixed(1).replace('.', ',')}`;
}

/** `null` means no ranked run in that period. */
export function formatRank(rank: number | null | undefined): string {
  return rank ? `#${formatScore(rank)}` : '—';
}

/** Up to two letters for an avatar — a username has no spaces, so its start. */
export function initialsOf(name: string): string {
  const letters = name.replace(/[^a-z0-9]/gi, '');
  return (letters.slice(0, 2) || '?').toUpperCase();
}

/** A combo multiplier, per-mille: `1250` → `x1,25`, `1000` → `x1,00`. */
export function formatCombo(permille: number): string {
  const hundredths = Math.max(0, Math.round(permille / 10));
  const whole = Math.floor(hundredths / 100);
  const fraction = (hundredths % 100).toString().padStart(2, '0');
  return `x${whole},${fraction}`;
}

/**
 * Time played: `2 sa 14 dk`, `14 dk`, and under a minute `45 sn`. Hours
 * group their digits, for the players who never stop.
 */
export function formatPlayTime(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  if (minutes < 1) return `${Math.floor(Math.max(0, ms) / 1000)} sn`;
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${formatScore(hours)} sa ${minutes % 60} dk` : `${minutes} dk`;
}

/**
 * Items as a sentence says them: `Apple, Google ya da e-posta`,
 * `Apple ve e-posta`. The conjunction joins the last two only.
 */
export function formatList(items: readonly string[], conjunction: 've' | 'ya da'): string {
  if (items.length < 2) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} ${conjunction} ${items[items.length - 1]}`;
}

/** Points between two players: `1240` → `1.240`. The arrow says which way. */
export function formatGap(points: number): string {
  return formatScore(Math.abs(points));
}

/**
 * Time left, as precise as it needs to be: `6 g 14 sa` over a day,
 * `5 sa 12 dk` over an hour, `12 dk 05 sn` under one, `42 sn` in the last
 * minute. Seconds round up, so `0 sn` only ever means the time is up.
 */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3_600);
  const minutes = Math.floor((total % 3_600) / 60);
  const seconds = total % 60;
  if (days > 0) return `${days} g ${hours} sa`;
  if (hours > 0) return `${hours} sa ${minutes} dk`;
  if (minutes > 0) {
    return `${minutes} dk ${seconds.toString().padStart(2, '0')} sn`;
  }
  return `${seconds} sn`;
}

const UNITS = [
  'sıfır',
  'bir',
  'iki',
  'üç',
  'dört',
  'beş',
  'altı',
  'yedi',
  'sekiz',
  'dokuz',
];
const TENS = [
  '',
  'on',
  'yirmi',
  'otuz',
  'kırk',
  'elli',
  'altmış',
  'yetmiş',
  'seksen',
  'doksan',
];
const LETTERS: Record<string, string> = {
  b: 'be',
  c: 'ce',
  d: 'de',
  f: 'fe',
  g: 'ge',
  h: 'he',
  j: 'je',
  k: 'ka',
  l: 'le',
  m: 'me',
  n: 'ne',
  p: 'pe',
  q: 'kü',
  r: 're',
  s: 'se',
  t: 'te',
  v: 've',
  w: 've',
  x: 'iks',
  y: 'ye',
  z: 'ze',
};

/** The last word of a number read aloud: `42` → `iki`, `40` → `kırk`, `2000` → `bin`. */
function spokenTail(digits: string): string {
  const zeros = digits.length - digits.replace(/0+$/, '').length;
  const last = digits.length - zeros - 1;
  if (last < 0) return UNITS[0] ?? 'sıfır';
  const digit = Number(digits[last]);
  if (zeros === 0) return UNITS[digit] ?? 'bir';
  if (zeros === 1) return TENS[digit] ?? 'on';
  if (zeros === 2) return 'yüz';
  if (zeros <= 5) return 'bin';
  if (zeros <= 8) return 'milyon';
  if (zeros <= 11) return 'milyar';
  return 'trilyon';
}

/**
 * A name in the dative, as it is said: `ekin` → `ekin'e`, `oya` → `oya'ya`,
 * `burak` → `burak'a`, `kubi.10` → `kubi.10'a`. The suffix follows the
 * sound of the name's end — its last vowel, a trailing number read as a
 * word, or a vowelless run read letter by letter.
 */
export function dativeOf(name: string): string {
  const clean = name.toLowerCase().replace(/[^a-z0-9ıöüçşğ]+$/, '');
  const number = clean.match(/\d+$/)?.[0];
  const letters = clean.match(/[a-zıöüçşğ]+$/)?.[0] ?? '';
  let spoken = number ? spokenTail(number) : letters;
  if (!number && !/[aeıioöuü]/.test(letters)) {
    const lastLetter = letters.slice(-1);
    spoken = LETTERS[lastLetter] ?? lastLetter;
  }
  const vowels = spoken.match(/[aeıioöuü]/g);
  const lastVowel = vowels ? vowels[vowels.length - 1] : 'e';
  const back =
    lastVowel === 'a' ||
    lastVowel === 'ı' ||
    lastVowel === 'o' ||
    lastVowel === 'u';
  const endsInVowel = /[aeıioöuü]$/.test(spoken);
  return `${name}'${endsInVowel ? 'y' : ''}${back ? 'a' : 'e'}`;
}

/**
 * How a rank moved, as the server reported it: `▲8` up, `▼2` down, `yeni` on
 * a board the player was not on, and nothing when it held.
 */
export function formatRankChange(before: number | null, after: number | null): string {
  if (after === null) return '';
  if (before === null) return 'yeni';
  if (after < before) return `▲${formatScore(before - after)}`;
  if (after > before) return `▼${formatScore(after - before)}`;
  return '';
}
