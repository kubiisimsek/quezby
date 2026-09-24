# API contract — `/api/v1`

**Types:** `packages/types/src/index.ts` · **Client:** `packages/sdk/src/index.ts`
**Server:** `apps/api` (Laravel + Sanctum) · **Tests:** Pest, `apps/api/tests`

The API is the authority for identity, usernames and **every number a player
sees after a run**. The app never tells the API a score: it tells it what the
player did, and the API replays that with its own copy of the engine
(`apps/api/app/Game`, the PHP twin of `@quezby/engine`). The app runs the
engine only to draw the game; ranks, gaps, stats, league standings, daily
cards, share texts and period end times all come from here.

A contract change is one commit: `packages/types` → Laravel request/resource →
`packages/sdk` → the screen that reads it.

## Conventions

- JSON in, JSON out, camelCase keys. Timestamps are ISO-8601 UTC strings with
  milliseconds. Boards that count down also send `serverTime`: the app counts
  from the server's clock, never the phone's.
- Auth is a Sanctum personal access token: `Authorization: Bearer <token>`.
- The app sends `X-App-Version: 1.0.0` on every call; the API stores it on runs.
- Errors always have one shape, whatever the status:

  ```json
  { "error": { "code": "username_taken", "message": "…", "fields": { "username": ["…"] } } }
  ```

  `code` is one of `ApiErrorCode` in `packages/types`. `message` is Turkish and
  safe to show; the app prefers its own copy per `code` where it has one.

| Status | When |
| ------ | ---- |
| 401 | `unauthenticated` — missing or revoked token |
| 404 | `not_found` — also another player's run, an unknown board, a banned player |
| 409 | `username_taken`, `email_taken`, `already_linked`, `identity_taken`, `last_sign_in_method`, `run_already_finished`, `daily_already_played` |
| 410 | `run_expired` |
| 422 | `validation_failed`, `username_invalid`, `invalid_credentials`, `identity_invalid`, `run_rejected`, `engine_outdated`, `cannot_follow_self`, `follow_limit` |
| 429 | `too_many_requests` |

Throttles: guest sign-up 10/h/IP · login 10/min/IP · nonce 20/min/IP · Apple/Google
10/min/IP · identities 10/min · username check 60/min · run start 30/min · run
finish 20/min · search 30/min · follow 60/min · every read (boards, daily, league,
stats, players, follow lists) 60/min.

## Health and app

### `GET /health` — public

`{ "status": "ok", "time": "…" }`

### `GET /app/config?platform=ios&version=1.0.0` — public

```json
{ "status": "ok", "engineVersion": 2, "contentVersion": 1, "latestVersion": "1.0.0", "minVersion": "1.0.0", "storeUrl": null }
```

`status` is `update_required` when `version < minVersion` (per platform),
`update_available` when `version < latestVersion`, else `ok`. A version that
does not parse is `ok` — the network must never lock a player out.

## Accounts

### `POST /auth/guest` — public

`{ "platform": "ios", "installId": "…" }` → `201 { "token", "user": Me }`. A
new account with no username, email, password or identity.

### `POST /auth/login` — public

`{ "email", "password" }` → `{ "token", "user" }`, or `422 invalid_credentials`.

### `POST /auth/nonce` — public

→ `201 { "nonce": "…", "expiresAt": "…" }`. Single use, 10 minutes. Sign in
with Apple hashes it into the identity token; the API consumes it once.

### `POST /auth/apple` — public

`{ "identityToken", "nonce", "authorizationCode"?, "platform", "installId" }` →
`201 { "token", "user", "created": true }` for a new player, `200 … "created": false`
for a returning one. The token must be signed by Apple (JWKS, cached), issued
by `https://appleid.apple.com`, for one of `APPLE_BUNDLE_IDS`, unexpired, and
carry the SHA-256 of a nonce the API issued and has not seen used. Anything
else → `422 identity_invalid`. With `APPLE_TEAM_ID`/`APPLE_KEY_ID`/
`APPLE_PRIVATE_KEY_PATH` set, the authorization code is exchanged for a refresh
token (stored encrypted) so deleting the account can revoke Apple's grant.

### `POST /auth/google` — public

`{ "idToken", "platform", "installId" }` → as above. `iss` must be Google's,
`aud` one of `GOOGLE_CLIENT_IDS` (the web client and the iOS clients); the email
is kept only when Google verified it. Accounts are never merged by email.

### `POST /auth/logout`

Revokes the current token. `204`.

## The player

### `GET /me`

```json
{ "user": Me, "ranks": { "daily": 12, "weekly": 40, "monthly": 88, "all": 311 } }
```

`Me` = `{ id, username, email, isGuest, identities: ("apple"|"google")[], settings: { haptics }, best: { score, reels, achievedAt } | null, createdAt }`.
`best` is this season's best (the season's all-time row). `isGuest` is true
while no email, Apple or Google is attached. A rank is null without a ranked
run in that period.

### `GET /me/stats`

```json
{
  "stats": { "runs": 40, "reels": 9120, "swipes": 6100, "likes": 1500, "holds": 700, "perfects": 210,
             "freezes": 800, "caught": 90, "misses": 400, "activeMs": 5400000, "bestReactionMs": 262,
             "maxCombo": 1500, "bonuses": { "flawless": 30, "lightning": 120, "coolHead": 60, "comeback": 9 } },
  "topLiked": [{ "contentId": "like-004", "likes": 61 }]
}
```

Lifetime numbers from the server's replays of **ranked** runs only; `topLiked`
are the friends' posts (catalog ids, the app knows them) liked most.

### `GET /usernames/check?username=…` · `PUT /me/username` · `PUT /me/settings`

As before: availability with a `UsernameProblem` reason; `{ "username" }` →
`{ "user": Me }` (`422 username_invalid`, `409 username_taken`); `{ "haptics": false }`
→ `{ "settings": … }`.

### `POST /me/credentials`

`{ "email", "password" }` (≥ 8) → `{ "user": Me }`. `409 email_taken`; `409
already_linked` when the account already has an email (a player who signed in
with Apple or Google may still add one).

### `POST /me/identities/{apple|google}`

The Apple or Google sign-in body without `platform`/`installId` → `{ "user": Me }`.
Keeps the account and its runs. `409 identity_taken` if another player owns
that Apple/Google account, `409 already_linked` if this one already has that
provider, `404` for another provider.

### `DELETE /me/identities/{apple|google}`

→ `{ "user": Me }`. `409 last_sign_in_method` when it is the only way in (no
email and no other identity). Unlinking Apple revokes its grant.

### `DELETE /me`

Deletes the account, its runs, board rows, league seats, follows, stats and
every token; revokes Apple's grant when there is one (never blocks). `204`.
Required by App Store guideline 5.1.1(v).

## Runs

### `POST /runs`

`{ "mode": "free" | "daily", "engineVersion": 2, "contentVersion": 1 }` →

```json
{ "runId": "01J…", "seed": 3141592653, "engineVersion": 2, "contentVersion": 1, "mode": "daily", "dayKey": "2026-09-26", "startedAt": "…" }
```

- An engine or catalog the API does not play (or no body — the v1 app) →
  `422 engine_outdated` before any run exists.
- Needs a username (`422 validation_failed`).
- A player has **one open run**: starting another marks the previous one
  `abandoned`. Runs older than `QUEZBY_RUN_TTL_MINUTES` (120) become `expired`.
- `free`: seed `random_int(1, 4294967295)`. `daily`: the day's seed —
  `hash_hmac('sha256', "quezby-daily|{day}|{engine}", QUEZBY_DAILY_SECRET)` —
  the same for everyone; one attempt per Istanbul day, taken when started
  (`409 daily_already_played`, also under a race).

### `POST /runs/{runId}/finish`

`{ "actions": [[1, 412, 0], [2, 530, 0], [3, 380, 690], [0, 0, 0]], "clientScore": 1234, "clientReels": 4 }`

The API:

1. Loads the run — the caller's, `started`, not expired (else 404 / 409 / 410,
   an expired run becomes `expired`), on the current engine (`422 engine_outdated`).
2. Replays `actions` from the run's seed. A log the engine refuses →
   `422 run_rejected`, the run stored as `rejected`.
3. Checks plausibility (see [scoring.md](../product/scoring.md), *Hile koruması*):
   hard flags (`wall_clock`, `fast_decisions`, `hold_bounds`, `client_mismatch`,
   `banned`) make the run `flagged`; soft signals hold a score that would reach
   the season's top 10 or the week's top 3 as `review`.
4. Counts the run from the replay (stats, which posts were shown and liked).
5. A `ranked` run adds to the player's lifetime stats and, when it scored,
   upserts today's, this week's, this month's and the season's rows (plus
   today's `challenge` row for a daily run) and seats the player in this week's
   league group.

→

```json
{
  "run": RunResult,
  "best": { "score": 240310, "reels": 405, "achievedAt": "…" },
  "isNewBest": true,
  "ranks": { "daily": 12, "weekly": 44, "monthly": 80, "all": 311 },
  "rankChanges": { "daily": { "before": 20, "after": 12 }, "weekly": { "before": null, "after": 44 }, … },
  "passed": [{ "username": "ayse", "score": 239000, "isFollowing": true }],
  "daily": { "dayKey": "2026-09-26", "number": 3, "rank": 37, "players": 1204, "grid": "🟩🟩🟨🟥⬛", "shareText": "…" },
  "league": { "tier": "gold", "rank": 4, "members": 30, "zone": "promote", "points": 812000 },
  "shareText": "Quezby'de 240.310 puan yaptım! 405 reel · bugün #12. Sen kaç yaparsın?"
}
```

`RunResult` = `{ runId, mode, status: "ranked"|"flagged"|"review", score, reels,
hits, misses, perfects, maxStreak, level, accuracy, avgReactionMs, activeMs,
endedBy, maxCombo, breakdown: { reelPoints, bonusPoints, bonuses: { flawless|lightning|coolHead|comeback: { count, points } } },
stats: { swipes, likes, holds, perfects, freezes, misses: { timeout, wrong, holdEarly, holdLate, caught }, avgReactionMs, bestReactionMs, levelMisses[] } }`.
`passed` lists up to three players the run overtook on today's board. `daily`
is null for a free run; `league` is null when the run did not rank.
A `flagged` or `review` run still answers 200.

## Boards

### `GET /leaderboards/{board}?scope=everyone|friends&limit=50`

`board` ∈ `daily`, `weekly`, `monthly`, `all`, `challenge` (today's Günün akışı).

```json
{
  "board": "weekly", "periodKey": "2026-W39", "season": 2, "scope": "everyone",
  "startsAt": "2026-09-20T21:00:00.000Z", "endsAt": "2026-09-27T21:00:00.000Z", "serverTime": "…",
  "entries": [{ "rank": 1, "username": "kubi", "score": 250311, "reels": 377, "isMe": false, "isFollowing": true, "gap": null }],
  "me": { "rank": 44, "username": "…", "score": 39960, "reels": 204, "isMe": true, "isFollowing": false, "gap": 1241 },
  "neighbors": [ …two above, me, two below… ],
  "rival": { "entry": { "rank": 43, "username": "ekin", … }, "gap": 1241 },
  "nextRankProgress": 969,
  "players": 5120
}
```

One row per player: their best ranked score in the period, this season.
Periods are in `Europe/Istanbul` — a day starts at 00:00 there, a week on
Monday (ISO week, `2026-W39`), a month on the 1st (`2026-09`); `all` never
ends. Ties go to whoever got there first. `gap` is what it takes to pass the
row above (its score − yours + 1); `nextRankProgress` is your score towards the
rival's, per-mille. `friends` = the players you follow, and you. `limit` 1–100.

### `GET /daily`

```json
{ "dayKey": "2026-09-26", "number": 3, "endsAt": "…", "serverTime": "…",
  "attempt": { "status": "ranked", "score": 52340, "rank": 37, "grid": "🟩🟩🟨🟥⬛", "shareText": "…" },
  "top": [LeaderboardEntry, …3], "me": LeaderboardEntry | null, "players": 1204 }
```

`attempt` is null before today's run starts; `unfinished` while it is open;
`void` when it was abandoned, expired or rejected; otherwise the run's status.

### `GET /leagues/current`

```json
{ "season": 2, "weekKey": "2026-W39", "tier": "gold", "endsAt": "…", "serverTime": "…", "joined": true,
  "members": [{ "rank": 1, "username": "…", "points": 912000, "daysPlayed": 5, "isMe": false, "isFollowing": false, "zone": "promote", "gap": null }],
  "me": LeagueMember, "promoteCount": 5, "demoteCount": 5,
  "lastWeek": { "weekKey": "2026-W38", "tier": "silver", "rank": 3, "members": 28, "outcome": "promoted", "newTier": "gold" } }
```

Points are the sum of each day's best score this week. A player is seated on
their first ranked run of the week (`joined: false` until then, with the tier
they will play). Zones: ⌊members × 5 / 30⌋ up and down; none above `diamond`
or below `bronze`. Last week is settled lazily, the first time any of its
players needs it — no cron.

## Players and follows

### `GET /users?search=ku`

`search` is lower-cased and must match `^[a-z0-9.*]{2,20}$`. Prefix match,
yourself and banned players excluded, 20 at most →
`{ "users": [{ "username", "best", "league", "isFollowing" }] }`.

### `GET /users/{username}`

`{ "player": { username, createdAt, best, league, ranks: { weekly, all }, stats: { runs, reels, likes, perfects }, followers, following, isFollowing, followsMe, isMe } }`.
Unknown or banned → 404.

### `PUT /users/{username}/follow` · `DELETE /users/{username}/follow`

Idempotent, `204`. Yourself → `422 cannot_follow_self`; 500 already →
`422 follow_limit`; unknown or banned → 404; a player without a username yet
→ `422 validation_failed`.

### `GET /me/following` · `GET /me/followers`

`{ "users": [PlayerSummary], "nextCursor": "…" | null }`, newest first, 50 a
page; pass `?cursor=` for the next.

## Ops (no SSH on shared hosting)

- `POST /ops/migrate`, `POST /ops/optimize` — `X-Ops-Token` (`OPS_TOKEN`).
- `POST /ops/moderate` — `X-Moderation-Token` (`MODERATION_TOKEN`):
  `{ "action": "held" }`, `{ "action": "approve"|"reject", "runId", "reason"? }`,
  `{ "action": "ban", "username", "reason" }`, `{ "action": "unban", "username" }`.
  The same work as `php artisan quezby:review`, `quezby:run:approve`,
  `quezby:run:reject`, `quezby:user:ban`, `quezby:user:unban`. Without the
  token set, the route does not exist (404).

## Ranking

A board row is `(season, period, period_key, user_id)` → best `score`, its
`reels`, `run_id` and `achieved_at` (ms). A row only ever moves to a strictly
higher score. Rank = `1 + count(score > mine) + count(score = mine and achieved_at < mine)`.
The season is the engine version; a rules change starts every board fresh.
