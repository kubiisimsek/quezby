/**
 * Writes the fixtures the API's PHP twins are tested against:
 *
 *   fixtures/content.json  catalog ids per version, `mix` samples and post picks
 *   fixtures/pace.json     the app's pace between reels, for the wall-clock check
 *
 * `fixtures/usernames.json` is written by hand. Run `pnpm --filter @quezby/config fixtures`
 * after touching `src/content` or `src/pace.ts`.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildContent, buildPace } from '../src/fixtures';

const dir = join(__dirname, '..', 'fixtures');
const write = (name: string, data: unknown) => {
  writeFileSync(join(dir, name), `${JSON.stringify(data)}\n`);
  console.log(`wrote fixtures/${name}`);
};

write('content.json', buildContent());
write('pace.json', buildPace());
