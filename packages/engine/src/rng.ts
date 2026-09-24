/**
 * The run's only source of chance.
 *
 * xorshift32 over unsigned 32-bit integers, with a fixed number of draws per
 * reel. It is deliberately primitive: the API replays every ranked run in PHP
 * (`apps/api/app/Game/Rng.php`), and a generator built from shifts and xors
 * gives the same bits in both languages without a big-integer library. Any
 * change here is an `ENGINE_VERSION` bump and a new fixture set.
 */
const UINT32 = 4294967296;
const ZERO_SEED_FALLBACK = 0x6d2b79f5;
const WARM_UP = 16;

export class Rng {
  private state: number;

  constructor(seed: number) {
    const start = seed >>> 0;
    this.state = start === 0 ? ZERO_SEED_FALLBACK : start;
    for (let i = 0; i < WARM_UP; i += 1) {
      this.next();
    }
  }

  /** The next unsigned 32-bit value. */
  next(): number {
    let x = this.state;
    x = (x ^ (x << 13)) >>> 0;
    x = (x ^ (x >>> 17)) >>> 0;
    x = (x ^ (x << 5)) >>> 0;
    this.state = x;
    return x;
  }

  /**
   * A whole number in `[0, max)`, taken from the high bits. The product stays
   * under 2^53, so the division is exact in a double and in PHP's `intdiv`.
   */
  int(max: number): number {
    return Math.floor((this.next() * max) / UINT32);
  }
}
