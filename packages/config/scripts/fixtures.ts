/**
 * Writes the fixtures the API's PHP twins are tested against:
 *
 *   fixtures/content.json  catalog ids per version, `mix` samples and post picks
 *   fixtures/pace.json     the app's pace between reels, for the wall-clock check
 *   fixtures/checkpoints.json  checkpoint marks, SHA-256 vectors and prefix hashes
 *
 * `fixtures/usernames.json` is written by hand. Run `pnpm --filter @quezby/config fixtures`
 * after touching `src/content`, `src/pace.ts` or `src/checkpoints.ts`.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildCheckpoints, buildContent, buildPace } from '../src/fixtures';

const dir = join(__dirname, '..', 'fixtures');
const write = (name: string, data: unknown) => {
  writeFileSync(join(dir, name), `${JSON.stringify(data)}\n`);
  console.log(`wrote fixtures/${name}`);
};

write('content.json', buildContent());
write('pace.json', buildPace());
write('checkpoints.json', buildCheckpoints());
