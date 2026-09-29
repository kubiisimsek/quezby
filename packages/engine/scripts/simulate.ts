/**
 * Balancing report: plays thousands of runs per skill profile and prints how
 * long they last, what they score, and whether the consistency promise holds
 * (same skill + same length → within ±20 %). Run after touching `src/rules.ts`:
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
import { PROFILES, blindSwipe } from '../src/bot';
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
  `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;

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
