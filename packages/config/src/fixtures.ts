import { CATALOGS, SALT, mix, postFor, type ContentKind } from './content';
import { PACE } from './pace';

/**
 * Fixtures the API's PHP twins are tested against (`tests/Unit/ContentParityTest.php`,
 * `PaceParityTest.php`), built deterministically so a test can rebuild them
 * and fail when the committed files have gone stale.
 */
const KINDS: ContentKind[] = ['skip', 'like', 'hold', 'freeze'];
const SEEDS = [1, 42, 7919, 123456789, 2147483647, 4294967295];

export function buildContent() {
  return {
    catalogs: Object.entries(CATALOGS).map(([version, catalog]) => ({
      version: Number(version),
      ids: Object.fromEntries(KINDS.map((kind) => [kind, catalog[kind].map((post) => post.id)])),
    })),
    mix: SEEDS.flatMap((seed) =>
      [0, 1, 7, 19, 500, 4999].flatMap((index) =>
        Object.values(SALT).map((salt) => ({ seed, index, salt, value: mix(seed, index, salt) })),
      ),
    ),
    picks: SEEDS.flatMap((seed) =>
      [0, 3, 20, 77, 400].flatMap((index) =>
        KINDS.map((kind) => ({ seed, index, kind, version: 1, id: postFor(seed, index, kind, 1).id })),
      ),
    ),
  };
}

export function buildPace() {
  return PACE;
}
