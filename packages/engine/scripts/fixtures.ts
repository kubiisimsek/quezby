/**
 * Writes the fixtures both engines are tested against:
 *
 *   fixtures/replays.json  seeds, action logs and the summary each must replay to
 *   fixtures/rejects.json  logs the replay must refuse, with the reason
 *   fixtures/curves.json   the rules' curves, combo steps and named combos at sample reels
 *   fixtures/bonuses.json  logs checked reel by reel — points, combo, named combos, meter
 *   fixtures/rules.json    the rules as data, for a readable diff from PHP
 *
 * The TypeScript suite checks these files are current; the Laravel suite
 * (`tests/Unit/EngineParityTest.php`) replays them in PHP. The rules are
 * locked: regenerate only after bumping `ENGINE_VERSION`, then `pnpm engine:lock`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildBonuses,
  buildCurves,
  buildRejects,
  buildReplays,
  buildRules,
} from '../src/fixtures';

const dir = join(__dirname, '..', 'fixtures');
mkdirSync(dir, { recursive: true });

const write = (name: string, data: unknown) => {
  writeFileSync(join(dir, name), `${JSON.stringify(data)}\n`);
  console.log(`wrote fixtures/${name}`);
};

write('replays.json', buildReplays());
write('rejects.json', buildRejects());
write('curves.json', buildCurves());
write('bonuses.json', buildBonuses());
write('rules.json', buildRules());
