# Quezby — agent guide

pnpm + Turborepo monorepo. One mobile app, one admin panel, one Laravel API,
four packages.

**Quezby turns the reels-scrolling habit into a competitive reflex game.** An
endless vertical feed; each reel asks for one gesture — swipe up, double-tap,
press-and-hold, or *don't touch* — before its timer runs out, while a
dopamine meter drains faster every reel. Players compete on weekly, monthly
and all-time boards, a daily challenge everyone plays on one seed ("Günün
akışı") and Elo leagues played in Dereceli, which gets harder as the rating
climbs and never touches the score boards — and with their friends: requests, an inbox of
preset phrases, and VS (one seed, one attempt each, counted on no board).
Start at `docs/product/overview.md`.

## Read before you write

`docs/` is normative. `docs/rules/` is enforceable.

| Task | Read first |
| --- | --- |
| Anything with a UI in the game | `docs/design/design-language.md`, then `docs/design/mobile-design-system.md` |
| The admin panel (`apps/admin`) | `docs/design/admin-design-system.md`, then `docs/rules/admin-rules.md` |
| Anything user-visible | `docs/design/ui-writing.md` (six languages — every word of the app lives in `apps/mobile/src/i18n/messages`, a push's in `apps/api/lang`), then `docs/product/localization.md` |
| Game rules, scoring, difficulty | `docs/product/scoring.md` |
| Elo, Dereceli, leagues | `docs/product/scoring.md` → "Elo" |
| Anti-cheat, device integrity, checkpoints | `docs/product/scoring.md` → "Hile koruması" |
| Usernames | `docs/product/usernames.md` |
| Friends, the inbox, VS, profile photos, reports, push | `docs/product/overview.md` → "Arkadaşlar", then `docs/backend/api-contract.md`; setting push up: `docs/development/environments.md` → "Push notifications" |
| Analytics, consent, the device registry | `docs/product/analytics.md` |
| API work | `docs/backend/api-contract.md` · admin routes: `docs/backend/admin-api.md` |
| Mobile | `docs/rules/react-native-rules.md` |
| Local / staging / production | `docs/development/environments.md` |
| Running it | `docs/development/local-development.md` |
| Hosting | `docs/deployment/shared-hosting.md` |

## Layout

```
apps/mobile     Bare React Native 0.86 — ios/ and android/ are committed source
apps/admin      Vite + React admin panel, static files for shared hosting —
                players, bans, suspects, reports, runs, boards, ratings, admins,
                audit log
apps/api        Laravel + Sanctum — identity (guest, email, Apple, Google), run
                verification, boards, daily challenge, Elo (Dereceli) and its
                leagues, friends, inbox,
                VS, profile photos, reports, push, run history, stats
packages/engine the game rules: deterministic, integer-only, replayed by the API,
                locked by rules.lock.json
packages/config username rules, the feed's content catalog, the app's pace, the
                friends' phrases and the photo's limits (shared with the API
                through fixtures)
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
  the config reads it) + the season's Elo targets
  (`config/quezby.php` › `rating.targets[ENGINE_VERSION]`). `php artisan test`
  proves parity, the lock and the targets. Dereceli's difficulty table
  (`packages/engine/src/difficulty.ts` + `apps/api/app/Game/Difficulty.php`,
  difficulty 0 = the engine as it is) is sealed apart in
  `difficulty.lock.json`: a change is a `DIFFICULTY_VERSION` bump + fixtures +
  lock + `rating.difficulty.targets`, not a new season.
- **The design language is not optional — and it is a game's.** Quezby must
  look like a mobile game, never an app ("Arena": the dark arena, outlined
  tiles, slab buttons with one gold play per screen, Rubik display type, no
  navigation bars, the dock). Screens are built from
  `apps/mobile/src/ui/kit.tsx` and `sheet.tsx`; `src/ui/tokens.ts` is generated
  from `apps/mobile/design/palette.mjs` (`pnpm tokens`). The enforceable list
  is in `docs/rules/react-native-rules.md` → "Quezby looks like a game".
  This is the game's (`apps/mobile`) only: the admin panel is a staff tool with
  its own language — Qesvis's admin language in Quezby's colours,
  `docs/design/admin-design-system.md` — and never borrows Arena.
- **Mobile is bare RN, not Expo.** Never add `expo*` packages. Never regenerate
  or gitignore `apps/mobile/ios` / `android`.
- **A contract change is one commit:** `packages/types` → Laravel → `packages/sdk` → screen.
- **The admin panel judges nothing, and everything it does is on record.** It
  shows what `/api/v1/admin` sends and never imports the engine; every admin
  route declares its least role (`RolesTest`), admin and player tokens never
  open each other's routes, and every change writes the audit log —
  `docs/rules/admin-rules.md`.
- **The phone's word about itself counts for nothing.** Whether a device may
  rank comes only from Google Play Integrity / Apple App Attest verified on the
  API, and a run's timing from server-signed checkpoints.
- **Secrets never reach the app bundle.** `apps/mobile/.env` ships to users,
  and so does every `VITE_*` of `apps/admin` (only `VITE_API_ORIGIN` exists).
- **Never commit `.env`**; update the matching `.env*.example` when adding a variable.
- **Never run `git commit`, `git branch` or `git push`.** Leave finished work in
  the working tree and say what changed — the owner commits.

## Commands

```bash
pnpm install
pnpm switch-local | switch-staging | switch-production   # the app's API (one bundle id)
pnpm dev:api | dev:mobile | dev:admin | ios | android
pnpm lint && pnpm typecheck && pnpm test && pnpm test:api
pnpm engine:simulate | engine:fixtures | tokens
pnpm api:package:staging | api:package:production
pnpm admin:package:staging | admin:package:production
```

## Definition of done

1. `pnpm lint && pnpm typecheck && pnpm test && pnpm test:api` pass. Every
   operation has a test: API tests are **Pest** (`apps/api/tests`), packages use
   vitest, the app Jest + React Native Testing Library, the admin panel
   Vitest + Testing Library.
2. Docs updated when behaviour, rules or contracts changed;
   `docs/changelog/CHANGELOG.md` has an entry.
3. No `any`, no screen-level `fetch`, no hex outside `design/palette.mjs` (the
   game) or the OKLCH ramps of `apps/admin/src/index.css` (the panel).
