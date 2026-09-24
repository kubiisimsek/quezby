# Changelog

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
