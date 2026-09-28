/**
 * Writes the fixtures the API's PHP twins are tested against:
 *
 *   fixtures/content.json  catalog ids per version, `mix` samples and post picks
 *   fixtures/pace.json     the app's pace between reels, for the wall-clock check
 *   fixtures/checkpoints.json  checkpoint marks, SHA-256 vectors and prefix hashes
 *   fixtures/analytics.json    the analytics catalog (screens, events, milestones) and its limits
 *   fixtures/locales.json      the six languages, digit grouping, plural forms and tag matching
 *   fixtures/social.json       the phrases friends send and a profile photo's size and weight
 *
 * `fixtures/usernames.json` is written by hand. Run `pnpm --filter @quezby/config fixtures`
 * after touching `src/content`, `src/pace.ts`, `src/checkpoints.ts`, `src/analytics.ts`, `src/locales.ts` or `src/social.ts`.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildAnalytics,
  buildCheckpoints,
  buildContent,
  buildLocales,
  buildPace,
  buildSocial,
} from '../src/fixtures';

const dir = join(__dirname, '..', 'fixtures');
const write = (name: string, data: unknown) => {
  writeFileSync(join(dir, name), `${JSON.stringify(data)}\n`);
  console.log(`wrote fixtures/${name}`);
};

write('content.json', buildContent());
write('pace.json', buildPace());
write('checkpoints.json', buildCheckpoints());
write('analytics.json', buildAnalytics());
write('locales.json', buildLocales());
write('social.json', buildSocial());
