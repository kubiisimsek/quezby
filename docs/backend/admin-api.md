# Admin API — `/api/v1/admin`

**Types:** `packages/types/src/admin.ts` · **Client:** `createAdminClient` in `packages/sdk/src/admin.ts` (`@quezby/sdk/admin`)
**Server:** `apps/api/app/Http/Controllers/Admin`, `app/Services/Admin` · **Tests:** Pest, `apps/api/tests/Feature/Admin`
**Panel:** `apps/admin` — `docs/design/admin-design-system.md`, `docs/rules/admin-rules.md`

The admin panel's API: players, runs, suspects, reports, boards, ratings,
content, the audit log, the panel's own accounts and the system. It shares
the player API's conventions (`docs/backend/api-contract.md`): JSON with
camelCase keys, ISO-8601 UTC timestamps with milliseconds, one error shape.

A contract change is one commit, as for the player API: `packages/types`
(`admin.ts`) → Laravel → `packages/sdk` (`admin.ts`) → the panel screen.

**The panel judges nothing.** Every score, rank, flag, risk and rate it shows
comes from here; `apps/admin` may not import `@quezby/engine` (lint).

## Staff, not players

- Admins are their own model (`App\Models\Admin`, table `admins`), never a
  player. `config/auth.php` pins the `sanctum` guard to players and adds an
  `admin` guard for admins (both Sanctum, each with its own provider): **an
  admin token opens no player route and a player token no admin route**
  (`GuardIsolationTest`).
- Roles, each able to do everything the one below can:

  | Role | `role` | May |
  | --- | --- | --- |
  | İzleyici | `viewer` | read every page |
  | Moderatör | `moderator` | ban and unban, reset a name, take a photo down, dismiss reports, sign a player out, approve and reject runs |
  | Sahip | `owner` | delete a player's account, manage admins, run the system chores, see IP addresses in the audit log |

  Every admin route but the login carries `admin.role:<least role>`
  (`EnsureAdminRole`); `RolesTest` lists every route with its least role and
  fails when a route is missing from the list.
- A role below the least one gets **403 `forbidden`** ("Bu işlem için yetkin
  yok."). A disabled admin's token is deleted on its next request (401). An
  admin whose `mustChangePassword` is set gets 403 ("Önce şifreni değiştir.")
  everywhere but `GET /me`, `PUT /me/password` and `POST /auth/logout`.
- A session is a Sanctum token that stops working after
  `QUEZBY_ADMIN_TOKEN_HOURS` (12 by default) however busy it is — its own
  `expires_at`, so players' tokens are untouched.

## Auth

### `POST /auth/login` — public

`{ "email", "password" }` → `AdminSession`
`{ "token", "expiresAt", "admin": AdminMe }`. An unknown email, a wrong
password and a disabled account all answer `422 invalid_credentials` in the
same time (an unknown email is checked against a decoy hash). Expired tokens
of the admin are cleared. Throttled: 5 a minute per IP, and 10 a quarter hour
per email and IP. Recorded as `auth.login`.

### `POST /auth/logout` → `204`, ends this session only.

### `GET /me` → `{ "admin": AdminMe }`

`AdminMe`: `id, name, email, role, mustChangePassword, lastLoginAt`.

### `PUT /me/password`

`{ "currentPassword", "password", "passwordConfirmation" }` → `204`. At least
12 characters, different from the current one. Clears `mustChangePassword`
and ends every other session of the admin. A wrong current password is
`422 validation_failed` on `currentPassword`. Recorded as `auth.password_changed`.

## Lists

Every list is a page: `?page=` (from 1) and `?perPage=` (1–100, 25 by default)
→ `{ "items": [...], "page", "perPage", "total" }`, plus whatever the list
adds (`counts`, `days`…). A filter the API does not know is
`422 validation_failed` on that field.

Actions answer `{ "changed": bool }` — `false` when there was nothing to do
(banned already, no longer held…). Every change is recorded in the audit log
in the same transaction.

## Players

### `GET /players` — viewer

Filters: `search` (a username prefix, `@handle`, an email or its start, an
exact player id or install id; `%` and `_` mean themselves), `status`
(`active | banned | guest`), `platform` (`ios | android`), `sort`
(`newest | oldest | best | lastPlayed`; players with no best or no run last).
Rows are `AdminPlayerRow`; `counts` says how many each status chip holds under
the search and platform: `{ all, active, banned, guest }`. A row's `locale` is
the language the player plays in (`tr | en | de | ar | fr | es`, `Me.locale`);
the panel names it in Turkish ("Almanca"). The panel itself is answered in
Turkish whatever the browser's `Accept-Language` says.

A row's `avatarUrl` is the player's profile photo as players see it — an
absolute URL on the API, `/api/v1/media/avatars/<24 hex>.jpg`, served to
anyone who has it without a token and cached for a year (a new photo gets a
new name) — or `null` for none. The panel shows it as a plain `<img>`, so its
CSP names the API's origin in `img-src` (`apps/admin/deploy/htaccess.mjs`).

### `GET /players/{id}` — viewer

`AdminPlayerResponse`: the player (identities without their Apple tokens,
sessions, last seen, `analyticsAt` — when they said yes to usage analytics),
this season's best and ranks, lifetime stats, `rating`
(`AdminPlayerRating`: rating, league (the rating's tier), peak, next target,
placement or provisional runs left, shield, counted runs, when the last one
counted, and the last 30 changes (`placement`, `run`, `forfeit`, `void`,
`reversal`), the runs that did not count too, `counted: false`; null for a
player never rated), runs by status, the ten latest runs, the flag codes of the last
30 days, device checks (20 latest), other accounts on the same install,
`installs` — the phones the player used, from the device registry, each with
the other accounts seen on it — `social` (`friends`: their friends who are
not banned; `blockedBy`: how many players blocked them, a sign worth a look),
`openReports` (the reports still open about their photo and their name,
`{ photo, name }`) and the audit entries about them.

### `GET /players/{id}/activity` — viewer

`AdminPlayerActivity`: whether the player's activity is kept (`tracked`,
`no_consent`, `not_sampled`, `disabled`), their consent's moment, the last 30
Istanbul days (active days, visits, time, one entry a day), the 20 latest
visits with their journeys (`{ code, at }`), and their firsts — from the app
with consent (`tutorial_done`, `nickname_skip`, `protect_skip`,
`protect_reminder`) and from what the API keeps anyway (`joined`, `protected`,
`first_run`, `league` — placed in a league by Elo, the placement games
played). The panel asks only when its Etkinlik tab opens.

### `POST /players/{id}/ban` — moderator

`{ "reason" }` (3–191 characters). The silent ban of `docs/product/scoring.md`:
the player keeps playing; their rows leave every board, later runs are
flagged `banned`. A player banned already keeps the first reason: `changed: false`.

### `POST /players/{id}/unban` — moderator

Lifts the ban; this season's ranked runs go back on the boards.

### `POST /players/{id}/rename` — moderator

`{ "reason" }` → `{ "changed": true, "username": "guest00000007" }`. A fresh
automatic name (`GuestNames`) in place of one that should not be seen. A
picked name never changes otherwise, so this is the only way out of one: it
opens exactly one more pick for the player, and that name is permanent again
(`docs/product/usernames.md` → "Kalıcı ad"). The old name is in the audit
entry's details. The open reports about the name close as `resolved`.

### `POST /players/{id}/sign-out` — moderator

Ends every session the player has. A guest cannot be signed out — their token
is the only key to the account — `422 validation_failed`.

### `POST /players/{id}/avatar/remove` — moderator

`{ "reason" }` (3–191 characters). Takes the player's photo down — its file is
deleted — and closes the open reports about the photo as `resolved`, recorded
as `player.avatar_remove` with the file's name in the details. The player may
upload a new photo. A player with no photo: `changed: false`, nothing recorded.

### `POST /players/{id}/reports/dismiss` — moderator

`{ "reason" }` (3–191 characters). Lets every open report about the player go
— they close as `dismissed`, the photo and the name stay as they are —
recorded as `player.reports_dismiss` with how many in the details. None open:
`changed: false`, nothing recorded.

### `POST /players/{id}/delete` — owner

`{ "reason", "confirm" }` → `204`, where `confirm` is the player's username
typed out (else `422` on `confirm`). The same deletion as `DELETE /me`
(`AccountDeletion`: Apple's grant revoked, then the account, runs, board rows
and tokens). The audit entry stays. POST, not DELETE: some hosts drop a
DELETE's body.

## Runs

### `GET /runs` — viewer

Filters: `status` (every `AdminRunStatus`), `mode` (`free | daily | rated | vs`),
`flag` (a `RunFlagCode`, matched exactly), `player` (id), `from` / `to`
(Istanbul days `Y-m-d`, both inclusive, by start), `sort` (`newest | score`).
Rows are `AdminRunRow` — never the action log. `counts` is per status under
the other filters.

**VS runs** (`mode: vs`) are the runs of a VS between two friends, one attempt
each at one seed. The API replays one like any other run, but it never ranks:
a clean one is `played` — it settles its VS and counts on no board, rating,
stat or record — and one with a hard flag is `flagged` (it loses its VS; the
challenger's voids it). Its soft signals are kept but hold nothing, and the
checks against the player's history are not run for it, so a VS run is never
held for `review` and there is nothing to decide on it: `approve` and
`reject` answer `changed: false` (`ModerationService`), and the panel offers
neither. Neither the row nor the detail says which VS a run played.

### `GET /runs/{id}` — viewer

`AdminRunResponse`: the run with the server's result, the app's claim
(`clientScore`, `clientReels`), the stored stats and the Dereceli
`difficulty` it was played at (0 for any run but a rated one) with its
`difficultyVersion` (null outside rated runs and before the table);
`timeline` — every post as the API's engine replays it, at that difficulty (`index, kind, level, window, gesture, t, d,
verdict, points, bonusPoints, combo, meter`; points and bonus points add up to
the score) — or `timelineUnavailable`: `no_log` (never finished),
`other_engine` (another season's rules) or `engine_error`; `rating`
(`AdminRunRating`) — what the run did to the rating (kind, delta, before and
after, the target it played against, its performance and width, whether a
shield held) and `reversedBy` when a moderator's reject took the gain back;
null for a run that never reached the rating (a VS, one still open or held);
and the audit entries about it.

### `POST /runs/{id}/approve` — moderator

A run held for `review` ranks: on its boards (the week, month and season it
was played in; a daily run's challenge too) and into the player's stats — and
a Dereceli run counts on their Elo now, from the rating they have now (the
audit entry's `ratingDelta`). Any other status: `changed: false`.

### `POST /runs/{id}/reject` — moderator

`{ "reason" }`. A `ranked`, `review` or `flagged` run becomes `rejected` with a
hard `moderator` flag carrying the reason; the player's boards are rebuilt
from the runs left, and what the run **won** on the Elo is taken back, once
(`ratingDelta` on the audit entry) — what it lost stays. A VS run, and any
other status: `changed: false`.

### Finding runs by a flag

`runs.flag_codes` holds a run's flag codes between commas
(`,wall_clock,reaction_cv,`), kept in step with `flags` by the `Run` model and
by `ModerationService::reject`. `WHERE flag_codes LIKE '%,code,%' ESCAPE '!'`
reads the same in SQLite, MySQL and MariaDB, with no JSON functions.

## Suspects

### `GET /suspects?days=7|30&includeBanned=0|1` — viewer

`AdminSuspect` rows, riskiest first: players whose signals over the window
reach a risk of 3. Risk is Σ weight × count over the flag codes on their runs,
plus 4 per failed device check (at most three) and 3 when another account
shares their install. Banned players are left out unless asked for.

| Code | Severity | Weight | | Code | Severity | Weight |
| --- | --- | --- | --- | --- | --- | --- |
| `checkpoint_forged` | hard | 10 | | `daily_shared_install` | soft | 3 |
| `checkpoint_mismatch` | hard | 8 | | `score_jump` | soft | 2 |
| `moderator` | hard | 8 | | `reaction_cv` | soft | 2 |
| `client_mismatch` | hard | 6 | | `floor_hugging` | soft | 2 |
| `fast_decisions` | hard | 6 | | `perfect_share` | soft | 2 |
| `wall_clock` | hard | 6 | | `slow_timing` | soft | 1 |
| `slow_motion` | hard | 6 | | `checkpoint_missing` | soft | 1 |
| `hold_bounds` | hard | 5 | | `device_unverified` | soft | 0 |
| `device_integrity` | hard | 5 | | | | |
| `engine_error` | hard | 3 | | | | |
| `banned` | hard | 0 | | | | |

`App\Enums\RunFlag` holds the list, the severities and the weights; a unit
test holds it to every `'code' => …` the API writes and to `RunFlagCode`.

## Reports

Players report each other's photo or name — the only things a player makes
that others see (`POST /users/{username}/report`). A player reports each photo
or name of another once; a new photo or a new name can be reported afresh. A
report stays `open` until a moderator removes what it was about (`resolved`:
the photo taken down with `avatar/remove`, the name reset with `rename`) or
lets it be (`dismissed`: `reports/dismiss`).

### `GET /reports?status=open|resolved|dismissed` — viewer

`AdminReportRow`s, one per reported player, the latest report first; `status`
is `open` when left out. A row: `player` (`AdminPlayerRef`; `null` should the
account be gone — its reports go with it), `avatarUrl` — their photo as it
is now, `null` when they have none — `reasons`
(`{ photo, name }`, how many reports about each), `reports` (all of them),
`firstAt` and `lastAt`. Who reported is never shown. The panel lists them on
its Bildirimler page and decides on the player's page, where the photo and
the name can be seen.

## Overview

### `GET /overview` — viewer

`AdminOverview`: today's numbers (players, new, active, runs, ranked, flagged,
held for review, banned, today's "Günün akışı" players), 30 days of series
(new players, active players, finished runs, flagged or rejected runs — each
as long as `days`), the flag codes of the last 7 days, and the five best held
runs. Days are Istanbul days: each series is one query that buckets rows with
`CASE WHEN col >= ? AND col < ? THEN 'Y-m-d' …` on the days' UTC bounds
(`DaySeries`).

### `GET /counts` — viewer

`{ "review", "reports" }` — the sidebar's badges: runs held for review, and
players with a report still open.

## Analytics

### `GET /analytics?days=30|90` — viewer

`AdminAnalytics` — `docs/product/analytics.md`. Everything but `now.online`
and `devices` counts only the players who said yes to usage analytics:

- `collecting` — the kill switch and the sample (per-mille);
- `consent` — who said yes, of all and of the window's newcomers, per-mille;
- `now` — `online` (tokens used in the last 5 minutes, every player),
  active today, over the last 7 and 30 days (rolling), stickiness;
- `series` — one entry per Istanbul day: active, newcomers, returning,
  visits, minutes, average visit;
- `retention` — weekly cohorts of players active on the day they joined,
  newest first (8 weeks; 12 for 90 days), back on day 1, 3, 7, 14 and 30 —
  per-mille, `null` until the day is over for someone in the week;
- `funnel` — the window's newcomers who were active on their first day,
  through `joined → tutorial → named → protected → first_run → league →
  returned`; `league` — placed in a league by Elo (the placement games
  played); `returned` is of those who joined before today;
- `screens`, `events` — the window's totals, most first;
- `devices` — every player's phones seen in the last 7 days: app versions,
  systems (by major version) and models, each with its share per-mille;
- `storage` — each layer's rows, oldest and keep, and what was turned away
  in the last 7 days.

The API keeps the answer for a minute under one cache key per window. A
`days` it does not know is `422` on `days`.

## Boards

### `GET /boards?board=&key=&season=` — viewer

Any board (`weekly | monthly | all | challenge`) for any period key
(`2026-W39`, `2026-09`, `all`, or a challenge day `2026-09-24`; the current
one when left out) and season (this one when left out). There is no day
board: no run writes a day's row, and `daily` is `422` on `board`. Rows are ranked as the game ranks them —
score, then who got there first; ties share a rank, across pages too — with
the run behind each row and its signals. Adds `seasons` (every season with
rows), `number` ("Günün akışı #N" on the challenge board; `null` for a day
before `QUEZBY_DAILY_EPOCH`, which the game would also call #1), `startsAt`,
`endsAt`. A key that does not fit the board is `422` on `key`.

### `GET /boards/keys?board=&season=&limit=` — viewer

The periods a board has rows for, newest first (up to 90), each with its
number of players, leader and top score — and for the challenge board its
number (`null` before the first day) and `attempts` (daily runs started that
day, whatever became of them), with today first even before anyone played it.

## Ratings

The panel shows ratings; it never changes one (a rating moves only through
Dereceli runs and moderation). A player's league is their rating's tier,
ranked by Elo and never reset.

### `GET /ratings` — viewer

`AdminRatingsResponse`: placed players per league (`tiers`, banned ones left
out) and those of them with a counted run in the last `rules.activeDays`
(`active`), `placing` (still in their placement runs), the highest fifty
(`top`: player, rating, league, difficulty, peak, last counted) and `rules` —
the numbers the ratings run on, `unlockRuns` (the counted Normal or Günlük
runs before Dereceli opens, 20 by default), the difficulty ladder
(`difficultyVersion`, `difficultyFrom`, `difficultyStep`, `maxDifficulty`),
`targets` — the difficulty table's, what a placed player's run is measured
with — and `placementTargets`, difficulty 0's, what placement is measured
with. A player's `rating` also says the `difficulty` of their next rated run.

### `GET /ratings/calibration?days=` — viewer

`AdminCalibrationResponse`, the same report as `php artisan
quezby:rating:calibrate --days=`: the players with `minRuns` (10) counted runs
in the last `days` (1–365, 30 by default) played on the current difficulty
table (`difficultyVersion`), the share each league should hold, where those
players' medians settle with today's table, and per anchor the target now and
the one that would hold the shares. Nothing is written — a new table is a
config change (`rating.difficulty.targets`) with a changelog entry.

## Content

### `GET /content?kind=&sort=&page=&perPage=` — viewer

The latest catalog's posts, shown or not, a page at a time like every list:
`shows, likes, misses` and their per-mille rates of shows (`null` before a
post is shown), sorted by `shows`, `likeRate` or `missRate`. `totals` and
`topMissed` / `topLiked` — the five highest rates among the posts ever
missed or liked — cover every post of the kind asked for, not just the
page. The panel labels posts, and names their format, from `@quezby/config`
(`postsOf`).

## Audit log

### `GET /audit?action=&via=&admin=&subjectType=&subjectId=` — viewer

Newest first. An entry: `id, at, via, actor { id, name }, action,
subject { type, id, label }, reason, details, ip` — `ip` only for an owner.

- `via`: `panel` (an admin), `cli` (`php artisan quezby:*`), `ops`
  (`/ops/moderate`, `/ops/admins`) or `system`.
- `action`: `auth.login`, `auth.password_changed`, `player.ban`,
  `player.unban`, `player.rename`, `player.sign_out`, `player.delete`,
  `player.avatar_remove`, `player.reports_dismiss`,
  `run.approve`, `run.reject`, `admin.create`, `admin.update`,
  `admin.reset_password`, `system.migrate`, `system.optimize`,
  `system.expire_runs`, `system.analytics_prune`.
- The log only grows (`AuditEntry` refuses updates and deletes) and outlives
  the player it names: the subject is an id and a label, not a foreign key.
- Moderation from the command line and the ops route is recorded too:
  `ModerationService` takes an `Actor` and writes the entry itself.

## Admins — owner

- `GET /admins` → `{ "admins": AdminAccount[] }`, oldest first.
- `POST /admins` `{ name, email, role }` → `201 AdminTemporaryPassword`
  `{ admin, temporaryPassword }`. The password is shown once and never stored
  in the clear; the admin must change it on their first sign-in. A taken email
  is `422` on `email`.
- `PUT /admins/{id}` `{ name?, role?, disabled? }` → `{ admin }`. Nobody
  changes their own role or switches themselves off; the panel always keeps
  one owner who can sign in (`422`). Switching an admin off ends their
  sessions at once.
- `POST /admins/{id}/reset-password` → `AdminTemporaryPassword`; ends their
  sessions. Not for yourself — that is `PUT /me/password`.

## System — owner

- `GET /system` → `AdminSystem`: environment, PHP, Laravel, database,
  timezone, season and engine, content version, integrity mode, the daily
  epoch, the apps' minimum and latest versions, whether `OPS_TOKEN` and
  `MODERATION_TOKEN` are set (**never their values**), `appKey` — whether
  `APP_KEY` is set and well-formed (never the key) — `gd` — whether PHP's GD
  extension is there: profile photos are re-encoded with it, so without it
  every upload fails — `push` — whether pushes can go out: switched on
  (`QUEZBY_PUSH_ENABLED`) with the Firebase project (`FIREBASE_PROJECT_ID`)
  and a readable service-account key (`FIREBASE_CREDENTIALS`) — whether config
  and routes are cached, the migrations uploaded but not run, open and stale
  runs, and the limits the game runs with (`leagueUnlockRuns`: the counted
  runs that open Dereceli). The panel says in red when
  `appKey` is false: without the key the API answers every player 500
  (`RequireAppKey`), while `/admin/*` and `/ops/*` stay open so the key can be
  put right and the cache rebuilt. It says in red too when `gd` is false, and
  in amber when `push` is.
- `POST /system/migrate | optimize | expire-runs | analytics-prune` →
  `{ "output" }`: the same chores as `/ops/migrate`, `/ops/optimize`,
  `quezby:runs:expire` and `quezby:analytics:prune` (`OpsChores`). A failure
  is `500 server_error` with what failed; both are recorded with the output.

## The first owner

The panel has no sign-up. The first owner is made where the API runs:

- with SSH: `php artisan quezby:admin:create you@example.com --name="Ad Soyad"`
  (`--role=moderator|viewer` for others, `--reset` for a new temporary
  password), which prints the temporary password once;
- without SSH, while `OPS_TOKEN` is set:
  `POST /api/v1/ops/admins` `{ "email", "name"? }` with `X-Ops-Token` →
  `201 { admin, temporaryPassword }` for a new owner, or `200` with a new
  temporary password for an existing admin (who keeps their role and is
  switched back on). Recorded as `via: ops`.

## Throttles and CORS

Admin routes share `admin`: 240 requests a minute per admin. The login is
`admin-login` (above). The panel lives on its own origin
(`admin.quezby.com`), so every call starts with a preflight; `config/cors.php`
lets the browser remember its answer for two hours. No cookies cross origins.
