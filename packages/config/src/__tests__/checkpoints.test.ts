import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CHECKPOINTS, prefixHash, prefixText, sha256Hex, utf8Bytes } from '../checkpoints';
import { buildCheckpoints } from '../fixtures';

describe('sha256', () => {
  it('matches the FIPS 180-4 test vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });

  it('pads correctly around the 55/56/64-byte block edges', () => {
    // Same values as `printf %s "$(head -c N < /dev/zero | tr '\\0' a)" | shasum -a 256`.
    expect(sha256Hex('a'.repeat(55))).toBe('9f4390f8d30c2dd92ec9f095b65e2b9ae9b0a925a5258e241c9f1e910f734318');
    expect(sha256Hex('a'.repeat(56))).toBe('b35439a4ac6f0948b6d6f9e3c6af0f5f590ce20f1bde7090ef7970686ec6738a');
    expect(sha256Hex('a'.repeat(64))).toBe('ffe054fe7ae0cb6dc65c3af9b61d5209f439851db43d0ba5997337df154668eb');
  });

  it('hashes the UTF-8 bytes of Turkish text', () => {
    expect(Array.from(utf8Bytes('ğ'))).toEqual([0xc4, 0x9f]);
    expect(Array.from(utf8Bytes('İ'))).toEqual([0xc4, 0xb0]);
    expect(Array.from(utf8Bytes('🟩'))).toEqual([0xf0, 0x9f, 0x9f, 0xa9]);
  });
});

describe('prefix hash', () => {
  const log: Array<[number, number, number]> = [
    [0, 312, 0],
    [1, 280, 0],
    [2, 140, 910],
    [3, 0, 0],
  ];

  it('commits to exactly the first moves, in one plain line', () => {
    expect(prefixText(log, 3)).toBe('0,312,0;1,280,0;2,140,910');
    expect(prefixText(log, 0)).toBe('');
    expect(prefixText(log, 99)).toBe('0,312,0;1,280,0;2,140,910;3,0,0');
  });

  it('changes when any earlier move changes, and not with what came after', () => {
    const base = prefixHash(log, 3);
    const later: Array<[number, number, number]> = [...log, [0, 999, 0]];
    expect(prefixHash(later, 3)).toBe(base);

    const edited: Array<[number, number, number]> = [[0, 313, 0], ...log.slice(1)];
    expect(prefixHash(edited, 3)).not.toBe(base);
    expect(base).toMatch(/^[0-9a-f]{64}$/);
  });

  it('checks in a few times a run, never more than a finish may carry', () => {
    expect(CHECKPOINTS.marksMs).toEqual([45_000, 120_000, 240_000]);
    expect(CHECKPOINTS.marksMs.length).toBeLessThanOrEqual(CHECKPOINTS.maxReceipts);
  });
});

describe('fixtures', () => {
  it('are up to date with the code (run `pnpm --filter @quezby/config fixtures`)', () => {
    const committed = JSON.parse(
      readFileSync(join(__dirname, '..', '..', 'fixtures', 'checkpoints.json'), 'utf8'),
    );
    expect(committed).toEqual(JSON.parse(JSON.stringify(buildCheckpoints())));
  });
});
