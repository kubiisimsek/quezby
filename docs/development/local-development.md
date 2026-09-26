# Local development

## Prerequisites

- Node ≥ 22.11 (`.nvmrc` → `nvm use`), pnpm 10
- PHP ≥ 8.3 and Composer (API)
- Xcode 26 + CocoaPods through Homebrew Ruby (`/opt/homebrew/opt/ruby@3.4`)
- Android Studio / SDK for Android (optional)

## First run

```bash
pnpm install                                   # root only
cd apps/api && composer install && cp .env.example .env \
  && php artisan key:generate && touch database/database.sqlite \
  && php artisan migrate && cd ../..
pnpm switch-local                              # makes apps/mobile/.env, points the app at :8000
cd apps/mobile && LANG=en_US.UTF-8 PATH="/opt/homebrew/opt/ruby@3.4/bin:$PATH" bundle install && cd ../..
pnpm pods
```

`apps/mobile/ios/.xcode.env.local` (git-ignored) must point Xcode at Node 22
and at pnpm's hidden store, or the codegen phase fails under pnpm:

```bash
export NODE_BINARY=$HOME/.nvm/versions/node/v22.17.0/bin/node
export NODE_PATH=$PWD/node_modules/.pnpm/node_modules   # from the repo root
```

## Every day

```bash
pnpm dev:api        # Laravel on 0.0.0.0:8000
pnpm dev:mobile     # Metro on 8081
pnpm ios            # Quezby Local on the simulator
pnpm android        # debug build; run `adb reverse tcp:8000 tcp:8000` for a device
```

The admin panel (`apps/admin`) runs next to the API:

```bash
pnpm dev:admin      # Vite on :5180 — /api is proxied to :8000
cd apps/api && php artisan quezby:admin:create you@example.com --name="Your Name"   # prints a temporary password
```

The same install talks to staging or production after `pnpm switch-staging` /
`pnpm switch-production` (restart Metro, then build again) —
`docs/development/environments.md`.

Boards, leagues and the daily challenge look empty on a fresh database. For a
populated local game (players with real, engine-played runs on every board,
today's challenge, a league group, follows):

```bash
cd apps/api && php artisan db:seed --class=DemoSeeder   # refuses outside APP_ENV=local
cd apps/api && php artisan db:seed --class=AdminDemoSeeder   # the panel's side: an admin per role, suspects, a ban
```

`AdminDemoSeeder` signs you in at `http://localhost:5180` as
`owner@quezby.test`, `moderator@quezby.test` or `viewer@quezby.test`
(password `password`), with bots on the suspects list, a banned player, a
phone that failed its device check and the moderation on the audit log.

Never "try" a migration with `php artisan migrate:fresh` or `db:wipe`: there
is no `.env.testing`, so it wipes `database/database.sqlite`. The Pest suite
migrates its own in-memory database and carries its own `APP_KEY`
(`phpunit.xml`), so it never leans on your `.env`; `php artisan migrate
--pretend` shows what a migration would do.

`php artisan key:generate` above is not a formality: without `APP_KEY` the API
answers every player request `500` — checkpoint receipts are signed with it and
Apple's refresh tokens encrypted with it (`docs/development/environments.md`).

## Checks

```bash
pnpm lint && pnpm typecheck && pnpm test    # packages, mobile (Jest + RNTL), admin panel (Vitest + Testing Library)
pnpm test:api                               # Laravel on Pest, incl. engine, lock, content and pace parity
pnpm engine:simulate                        # balancing report — the ±20 % promise per skill
pnpm engine:lock                            # says "current", or refuses a rules change without a version bump
```

API tests are **Pest** (`apps/api/tests`, `tests/Pest.php` for shared helpers
and datasets); `php artisan test` runs them. Every endpoint has a feature
test, every service a unit test. Shared fixtures come from the TS packages:
`pnpm engine:fixtures` (engine) and `pnpm --filter @quezby/config fixtures`
(content catalog, pace, checkpoints).

Locally `QUEZBY_INTEGRITY_MODE=log`: device verdicts are recorded on runs but
never keep one off the boards. The iOS Simulator cannot run App Attest and a
local Android build is not "Play recognized", so a local device is unverified
or failing — expected. To try the checks for real, install a Play internal
testing build (Android) or run on a physical iPhone (iOS).

## When a build breaks

| Symptom | First move |
| --- | --- |
| Codegen phase: `Cannot find module '@react-native/codegen'` | `ios/.xcode.env.local` `NODE_PATH` (above) |
| Codegen phase: `EPERM … uv_cwd` | the build ran without access to the folder — build from a terminal that has it |
| Metro cannot resolve a workspace package | `pnpm dev:mobile -- --reset-cache` |
| Env value is `undefined` | key missing from `apps/mobile/.env` (the switch lists them), or Metro started before the last switch |
| Xcode: *apps/mobile/.env changed after the iOS build settings were written* | run `pnpm switch-<env>` (or `pnpm ios`, which syncs) and build again |
| Bundling stops: *…would override apps/mobile/.env* | delete that `.env.local` / `.env.production` — every environment lives in `.env` |
| Parity test fails in PHP | the rules changed on one side only — see `docs/product/scoring.md` |
| `RulesLockTest` / `lock.test.ts` fails | a rule or engine behaviour changed: that is a new season — bump `ENGINE_VERSION`, `pnpm engine:fixtures`, `pnpm engine:lock` |
| `pod install`: *AppCheckCore depends upon GoogleUtilities…* | the Podfile's `modular_headers` lines for Google sign-in are missing |
| Apple sign-in fails on the simulator (error 1000) | no `DEVELOPMENT_TEAM` / capability yet — see `environments.md` |
