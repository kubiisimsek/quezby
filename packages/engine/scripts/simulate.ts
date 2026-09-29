/**
 * Balancing report: plays thousands of runs per skill profile and prints how
 * long they last, what they score, and whether the consistency promise holds
 * (same skill + same length → within ±20 %) — then the same for Dereceli's
 * difficulties (`src/difficulty.ts`). Run after touching either table:
 *
 *   pnpm engine:simulate            # 2000 runs per profile
 *   pnpm engine:simulate -- 500     # quicker
 */
import {
  bonusShare,
  elasticity,
  percentile,
  playProfile,
  sameLengthSpread,
  type Played,
} from '../src/balance';
import { ELITE, PROFILES, blindSwipe } from '../src/bot';
import { MAX_DIFFICULTY } from '../src/difficulty';
import { ReelStream } from '../src/reels';
import { BONUS_KINDS } from '../src/rules';
import { Run } from '../src/run';

const runs = Number(process.argv[2] ?? 2000);

function row(values: number[]): [number, number, number, number] {
  const sorted = [...values].sort((a, b) => a - b);
  return [
    percentile(sorted, 0.1),
    percentile(sorted, 0.5),
    percentile(sorted, 0.9),
    percentile(sorted, 0.99),
  ];
}

const fmt = (value: number) => Math.round(value).toLocaleString('tr-TR');
const ratio = (value: number) => value.toFixed(2);
const clock = (seconds: number) =>
  `${Math.floor(Math.round(seconds) / 60)}:${String(Math.round(seconds) % 60).padStart(2, '0')}`;

function perRun(played: readonly Played[], pick: (run: Played) => number): string {
  return (played.reduce((sum, run) => sum + pick(run), 0) / played.length).toFixed(1);
}

console.log(`${runs} runs per profile · p10 / p50 / p90 / p99\n`);
for (const profile of PROFILES) {
  const played = playProfile(profile, runs);
  const ends = { drained: 0, penalty: 0, quit: 0 };
  for (const run of played) ends[run.summary.endedBy] += 1;
  const within10 = sameLengthSpread(played, 0.1);
  const within5 = sameLengthSpread(played, 0.05);
  const seconds = row(played.map((run) => run.seconds));

  console.log(profile.name.padEnd(8));
  console.log(`  reels     ${row(played.map((run) => run.summary.reels)).map(fmt).join(' / ')}`);
  console.log(`  score     ${row(played.map((run) => run.summary.score)).map(fmt).join(' / ')}`);
  console.log(`  seconds   ${seconds.map(fmt).join(' / ')}  (median ${clock(seconds[1])})`);
  console.log(
    `  accuracy  ${row(played.map((run) => run.summary.accuracy / 10))
      .map((v) => `${v.toFixed(1)}%`)
      .join(' / ')}`,
  );
  console.log(
    `  same length ±10 %: ${within10.runs} runs · p10/p50 ${ratio(within10.low)} · p90/p50 ${ratio(within10.high)}` +
      `   ±5 %: ${ratio(within5.low)} · ${ratio(within5.high)}`,
  );
  console.log(
    `  elasticity ${elasticity(played).toFixed(2)} · named combos ${(bonusShare(played) * 100).toFixed(1)} % of points · per run ${BONUS_KINDS.map(
      (kind) => `${kind} ${perRun(played, (run) => run.summary.bonuses[kind])}`,
    ).join(' · ')}`,
  );
  console.log(
    `  ended by  drained ${ends.drained} · penalty ${ends.penalty} · quit ${ends.quit}\n`,
  );
}

// The blind swiper: every reel swiped as it arrives, a touch on the freeze
// reels — what the blind-move penalty (`RULES.blindMs`) is for.
for (const ms of [150, 200, 250]) {
  const summaries = Array.from({ length: runs }, (_, i) => {
    const run = new Run((i + 1) * 7919);
    while (!run.over) run.apply(blindSwipe(run, ms));
    return run.summary();
  });
  console.log(`blind swiper, ${ms} ms`);
  console.log(`  reels     ${row(summaries.map((summary) => summary.reels)).map(fmt).join(' / ')}`);
  console.log(`  score     ${row(summaries.map((summary) => summary.score)).map(fmt).join(' / ')}\n`);
}

// Dereceli's difficulties: each profile at every fourth step, and what the
// feed and the meter did to it — the table in docs/product/scoring.md.
const share = (played: readonly Played[], difficulty: number) => {
  let reels = 0;
  let specials = 0;
  let freezes = 0;
  played.forEach((run, i) => {
    const stream = new ReelStream((i + 1) * 7919, difficulty);
    for (let n = 0; n < run.summary.reels; n += 1) {
      const { kind } = stream.next();
      if (n < 8) continue;
      reels += 1;
      if (kind !== 'skip') specials += 1;
      if (kind === 'freeze') freezes += 1;
    }
  });
  return { specials: (specials * 100) / reels, freezes: (freezes * 100) / reels };
};

console.log('difficulties · median score (vs 0) · median length · special / freeze share · same length ±10 %\n');
for (const profile of [...PROFILES, ELITE]) {
  console.log(profile.name);
  let base = 0;
  for (const difficulty of [0, 4, 8, 12, MAX_DIFFICULTY]) {
    const played = playProfile(profile, runs, 1, difficulty);
    const score = row(played.map((run) => run.summary.score))[1];
    if (difficulty === 0) base = score;
    const seconds = row(played.map((run) => run.seconds))[1];
    const kinds = share(played, difficulty);
    const spread = sameLengthSpread(played, 0.1);
    console.log(
      `  ${String(difficulty).padStart(2)}  ${fmt(score).padStart(9)} (${difficulty === 0 ? '   —' : `${Math.round((score / base - 1) * 100)} %`.padStart(5)})` +
        `  ${clock(seconds)}  specials ${kinds.specials.toFixed(0)} % · freeze ${kinds.freezes.toFixed(0)} %` +
        `  · ${ratio(spread.low)} · ${ratio(spread.high)}`,
    );
  }
  console.log();
}
