---
name: game-rules
description: Change Quezby's gameplay rules, scoring, difficulty curves or the replay engine. Use for any edit to packages/engine or apps/api/app/Game, or when balancing the game.
---

# Game rules

The engine in `packages/engine` is the only judge of a run. The API replays
every ranked run with its PHP twin in `apps/api/app/Game` and stores its own
result, so **both engines must produce identical summaries** for the same seed
and actions — step by step, named combos included. Integer arithmetic only —
per-mille and milliseconds.

Read first: `docs/product/scoring.md`.

## The rules are locked

`packages/engine/rules.lock.json` seals the engine version, the hash of every
rule and the hash of the fixtures both engines replay. `lock.test.ts` and
`apps/api/tests/Unit/RulesLockTest.php` fail the moment any of it drifts, and
`pnpm engine:lock` refuses to re-seal changed rules under the same version.
**A rules change is a new season**: every board starts fresh, because a board
only ever ranks one engine version.

## Dereceli's difficulty table is sealed apart

`packages/engine/src/difficulty.ts` (PHP twin `apps/api/app/Game/Difficulty.php`)
holds the 17 rows a rated run can be played at: `new Run(seed, difficulty)`,
`replay(seed, actions, difficulty)`. Difficulty 0 must stay engine vN byte for
byte — every other mode plays it and the rules lock and fixtures do not move.
`difficulty.lock.json` seals the table and `fixtures/difficulty.json`; a change
is a `DIFFICULTY_VERSION` bump (both engines), `pnpm engine:simulate` (the
difficulty report and `balance.test.ts` → *difficulty balance*),
`pnpm engine:fixtures`, `pnpm engine:lock`, new Elo targets in
`config/quezby.php` › `rating.difficulty.targets[ENGINE_VERSION][DIFFICULTY_VERSION]`
and `RatingBalanceTest`'s difficulty medians — never a new season.
`docs/product/scoring.md` → *Dereceli zorluğu*.

## Changing a rule (only when the owner asked for a new season)

Before the first store release the owner may keep the version instead
("henüz staging yapıdayız", 2026-10-01): make the same changes in both
engines, then `pnpm engine:lock -- --reseal` replaces the current version's
seal in both locks (the history keeps one seal per version), and the Elo
targets of that version are re-set in place. Never after the release.

1. Edit `packages/engine/src/rules.ts` (or `reels.ts` / `run.ts`) and bump `ENGINE_VERSION`.
2. `pnpm engine:simulate` — the consistency promise must hold: for every
   profile, runs within ±10 % of the median length score between 0.8× and 1.2×
   their median (p10/p90), medians ordered by skill, lengths on the app's
   clock in the bands `balance.test.ts` sets (casual ≈ 1:45, average ≈ 2:50,
   good ≈ 3:50, pro ≈ 4:35; the longest run ≈ 6 min) and the owner's speed ×
   error targets (*speed and errors*: 500k for a careful 400 ms thumb, 1M only
   for 300 ms). Update the tables in `docs/product/scoring.md`.
3. `pnpm engine:fixtures` — regenerates `packages/engine/fixtures/*.json`
   (replays, rejects, curves, bonuses, rules).
4. `pnpm engine:lock` — seals the new version.
5. `pnpm --filter @quezby/engine test` — rules, scoring, balance, fixtures, lock.
6. Mirror the change in `apps/api/app/Game/*.php` (`Rules::ENGINE_VERSION`;
   `config/quezby.php` reads it, and the season follows it) and
   `Rules::toArray()`. Add the new version's Elo targets
   (`config/quezby.php` › `rating.targets[ENGINE_VERSION]`, from the
   simulation's medians — `docs/product/scoring.md` → *Elo*); keep the old
   ones for late approvals.
7. `cd apps/api && php artisan test` — `EngineParityTest` replays every fixture
   in PHP reel by reel; `RulesLockTest` checks the PHP rules hash to the lock.
8. A new engine replays the difficulty fixtures differently: bump
   `DIFFICULTY_VERSION` too, re-seal, and give the new pair its Elo targets.
9. Add a `docs/changelog/CHANGELOG.md` entry; ship the app and raise
   `QUEZBY_*_MIN_VERSION`.

## Invariants

- Exactly three RNG draws per reel, whatever is used.
- Windows never below `windowMin`; drain grows without bound (every run ends).
- A log the app could not have produced throws `EngineError` — never "fix it up".
- The client never sends a score the server trusts; `clientScore` is only
  compared, and a mismatch flags the run.
- Named combos are paid by the level multiplier, never by the combo.
