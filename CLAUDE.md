# Quezby — agent guide

pnpm + Turborepo monorepo. One mobile app, one Laravel API, four packages.

**Quezby turns the reels-scrolling habit into a competitive reflex game.** An
endless vertical feed; each reel asks for one gesture — swipe up, double-tap,
press-and-hold, or *don't touch* — before its timer runs out, while a
dopamine meter drains faster every reel. Players compete on daily, weekly,
monthly and all-time boards, a daily challenge everyone plays on one seed
("Günün akışı"), weekly leagues, and against the players they follow. Start at
`docs/product/overview.md`.

## Read before you write

`docs/` is normative. `docs/rules/` is enforceable.

| Task | Read first |
| --- | --- |
| Anything with a UI | `docs/design/design-language.md`, then `docs/design/mobile-design-system.md` |
| Anything user-visible | `docs/design/ui-writing.md` |
| Game rules, scoring, difficulty | `docs/product/scoring.md` |
| Usernames | `docs/product/usernames.md` |
| API work | `docs/backend/api-contract.md` |
| Mobile | `docs/rules/react-native-rules.md` |
| Local / staging / production | `docs/development/environments.md` |
| Running it | `docs/development/local-development.md` |
| Hosting | `docs/deployment/shared-hosting.md` |

## Layout

```
apps/mobile     Bare React Native 0.86 — ios/ and android/ are committed source
apps/api        Laravel + Sanctum — identity (guest, email, Apple, Google), run
                verification, boards, daily challenge, leagues, follows, stats
packages/engine the game rules: deterministic, integer-only, replayed by the API,
                locked by rules.lock.json
packages/config username rules, the feed's content catalog and the app's pace
                (shared with the API through fixtures)
packages/types  the API contract
packages/sdk    the typed API client
```

## Hard rules

- **The engine is the only judge.** `Run.apply` decides every outcome in the
  app; the API replays the same log with `apps/api/app/Game` and stores *its*
  result. A score is never accepted from a client, and nothing a player sees
  after a run — score, stats, ranks, gaps, league, share text, countdown ends —
  is computed on the phone: it comes from the API.
- **The scoring system is locked.** A rules change is a new season, in one
  commit on both sides: `packages/engine/src/rules.ts` + `ENGINE_VERSION` bump +
  `pnpm engine:simulate` (the ±20 % promise must hold) + `pnpm engine:fixtures`
  + `pnpm engine:lock` + `apps/api/app/Game/Rules.php` (`Rules::ENGINE_VERSION`;
  the config reads it). `php artisan test` proves parity and the lock.
- **The design language is not optional.** Screens are built from
  `apps/mobile/src/ui/kit.tsx` and `sheet.tsx`; `src/ui/tokens.ts` is generated
  from `apps/mobile/design/palette.mjs` (`pnpm tokens`).
- **Mobile is bare RN, not Expo.** Never add `expo*` packages. Never regenerate
  or gitignore `apps/mobile/ios` / `android`.
- **A contract change is one commit:** `packages/types` → Laravel → `packages/sdk` → screen.
- **Secrets never reach the app bundle.** `apps/mobile/.env` ships to users.
- **Never commit `.env`**; update the matching `.env*.example` when adding a variable.
- **Never run `git commit`, `git branch` or `git push`.** Leave finished work in
  the working tree and say what changed — the owner commits.

## Commands

```bash
pnpm install
pnpm dev:api | dev:mobile | ios | ios:staging | android | android:staging
pnpm lint && pnpm typecheck && pnpm test && pnpm test:api
pnpm engine:simulate | engine:fixtures | tokens
pnpm api:package:staging | api:package:production
```

## Definition of done

1. `pnpm lint && pnpm typecheck && pnpm test && pnpm test:api` pass. Every
   operation has a test: API tests are **Pest** (`apps/api/tests`), packages use
   vitest, the app Jest + React Native Testing Library.
2. Docs updated when behaviour, rules or contracts changed;
   `docs/changelog/CHANGELOG.md` has an entry.
3. No `any`, no screen-level `fetch`, no hex outside `design/palette.mjs`.
