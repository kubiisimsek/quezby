# Admin API — `/api/v1/admin`

**Types:** `packages/types/src/admin.ts` · **Client:** `createAdminClient` in `packages/sdk/src/admin.ts` (`@quezby/sdk/admin`)
**Server:** `apps/api/app/Http/Controllers/Admin`, `app/Services/Admin` · **Tests:** Pest, `apps/api/tests/Feature/Admin`
**Panel:** `apps/admin` — `docs/design/admin-design-system.md`, `docs/rules/admin-rules.md`

The admin panel's API: players, runs, suspects, boards, leagues, content,
the audit log, the panel's own accounts and the system. It shares the player
API's conventions (`docs/backend/api-contract.md`): JSON with camelCase keys,
ISO-8601 UTC timestamps with milliseconds, one error shape.

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
  | Moderatör | `moderator` | ban and unban, reset a name, sign a player out, approve and reject runs |
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
the search and platform: `{ all, active, banned, guest }`.

### `GET /players/{id}` — viewer

`AdminPlayerResponse`: the player (identities without their Apple tokens,
sessions, last seen), this season's best and ranks, lifetime stats, this
week's league seat (none while banned), runs by status, the ten latest runs,
the flag codes of the last 30 days, device checks (20 latest), other accounts
on the same install, follows and the audit entries about them.

### `POST /players/{id}/ban` — moderator

`{ "reason" }` (3–191 characters). The silent ban of `docs/product/scoring.md`:
the player keeps playing; their rows leave every board, later runs are
flagged `banned`. A player banned already keeps the first reason: `changed: false`.

### `POST /players/{id}/unban` — moderator

Lifts the ban; this season's ranked runs go back on the boards.

### `POST /players/{id}/rename` — moderator

`{ "reason" }` → `{ "changed": true, "username": "guest00000007" }`. A fresh
automatic name (`GuestNames`) in place of one that should not be seen; the
player may pick another. The old name is in the audit entry's details.

### `POST /players/{id}/sign-out` — moderator

Ends every session the player has. A guest cannot be signed out — their token
is the only key to the account — `422 validation_failed`.

### `POST /players/{id}/delete` — owner

`{ "reason", "confirm" }` → `204`, where `confirm` is the player's username
typed out (else `422` on `confirm`). The same deletion as `DELETE /me`
(`AccountDeletion`: Apple's grant revoked, then the account, runs, board rows
and tokens). The audit entry stays. POST, not DELETE: some hosts drop a
DELETE's body.

## Runs

### `GET /runs` — viewer

Filters: `status` (every `AdminRunStatus`), `mode` (`free | daily`), `flag`
(a `RunFlagCode`, matched exactly), `player` (id), `from` / `to` (Istanbul
days `Y-m-d`, both inclusive, by start), `sort` (`newest | score`). Rows are
`AdminRunRow` — never the action log. `counts` is per status under the other
filters.

### `GET /runs/{id}` — viewer

`AdminRunResponse`: the run with the server's result, the app's claim
(`clientScore`, `clientReels`) and the stored stats; `timeline` — every post
as the API's engine replays it (`index, kind, level, window, gesture, t, d,
verdict, points, bonusPoints, combo, meter`; points and bonus points add up to
the score) — or `timelineUnavailable`: `no_log` (never finished),
`other_engine` (another season's rules) or `engine_error`; and the audit
entries about it.

### `POST /runs/{id}/approve` — moderator

A run held for `review` ranks: on the boards of the days it was played, into
the player's stats and league. Any other status: `changed: false`.

### `POST /runs/{id}/reject` — moderator

`{ "reason" }`. A `ranked`, `review` or `flagged` run becomes `rejected` with a
hard `moderator` flag carrying the reason; the player's boards are rebuilt
from the runs left.

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

`{ "review": n }` — the sidebar's badge.

## Boards

### `GET /boards?board=&key=&season=` — viewer

Any board (`daily | weekly | monthly | all | challenge`) for any period key
(`2026-09-24`, `2026-W39`, `2026-09`, `all`; the current one when left out)
and season (this one when left out). Rows are ranked as the game ranks them —
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

## Leagues

### `GET /leagues?week=&tier=` — viewer

A week's groups (this week when left out), the highest tier first:
`id, tier, members, settled, createdAt`; plus `weeks` (this season's, newest
first) and `tiers` (seated players per tier).

### `GET /leagues/groups/{id}` — viewer

The group's table as its players see it — rank, points (each day's best,
summed), days played, zone — its final ranks and outcomes once settled, and
its banned members, who sit out of the table. Looking at a finished week
settles it, as a player's visit would.

## Content

### `GET /content?kind=&sort=` — viewer

Every post of the latest catalog, shown or not: `shows, likes, misses` and
their per-mille rates of shows (`null` before a post is shown), sorted by
`shows`, `likeRate` or `missRate`. The panel labels posts from
`@quezby/config` (`postsOf`).

## Audit log

### `GET /audit?action=&via=&admin=&subjectType=&subjectId=` — viewer

Newest first. An entry: `id, at, via, actor { id, name }, action,
subject { type, id, label }, reason, details, ip` — `ip` only for an owner.

- `via`: `panel` (an admin), `cli` (`php artisan quezby:*`), `ops`
  (`/ops/moderate`, `/ops/admins`) or `system`.
- `action`: `auth.login`, `auth.password_changed`, `player.ban`,
  `player.unban`, `player.rename`, `player.sign_out`, `player.delete`,
  `run.approve`, `run.reject`, `admin.create`, `admin.update`,
  `admin.reset_password`, `system.migrate`, `system.optimize`,
  `system.expire_runs`.
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
  `MODERATION_TOKEN` are set (**never their values**), whether config and
  routes are cached, the migrations uploaded but not run, open and stale runs,
  and the limits the game runs with.
- `POST /system/migrate | optimize | expire-runs` → `{ "output" }`: the same
  chores as `/ops/migrate`, `/ops/optimize` and `quezby:runs:expire`
  (`OpsChores`). A failure is `500 server_error` with what failed; both are
  recorded with the output.

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
