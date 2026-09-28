/**
 * A small integer hash of a seed, a reel index and a salt. It picks what a
 * reel shows — never the rules — and the API has a twin
 * (`app/Content/Mix.php`), so the server knows which post every reel wore.
 */
export function mix(seed: number, index: number, salt: number): number {
  let h = (seed ^ Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(salt, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Salts in use. The post is one pick, so a reel's emoji, account and caption
 * belong together. `dress` and the salts after it choose how the post is drawn
 * (the app's `game/dress.ts`) — the API never needs them.
 */
export const SALT = { background: 1, post: 2, likes: 7, comments: 8, dress: 16 } as const;
