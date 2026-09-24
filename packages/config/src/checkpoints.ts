/**
 * Checkpoints: how the API tells a real-time run from a slowed-down one.
 *
 * A few times in a ranked run — at these marks of the game's clock after the
 * countdown — the app asks the API to stamp its progress: how many reels it
 * has played and a hash of exactly those moves. The API signs the time it
 * saw the request and hands back an opaque receipt; the finish carries the
 * receipts. At the finish the API checks each receipt against the log it
 * replays: the moves must hash the same (no rewriting the past), and the time
 * that really passed must match the time those moves need on the app's pace
 * (no playing a slowed-down game). The API's twin is `App\Game\Checkpoint`,
 * tested against `fixtures/checkpoints.json`.
 */
export const CHECKPOINTS = {
  /** Game-clock milliseconds after the countdown at which the app checks in. */
  marksMs: [45_000, 120_000, 240_000],
  /** The most receipts a finish may carry. */
  maxReceipts: 5,
} as const;

type Action = readonly [number, number, number] | readonly number[];

/**
 * The first `count` moves as one line — `gesture,t,d;gesture,t,d;…` — the
 * text both sides hash. Integers only, no spaces, nothing locale-dependent.
 */
export function prefixText(actions: readonly Action[], count: number): string {
  const end = Math.max(0, Math.min(count, actions.length));
  const parts: string[] = [];
  for (let index = 0; index < end; index += 1) {
    const action = actions[index];
    if (!action) break;
    parts.push(`${action[0] ?? 0},${action[1] ?? 0},${action[2] ?? 0}`);
  }
  return parts.join(';');
}

/** The hash a checkpoint commits to: SHA-256 of `prefixText`, lower-case hex. */
export function prefixHash(actions: readonly Action[], count: number): string {
  return sha256Hex(prefixText(actions, count));
}

const ROUND = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
] as const;

const START = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
] as const;

/** Text as UTF-8 bytes. Hermes has no guaranteed `TextEncoder`, so by hand. */
export function utf8Bytes(text: string): Uint8Array {
  const bytes: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return Uint8Array.from(bytes);
}

const rotr = (value: number, bits: number): number => (value >>> bits) | (value << (32 - bits));

/**
 * SHA-256 (FIPS 180-4) in plain TypeScript — React Native's Hermes has no
 * WebCrypto. Checked against the standard's test vectors and against PHP's
 * `hash('sha256', …)` through the fixtures.
 */
export function sha256(message: Uint8Array): Uint8Array {
  const length = message.length;
  const padded = new Uint8Array((((length + 9 + 63) >> 6) << 6));
  padded.set(message);
  padded[length] = 0x80;
  const view = new DataView(padded.buffer);
  const bits = length * 8;
  view.setUint32(padded.length - 8, Math.floor(bits / 0x1_0000_0000));
  view.setUint32(padded.length - 4, bits >>> 0);

  const hash = Uint32Array.from(START);
  const words = new Uint32Array(64);

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) words[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i += 1) {
      const w15 = words[i - 15] ?? 0;
      const w2 = words[i - 2] ?? 0;
      const s0 = rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3);
      const s1 = rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10);
      words[i] = ((words[i - 16] ?? 0) + s0 + (words[i - 7] ?? 0) + s1) >>> 0;
    }

    let a = hash[0] ?? 0;
    let b = hash[1] ?? 0;
    let c = hash[2] ?? 0;
    let d = hash[3] ?? 0;
    let e = hash[4] ?? 0;
    let f = hash[5] ?? 0;
    let g = hash[6] ?? 0;
    let h = hash[7] ?? 0;

    for (let i = 0; i < 64; i += 1) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const choose = (e & f) ^ (~e & g);
      const t1 = (h + s1 + choose + (ROUND[i] ?? 0) + (words[i] ?? 0)) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (s0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }

    hash[0] = ((hash[0] ?? 0) + a) >>> 0;
    hash[1] = ((hash[1] ?? 0) + b) >>> 0;
    hash[2] = ((hash[2] ?? 0) + c) >>> 0;
    hash[3] = ((hash[3] ?? 0) + d) >>> 0;
    hash[4] = ((hash[4] ?? 0) + e) >>> 0;
    hash[5] = ((hash[5] ?? 0) + f) >>> 0;
    hash[6] = ((hash[6] ?? 0) + g) >>> 0;
    hash[7] = ((hash[7] ?? 0) + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  hash.forEach((word, index) => outView.setUint32(index * 4, word));
  return out;
}

/** SHA-256 of a text's UTF-8 bytes, as lower-case hex. */
export function sha256Hex(text: string): string {
  let hex = '';
  for (const byte of sha256(utf8Bytes(text))) hex += byte.toString(16).padStart(2, '0');
  return hex;
}
