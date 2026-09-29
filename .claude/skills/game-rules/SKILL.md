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

## Changing a rule (only when the owner asked for a new season)

1. Edit `packages/engine/src/rules.ts` (or `reels.ts` / `run.ts`) and bump `ENGINE_VERSION`.
2. `pnpm engine:simulate` — the consistency promise must hold: for every
   profile, runs within ±10 % of the median length score between 0.8× and 1.2×
   their median (p10/p90), medians ordered by skill, lengths in the bands
   `balance.test.ts` sets (casual ≈ 2 min, average ≈ 3.5, good 5–6, pro ≈ 7.5).
   Update the tables in `docs/product/scoring.md`.
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
8. Add a `docs/changelog/CHANGELOG.md` entry; ship the app and raise
   `QUEZBY_*_MIN_VERSION`.

## Invariants

- Exactly three RNG draws per reel, whatever is used.
- Windows never below `windowMin`; drain grows without bound (every run ends).
- A log the app could not have produced throws `EngineError` — never "fix it up".
- The client never sends a score the server trusts; `clientScore` is only
  compared, and a mismatch flags the run.
- Named combos are paid by the level multiplier, never by the combo.
