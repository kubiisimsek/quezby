/**
 * Turkish grammar the catalog needs: a name in the dative, as it is said.
 * Only the Turkish lines use it — every other language builds its sentence
 * without touching the name.
 */
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
