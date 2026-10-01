/**
 * Balancing report: plays thousands of runs per skill profile and prints how
 * long they last on the app's clock, what they score, and whether the
 * consistency promise holds (same skill + same length → within ±20 %); then
 * the speed × error table (thumbs from 700 to 300 ms, erring on 0–30 % of
 * the reels) and Dereceli's difficulties (`src/difficulty.ts`). Run after
 * touching either table:
 *
 *   pnpm engine:simulate            # 2000 runs per profile
 *   pnpm engine:simulate -- 500     # quicker
 */
import {
  bonusShare,
  elasticity,
  percentile,
  playProfile,
  playThumb,
  sameLengthSpread,
  type Played,
} from '../src/balance';
import { ELITE, PROFILES, THUMBS, blindSwipe } from '../src/bot';
import { MAX_DIFFICULTY, difficultyRules } from '../src/difficulty';
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
  console.log(`  seconds   ${seconds.map(fmt).join(' / ')}  (median ${clock(seconds[1])}, the app's clock)`);
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

// The speed × error table: a thumb that decides in 700 … 300 ms and errs on a
// share of the reels, whatever they are — median score and length, and how
// many runs pass 500k and 1M. docs/product/scoring.md → "Hız ve hata".
const ERRORS = [0, 0.01, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3];
const thumbRuns = Math.min(runs, 300);
console.log(`speed × error · ${thumbRuns} runs a cell · median score · median length · ≥500k · ≥1M`);
console.log(`          ${ERRORS.map((err) => `${Math.round(err * 100)} %`.padStart(22)).join('')}`);
for (const thumb of THUMBS) {
  const cells = ERRORS.map((err) => {
    const played = playThumb(thumb, err, thumbRuns);
    const share = (min: number) =>
      Math.round((played.filter((run) => run.summary.score >= min).length / played.length) * 100);
    const score = row(played.map((run) => run.summary.score))[1];
    const length = row(played.map((run) => run.seconds))[1];
    return `${fmt(score)} ${clock(length)} ${share(500_000)}/${share(1_000_000)}`.padStart(22);
  });
  console.log(`  ${String(thumb.reaction).padStart(3)} ms  ${cells.join('')}`);
}
const longest = Math.max(...playThumb(THUMBS[THUMBS.length - 1]!, 0, runs).map((run) => run.seconds));
console.log(`  the longest of ${runs} flawless ${THUMBS[THUMBS.length - 1]!.reaction} ms runs: ${clock(longest)}\n`);

// Dereceli's difficulties: each profile at every fourth step — the feed is
// the same at all of them; only the meter's gain and loss tighten. The table
// in docs/product/scoring.md, and the medians RatingBalanceTest draws from.
console.log('difficulties · gain / penalty · median score (vs 0) · median length · same length ±10 %\n');
for (const profile of [...PROFILES, ELITE]) {
  console.log(profile.name);
  let base = 0;
  for (const difficulty of [0, 4, 8, 12, MAX_DIFFICULTY]) {
    const played = playProfile(profile, runs, 1, difficulty);
    const score = row(played.map((run) => run.summary.score))[1];
    if (difficulty === 0) base = score;
    const seconds = row(played.map((run) => run.seconds))[1];
    const spread = sameLengthSpread(played, 0.1);
    const rules = difficultyRules(difficulty);
    console.log(
      `  ${String(difficulty).padStart(2)}  ×${(rules.gain / 1000).toFixed(2)} / ×${(rules.penalty / 1000).toFixed(2)}` +
        `  ${fmt(score).padStart(9)} (${difficulty === 0 ? '   —' : `${Math.round((score / base - 1) * 100)} %`.padStart(5)})` +
        `  ${clock(seconds)}  · ${ratio(spread.low)} · ${ratio(spread.high)}`,
    );
  }
  console.log();
}

// Every difficulty's median for each profile, as RatingBalanceTest's
// DIFFICULTY_MEDIANS lists them.
if (process.env.MEDIANS) {
  for (const profile of [...PROFILES, ELITE]) {
    const medians = Array.from({ length: MAX_DIFFICULTY + 1 }, (_, difficulty) =>
      Math.round(row(playProfile(profile, runs, 1, difficulty).map((run) => run.summary.score))[1] / 100) * 100,
    );
    console.log(`'${profile.name}' => [${medians.join(', ')}],`);
  }
}
