# Changelog

## 2026-09-26 — Staging fixes: APP_KEY, permanent names, verdict colours

- **Staging went out without `APP_KEY`** (and with `APP_ENV=local`), which
  explains two bugs at once: every checkpoint check-in answered `500`, so
  honest runs were reviewed for "Makbuz eksik" (`checkpoint_missing`, received
  0); and Apple sign-in failed after Face ID, because storing Apple's refresh
  token (an `encrypted` column) needs the key — Google stores none, so it
  worked. The key now cannot go missing quietly:
  - `scripts/check-api-env.mjs` — `package-api.sh` checks the `.env` first and
    builds nothing without a well-formed `APP_KEY`, with another `APP_ENV` or
    with debug on (Laravel's own reading of `APP_DEBUG`); an empty
    `QUEZBY_DAILY_SECRET` is a warning. It never prints a value.
  - `RequireAppKey` (API middleware): without the key every player request is
    a logged `500` before anything runs — Apple's one-time code is no longer
    spent for nothing. `/admin/*` and `/ops/*` stay open: they need no key and
    they are how it is put right. `App\Support\AppKey` says what is wrong.
  - **`AdminSystem.appKey`** (contract): the panel's Sistem page says in red
    when the key is missing, with **Önbelleği yenile** at hand.
  - `phpunit.xml` carries the suite's own key instead of leaning on a local
    `.env`. Docs: why the key must stay the same on the machine and the server,
    and never change (`APP_PREVIOUS_KEYS` does not cover receipts).
- **A lost check-in is tried again** (`useGame`): a check-in that fails on the
  network, a timeout or a `5xx` goes again at a later verdict, at least 5 s
  later, at most twice a run — three marks and two retries, never more than a
  finish carries (`CHECKPOINTS.maxReceipts`). A refused one (`4xx`, `429`) is
  not retried. The API is unchanged: a retry is sent like any check-in.
- **A username is picked once and never changes.** `PUT /me/username` writes a
  name only over the automatic one (or none): any other answers the new
  **`409 username_locked`**, the same name again stays a harmless `200`, and
  the write holds only while the name is still the one the player had, so two
  quick picks cannot both land. Picks are throttled (`username-update`, 10 a
  minute). `canPickUsername` / `Username::isPickable` share the rule. The app
  says so wherever a name is picked ("seçtiğin ad bir daha değişmez"), Ayarlar
  shows a picked name locked — "Kullanıcı adın · @ekin · kalıcı", no arrow —
  instead of "Kullanıcı adını değiştir", and Yardım answers "Kullanıcı adımı
  değiştirebilir miyim?". The panel's **Adı sıfırla** is the one way out: it
  opens exactly one more pick. Names picked before this are permanent now.
- **The panel's verdicts read at a glance**: "Mükemmel" was the brand magenta,
  a hair from the failure red. A run's strip now draws İsabet light green (a
  soft fill with a green edge), Mükemmel solid green, Erken/Geç bıraktı amber,
  failures red and Dopamin bitti grey, and its tally pills carry each cell's
  swatch as the legend. The overview's clean runs are green too.
  `docs/design/admin-design-system.md`: the action colour is never a status.

## 2026-09-25 — The admin panel

- **`apps/admin`: the game's admin panel** — a static single-page app (Vite +
  React 19 + Tailwind v4 + TanStack Query) for shared hosting, on its own
  subdomain (`admin.quezby.com`, `staging-admin.quezby.com`). Pages: Genel
  bakış (today and 30 days, the queue, the week's signals), Oyuncular (search
  by name, email, id or install; ban, unban, reset a name, sign out, delete),
  Şüpheliler (the review queue, flagged runs, suspect players by risk), Turlar
  (every run, and a run post by post as the API's engine replays it),
  Sıralamalar, Günün akışı, Ligler, İçerik (how each post fares), Denetim
  kaydı, Yöneticiler and Sistem (migrations, caches and stale runs without SSH).
- **Its look is Qesvis's admin language in Quezby's colours** — a kit written
  from scratch in `apps/admin/src/components`, tokens in
  `apps/admin/src/index.css` (magenta primary, violet accent, the game's
  gradient on every page's band, light and dark), held to the game's palette
  and to contrast by `scripts/admin-tokens.test.mjs` (with `scripts/lib/oklch.mjs`,
  now shared with `pnpm tokens`). `docs/design/admin-design-system.md`,
  `docs/rules/admin-rules.md`. Arena stays the game's alone.
- **`/api/v1/admin`** (`docs/backend/admin-api.md`): staff accounts
  (`admins`) with roles — Sahip, Moderatör, İzleyici — on their own guard:
  an admin token opens no player route and a player token no admin route;
  `config/auth.php` pins the `sanctum` guard to players. Sessions end after
  `QUEZBY_ADMIN_TOKEN_HOURS` (12); a new admin starts on a temporary password
  shown once. A role that may not gets the new **`403 forbidden`** error code.
  Every route declares its least role and `RolesTest` holds the list.
- **The audit log** (`audit_entries`) records every moderation and admin
  action with who made it, from where and why — from the panel, `php artisan`
  and the ops routes alike: `ModerationService` now takes an `Actor` and writes
  the entry in the same transaction; a ban of a banned player changes nothing.
- **`runs.flag_codes`** (`,wall_clock,reaction_cv,`) keeps a run's flag codes
  findable in any database, in step with `flags` through the `Run` model;
  `App\Enums\RunFlag` lists every code with its severity and the weight the
  suspects list gives it. Indexes on `runs.started_at`, `runs.finished_at`
  and `users.created_at`.
- The first owner: `php artisan quezby:admin:create`, or `POST /ops/admins`
  behind the ops token. Account deletion moved into `AccountDeletion`, shared
  by `DELETE /me` and the panel; the ops chores into `OpsChores`, shared by
  `/ops/*` and the system page. `config/cors.php` lets browsers remember a
  preflight for two hours.
- **`@quezby/sdk/admin`** (`createAdminClient`), on the request core now in
  `packages/sdk/src/http.ts` — the app's client is unchanged and ships none of
  it; `packages/types/src/admin.ts` is the contract. Local demo data:
  `php artisan db:seed --class=AdminDemoSeeder` (an admin per role, bots, a ban).
  Hosting: `pnpm admin:package:staging|production` → one zip with its
  `.htaccess` (SPA routing, caching, a CSP naming the API) —
  `docs/deployment/shared-hosting.md` → "Yönetim paneli".

## 2026-09-25 — First launch: a practice run, a name, a way to keep the account

- **Play first.** The welcome has one gold **Oyna** — a guest account and
  straight into a **practice run** ("DENEME TURU") — and "Hesabım var, giriş
  yap". The practice run is the real game on the phone alone: nothing reaches
  the API, nothing counts (boards, league, stats, best). Before the first post
  of each kind the feed stops for a **coach card** (`CoachCard`, a new kit
  family) whose hand acts the move out; the post's clock starts on "Anladım".
  The engine only times a reel once it is live, so the locked rules are
  untouched (`useGame`: phase `coach`, `start('tutorial')`, `unseen` kinds on
  the result).
- **Then a name, which can wait.** Every account is named at birth —
  `guest48128742` (`GuestNames`, guests and new Apple/Google players alike) —
  so "Sana ne diyelim?" has a **Şimdilik geç**. Names that look automatic
  (`guest`/`misafir` + digits) are reserved in both copies of the rules and the
  shared fixture; `isAutoUsername` / `Username::isAutomatic` tell one apart, and
  the profile says "Adını seç" for it.
- **Then keeping the account, which can wait too** — `ProtectScreen`: Apple,
  Google, "E-postayla koru" (`CredentialsSheet`, out of the profile) or "Şimdi
  değil". An Apple/Google account that is someone else's can be switched to.
  A guest is asked once more, in the lobby, the moment their league opens.
- **The league opens after 3 counted runs** (ranked and scoring,
  `leagues.unlock_runs`): `LeagueResponse.unlock` and
  `FinishRunResponse.leagueUnlock` say how many are left ("Lige 2 oyun
  kaldı"); `LeagueService::join` seats nobody before. Anyone who has ever sat
  in a league is never locked again. There is still no player level or XP.
- The first steps live in `stores/onboarding` (per account, on the phone) and
  `navigation/gate.ts` decides what mounts. `docs/product/overview.md`
  ("İlk açılış"), `usernames.md`, `scoring.md`, `api-contract.md`, the design
  docs and `ui-writing.md` carry the rules.

## 2026-09-25 — Posts, not reels

- What comes down the feed is a **post** to the player everywhere they read
  it: the how-to guide ("Sıradan post", "Altın post", "Kırmızı postta elini
  çek"), the help screen, stats labels ("Post", "Postlardan"), league and
  player rows ("64 post"), the settings line and the API's share text
  ("… 245 post · bugün #12 …"). `docs/design/ui-writing.md` has the rule; the
  code and the product docs keep *reel* as the domain term.

## 2026-09-25 — Store listing

- `apps/mobile/store/`: the App Store (Turkish, plus an optional English (U.K.)
  localization that the Turkish storefront also indexes) and Google Play
  (`tr-TR`) texts, one field per file in fastlane's `deliver` / `supply`
  layout. The README explains the keyword strategy, categories, screenshot
  captions and what is left out on purpose (other brands, price and rank
  claims).
- `scripts/store-listing.test.mjs` (run by `pnpm test`) holds them to the
  stores' limits — the App Store keyword field is 100 **bytes**, and Turkish
  letters take two — and to the brand's spelling.

## 2026-09-24 — One bundle id; the environment comes from `.env`

- iOS and Android ship one id, **`com.kubisimsek.game.quezby`** — the
  `.local` and `.staging` apps that installed side by side are gone. iOS keeps
  only Debug and Release (the `Quezby Staging` scheme and the `Staging.*`
  configurations are gone); Android has no flavors.
- `QUEZBY_ENV` in `apps/mobile/.env` picks the API. `pnpm switch-local`,
  `switch-staging` and `switch-production` (`scripts/switch-env.mjs`, tested
  with `node --test`, run by `pnpm test`) set it and write
  `ios/Config/Environment.generated.xcconfig` — the name on the home screen and
  Google's iOS URL scheme; Gradle reads `.env` itself. `pnpm ios` syncs iOS
  first, and an Xcode build stops when `.env` changed after the last switch.
- Google ids and the Play Integrity project number are one each now
  (`GOOGLE_WEB_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID`,
  `GOOGLE_CLOUD_PROJECT_NUMBER`); only the API URLs stay per environment.
- Metro's cache is keyed on `.env`, so a switch needs only a Metro restart.
  Jest no longer reads the real `.env` (react-native-dotenv used to inline it
  into tests): `@env` is `src/types/env.mock.ts`. A `.env.local` /
  `.env.production` next to `.env` — which react-native-dotenv would merge
  over it — stops the bundle.
- API: `APPLE_BUNDLE_IDS` and `PLAY_INTEGRITY_PACKAGES` default to the one id.
- `docs/development/device-integrity-setup.md`: App Attest and Play Integrity,
  console by console.

## 2026-09-24 — Anti-cheat v3: device integrity and checkpoints

- **Device integrity.** Android proves itself with Google **Play Integrity**
  (standard requests), iOS with **App Attest** (a key attested once per install,
  then signed assertions), both against a one-time server challenge. The API
  verifies them itself (Google's decode endpoint with a service account; Apple's
  certificate chain, nonce, app id, counter) and keeps the verdict for a few
  hours per device, so it is not a per-run cost. Policy (`QUEZBY_INTEGRITY_MODE`,
  `enforce` in production): a **failing** device (rooted, emulator, changed app)
  plays but never ranks, and the result says so; an **unverifiable** one (no
  Google services, old phone, simulator, service down) ranks, with its top
  scores held for review.
- **Checkpoints against slowed-down games.** A ranked run checks in at 45 s,
  120 s and 240 s of play with the SHA-256 of its moves so far; the API signs
  the time it saw it (no database write) and, at the finish, compares real time
  with the time those moves need at the app's pace: `slow_motion` (hard),
  `slow_timing` / `checkpoint_missing` (soft), `checkpoint_forged` /
  `checkpoint_mismatch` (hard). SHA-256 in `@quezby/config` (Hermes has no
  WebCrypto) with PHP parity fixtures.
- Rules: `docs/rules/react-native-rules.md` gained the enforceable
  "Quezby looks like a game" section; CLAUDE.md and AGENTS.md point to it.

## 2026-09-24 — Arena: Quezby looks like a game

The owner found v2 still "an app, not a game". After researching how games
are drawn (Duolingo's 3D buttons, Clash Royale's and Brawl Stars' lobbies,
docks and ladders), the whole app moved to a new design language, **Arena**
(`docs/design/design-language.md`, rewritten).

- **One art direction:** a violet night lit magenta from the top with faint
  lanes (`Arena`, behind every `Screen`); no white or grey canvases; the app no
  longer follows the phone's light/dark setting. `design/palette.mjs` now has
  one flat `roles` set (`arena` in `tokens.ts`) with new roles for tiles,
  outline, lips, wells, gold, cyan time and medal rims; `pnpm tokens` refuses a
  light/dark pair.
- **Type:** Rubik Black/ExtraBold for titles, numbers and buttons (on a hard
  drop shadow) and Nunito for text, replacing Quicksand. Both carry every
  Turkish letter — checked glyph by glyph; Lilita One, Fredoka, Titan One and
  the caps-only faces games often use do not. Static Latin subsets in
  `assets/fonts`, linked for iOS and Android (native rebuild needed).
  Ribbons and tile names may be in capitals, typed with the Turkish İ.
- **Depth:** every tile and button has a dark outline and a lip; buttons are
  `Slab`s that sink into their lip under the thumb. Gold (`play`) is the one
  action that starts a game; magenta and violet do the rest.
- **No app chrome:** native navigation bars are gone (`TopBar` on the arena
  instead); the tab bar became a **dock** — Zirve · Lig · **Oyna** (a gold slab
  standing out of the middle) · **Arkadaşlar** (search and follows, now a tab)
  · Profil; chevron rows became rows with an arrow slab; the iOS switch became
  the game's toggle; sheets are dark tiles with a red close slab.
- **Lobby rebuilt:** status strip (framed portrait with the league emblem),
  "Günün akışı" on a stage with a fan of the four reels, a big breathing gold
  play slab with a glint, the league tile with its progress bar, the rival as
  a VS face-off, records in gold.
- **Juice kit:** `Stamp`, `CountUp`, `Confetti`, `useShake` — each plays once
  and stands down under reduced motion; used on the result screen.
- Every screen restyled: welcome, login, username, lobby, Zirve, Lig, Günün
  akışı, result and HUD, profile (settings moved into a sheet), Arkadaşlar,
  Yardım, player card. Tests updated and added for the new kit (slab, top
  bar, toggle, juice, dock).

## 2026-09-24 — v2: Zirve, Günün akışı, ligler, kilitli puan

- **Engine v2, locked.** Drain `55 + ⌊n/5⌋` (runs last ~2 / 3,5 / 5–6 / 7,5 min
  from casual to pro); bases 100/120/150/120; a level multiplier that climbs from
  x1 towards x3 and never reaches it; a combo of x1,00–x1,50 (+0,05 per hit, a
  miss halves what is above x1); four named combos — Kusursuz seviye, Şimşek,
  Soğukkanlı, Geri dönüş. Same skill over the same length now scores within
  ±20 % (v1: −26 %…+41 %), locked by `balance.test.ts`. `rules.lock.json` seals
  the rules and fixtures (`pnpm engine:lock` refuses a change without a
  version bump); boards are per season (= engine version). PHP twin replays
  every fixture reel by reel; rules hash identical on both sides.
- **Nothing after a run is computed on the phone.** Start sends the engine and
  content versions (old apps get `engine_outdated`); the result screen says
  "Doğrulanıyor…" and shows only the API's answer — score, breakdown per named
  combo, stats, rank changes, players passed, league standing, daily card and
  the share text the API writes. An unsent finish is kept on the phone and
  retried.
- **Anti-cheat:** one open run per player (older ones `abandoned`), lazy
  `expired`, finish throttle, a wall clock built from the app's real pace
  (`@quezby/config` PACE ↔ `config/quezby.php`), hard flags (`fast_decisions`
  at the 250 ms speed floor, `hold_bounds`, `client_mismatch`, `banned`) and
  soft signals (rhythm, floor hugging, perfect share, score jump, shared
  install) that hold only a would-be top score for `review`; calibrated so no
  simulated player of any skill is caught. Moderation: `quezby:review`,
  `quezby:run:approve|reject`, `quezby:user:ban|unban`, `quezby:runs:expire`,
  and `POST /ops/moderate` behind `MODERATION_TOKEN`.
- **Boards:** Bugün / Hafta / **Ay** / Tüm zamanlar and the daily `challenge`
  board; `endsAt` + `serverTime`, `gap` to the row above, `neighbors`, `rival`,
  `nextRankProgress`, friends scope. The **Zirve** screen: podium, climb with
  gaps, a sticky "Senin katın" card with **Geç onu**, countdowns.
- **Günün akışı:** one HMAC-seeded feed per Istanbul day for everyone, one
  attempt (unique index), counted on every board and the league, with a
  server-built Wordle-like share grid.
- **Weekly leagues:** Bronz → Elmas, 30-player groups seated on the week's
  first ranked run, points = the sum of each day's best, top/bottom five move,
  settled lazily without cron. New Lig tab.
- **Follows:** search, player cards, follow/unfollow, following/followers,
  friends boards.
- **Stats:** per-run stats from the replay, lifetime `player_stats`, and which
  feed posts were shown and liked (`content_stats`, `player_content`) — the
  content catalog moved to `@quezby/config` with stable ids and a PHP twin.
- **Sign in with Apple and Google:** nonce-bound Apple tokens, JWKS-verified
  (cached) Apple and Google ID tokens, sign-in/up, linking to a guest and
  unlinking (never the last way in), Apple grant revoked on account deletion.
  iOS entitlement, Google URL scheme and URL handler, `SocialButton`s on the
  welcome and login screens, and on Profile: **Hesabını koru** for a guest,
  **Giriş yolları** once kept (add Apple, Google or an email; **Bağı kaldır**).
  The profile's badge and "Çıkış yap" name the real ways in instead of
  assuming an email.
- **Home is a game lobby:** today's Günün akışı with the one (breathing) play
  button, league and rival cards, records strip; "Nasıl oynanır" moved to a
  new **Yardım** screen.
- **Tests:** the API suite moved to **Pest** (every existing case kept) and
  grew with a test per endpoint and service; Jest moved to React Native
  Testing Library v14 with the official Reanimated mock; the kit was split into
  `ui/kit/*` with new components (Podium, ClimbRow, FloorCard, CountdownChip,
  TierBadge, MedalBadge, BonusChip, ShareGrid, LobbyCard, StatGrid, IconButton,
  SocialButton) and palette roles for medals, tiers and sign-in buttons.

## 2026-09-24 — MVP

- Monorepo: `apps/mobile` (bare RN 0.86), `apps/api` (Laravel + Sanctum),
  `packages/engine`, `config`, `types`, `sdk`, `tsconfig`.
- Engine v1: four reels (skip, like, hold, freeze), hyperbolic difficulty
  curves, ever-faster dopamine drain, level × combo scoring, deterministic
  xorshift32 feed, replay + parity fixtures, balancing simulator.
- Server-side run verification: seeded runs, PHP replay, wall-clock and
  reaction-time plausibility, flagged runs kept off the boards.
- Daily / weekly / all-time leaderboards in Europe/Istanbul with tie-breaks.
- Guest-first accounts (keychain token), unique usernames (a–z 0–9 . *,
  symbols never touching), optional email + password, in-app deletion.
- Three environments: bundle ids `.local` / `.staging` / production, iOS
  configurations + schemes, Android flavors, Laravel env templates and a
  shared-hosting zip packager.
- "Akış" design language derived from Qesvis "Sefer": generated OKLCH tokens,
  kit, sheets, icon set with game glyphs, haptics.
- Verified on the iOS simulator end to end (guest → username → runs →
  server replay → leaderboards → profile, light and dark) and an Android
  `localDebug` build. Fixes from that pass: a gesture the JS thread reached
  after the reel's window now counts as a timeout instead of throwing; the
  `/me` cache no longer overwrites a fresher session (`rememberMe`); the
  username box is uncontrolled; runs that scored nothing stay off the boards;
  Android flavors list their `debuggableVariants`.
- App icon (`apps/mobile/design/make-icons.py`) and branded launch screens.
