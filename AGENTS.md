# Quezby

pnpm + Turborepo monorepo. **Quezby turns reels scrolling into a competitive
reflex game** — swipe, double-tap, hold, or don't touch, before the dopamine
meter runs dry. Start at `docs/product/overview.md`.

- Apps: `apps/mobile` (**bare React Native**, not Expo), `apps/api` (Laravel + Sanctum)
- Packages: `engine`, `config`, `types`, `sdk`, `tsconfig` — never UI
- Node ≥ 22.11, pnpm 10, PHP ≥ 8.3

`docs/rules/` is enforceable and overrides this file. Full agent guide: `CLAUDE.md`.

- The engine (`packages/engine`) is the only judge of a run; the API replays
  it in PHP. The rules are locked (`rules.lock.json`): a change is a new
  season, on both sides, in one commit — see `docs/product/scoring.md`.
- Nothing shown after a run is computed on the phone; it comes from the API.
- Tests for every operation; API tests are Pest.
- Design SoT: `docs/design/design-language.md` ("Arena" — Quezby looks like a
  game, never an app) — build screens from the kit; the enforceable rules are in
  `docs/rules/react-native-rules.md`.
- Never run `git commit`, `git branch` or `git push` — the owner commits.
