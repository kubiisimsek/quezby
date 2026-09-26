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
- The app also names the phone on every call, once it knows its install id:
  `X-Device: install=…; platform=ios; os=18.2; model=iPhone%2015; build=42`
  (every value URI-encoded — `deviceHeader` in `@quezby/sdk`). A token's first
  request of the Istanbul day writes it into the **device registry** — every
  player's, consent or not: install, system, model, app build, first and last
  seen; no IP — and, for a player who said yes to usage analytics, marks their
  day (`docs/product/analytics.md`). Later requests that day write nothing.
  A header without a sound install id (8–100 of `A-Za-z0-9-`) is ignored.
- Errors always have one shape, whatever the status:

  ```json
  { "error": { "code": "username_taken", "message": "…", "fields": { "username": ["…"] } } }
  ```

  `code` is one of `ApiErrorCode` in `packages/types`. `message` is Turkish and
  safe to show; the app prefers its own copy per `code` where it has one.

| Status | When |
| ------ | ---- |
| 401 | `unauthenticated` — missing or revoked token |
| 403 | `forbidden` — the admin panel only: the admin's role may not do this (`docs/backend/admin-api.md`) |
| 404 | `not_found` — also another player's run, an unknown board, a banned player |
| 409 | `username_taken`, `username_locked`, `email_taken`, `already_linked`, `identity_taken`, `last_sign_in_method`, `run_already_finished`, `daily_already_played`, `attest_key_unknown` |
| 410 | `run_expired` |
| 422 | `validation_failed`, `username_invalid`, `invalid_credentials`, `identity_invalid`, `run_rejected`, `engine_outdated`, `cannot_follow_self`, `follow_limit`, `challenge_invalid`, `integrity_invalid` |
| 429 | `too_many_requests` |

Throttles: guest sign-up 10/h/IP · login 10/min/IP · nonce 20/min/IP · Apple/Google
10/min/IP · identities 10/min · username check 60/min · username pick 10/min · run start 30/min · run
checkpoint 12/min · run finish 20/min · device challenge 20/min · device checks
(Android, iOS attest and assert together) 10/min · analytics visits 12/min · search 30/min · follow 60/min ·
every read (boards, daily, league, stats, players, follow lists) 60/min.

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
new account with no email, password or identity, named `guest` + 8 digits
(`guest48128742`) until its player picks a name — once: a picked name never
changes (`PUT /me/username`) — so it can start a run at once. The digits are drawn at random; a taken name is drawn again, and a race
on the unique index draws once more. Names like it are reserved: no player can
pick one (`PUT /me/username` → `422 username_invalid`, `reserved`).

### `POST /auth/login` — public

`{ "email", "password" }` → `{ "token", "user" }`, or `422 invalid_credentials`.

### `POST /auth/nonce` — public

→ `201 { "nonce": "…", "expiresAt": "…" }`. Single use, 10 minutes. Sign in
with Apple hashes it into the identity token; the API consumes it once.

### `POST /auth/apple` — public

`{ "identityToken", "nonce", "authorizationCode"?, "platform", "installId" }` →
`201 { "token", "user", "created": true }` for a new player — named
`guest48128742` like a guest, and the app starts its first steps — `200 …
"created": false` for a returning one. The token must be signed by Apple (JWKS, cached), issued
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

`Me` = `{ id, username, email, isGuest, identities: ("apple"|"google")[], settings: { haptics, analytics }, best: { score, reels, achievedAt } | null, createdAt }`.
`settings.analytics` is the player's consent to usage analytics — false until
they say yes.
`username` is set from the moment the account exists — the automatic
`guest48128742` until the player picks one; it is null only on accounts made
before automatic names.
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

As before: availability with a `UsernameProblem` reason (the player's own name
is available to them); `{ "haptics": false }` → `{ "settings": … }`.

`PUT /me/settings` also takes `{ "analytics": true | false }` — the player's
answer to usage analytics, kept as its moment (`users.analytics_at`), never in
the settings column. A yes starts today's count at once; a no deletes the
player's visits, days and firsts (only anonymous daily totals stay). Every
setting is a JSON boolean (`422 validation_failed` otherwise).

`PUT /me/username` `{ "username" }` → `{ "user": Me }` picks a name **once**:
only while the account's name is the automatic one or there is none
(`canPickUsername` / `Username::isPickable`). In order: the rules
(`422 username_invalid`, with the problem); the name it already has → `200`,
nothing changes; a name already picked → `409 username_locked`; a name another
player has → `409 username_taken`. The write holds only while the name is still
the one the request saw (compare-and-set), so of two quick picks one lands and
the other gets `username_locked`; the unique index decides a race between two
players (`username_taken`). A moderator's reset (`POST /admin/players/{id}/rename`)
gives back an automatic name and with it one more pick.

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

Deletes the account, its runs, board rows, league seats, follows, stats, device
checks, App Attest keys and challenges, its phones in the device registry, its
usage analytics (visits, days, firsts) and every token; revokes Apple's grant
when there is one (never blocks). Anonymous daily totals stay. `204`.
Required by App Store guideline 5.1.1(v).

## Device

The phone vouches for itself against a one-time challenge — **Google Play
Integrity** on Android, **App Attest** on iOS — and the API keeps the verdict
for a while. A run records the player's verdict standing when it starts
(`runs.device_verdict`); what it does at the finish depends on
`QUEZBY_INTEGRITY_MODE` (see *Integrity mode* under the finish). The app checks
on launch, on foreground and whenever `validUntil` has passed; every failure
is silent.

Every answer of the three checks is a `DeviceCheckResponse`:

```json
{ "verdict": "pass", "validUntil": "2026-09-24T18:00:00.000Z", "enforced": true }
```

- `pass` (stored, 6 hours) — a real device running our app, unmodified.
- `fail` (stored, 12 hours) — the proof was readable but fell short: rooted,
  an emulator, a changed or sideloaded app, a wrong challenge, a replayed key.
  Not an error: the answer is 200.
- `unavailable` (not stored; `validUntil` is 30 minutes on, when to try again) —
  no check could be made: Google or Apple could not be asked, credentials are
  not configured (`GOOGLE_PLAY_INTEGRITY_CREDENTIALS`, `APPLE_TEAM_ID`), or
  `QUEZBY_INTEGRITY_MODE=off`. Never held against the player.
- `enforced` — true only with `QUEZBY_INTEGRITY_MODE=enforce`, when a `fail`
  keeps this device's runs off the boards. False in `log` and `off`: the app
  must not tell the player otherwise.

A proof that cannot be read at all → `422 integrity_invalid`. Where the API can
tell by itself (not token-shaped; not base64, not CBOR, not an attestation or
assertion; a key id that is not 32 bytes) it refuses before touching the
challenge; a token Google decodes for none of our apps has used it up.
Otherwise the challenge is used up by the check; one that is unknown, used,
expired or another player's → `422 challenge_invalid`.

### `POST /device/challenge`

→ `201 { "challenge": "…", "expiresAt": "…" }`. 32 random bytes, base64url
without padding; single use, for this player, for 5 minutes. Only its SHA-256
is stored.

### `POST /device/android`

`{ "challenge", "token" }` — a Play Integrity **standard** token requested with
`requestHash = sha256Hex(challenge)`. The API trades a JWT signed with its
Google Cloud service account (`scope playintegrity`) for an access token
(cached ~50 minutes) and calls
`POST https://playintegrity.googleapis.com/v1/{package}:decodeIntegrityToken`
for each of `PLAY_INTEGRITY_PACKAGES` in turn until one decodes it. A **pass**
needs all of: `requestDetails.requestHash` = sha256Hex(challenge) (else fail
`hash`), `requestPackageName` one of ours (`package`), `timestampMillis`
within 10 minutes (`stale`), `appIntegrity.appRecognitionVerdict` =
`PLAY_RECOGNIZED` (`app`), `deviceIntegrity.deviceRecognitionVerdict` contains
`MEETS_DEVICE_INTEGRITY` (`device`). Not a token at all, or a 400 from Google
for every package → `422 integrity_invalid`; Google 5xx, 401, 403, 429 or no
answer → `unavailable`.

### `POST /device/ios/attest`

`{ "challenge", "keyId", "attestation" }` — once per install: `keyId` from
`DCAppAttestService.generateKey` (base64 of 32 bytes; base64url is taken too),
`attestation` from `attestKey(keyId, clientDataHash: SHA-256(UTF-8 challenge))`,
base64 of CBOR `{fmt, attStmt: {x5c, receipt}, authData}`. Checked as Apple's
*Validating apps that connect to your server* lays out, each failure a `fail`
with its reason: `fmt` is `apple-appattest` (`format`); `x5c` chains to the
Apple App Attestation Root CA pinned in `apps/api/resources/certs`, every
certificate valid now (`chain`); the credential certificate's extension
`1.2.840.113635.100.8.2` holds `SHA-256(authData ‖ SHA-256(challenge))`
(`nonce`); SHA-256 of its public key is the key id (`key_id`); `authData`'s
RP ID hash is SHA-256 of `{APPLE_TEAM_ID}.{bundle id}` for one of
`APPLE_BUNDLE_IDS` (`app_id`), its counter is 0 (`counter`), its AAGUID is
`appattestdevelop` or `appattest` + 7 × 0x00 and that environment is in
`APP_ATTEST_ENVIRONMENTS` (`environment`), its credential id is the key id
(`credential_id`). A key already attested → `fail` `key_reused`. A pass keeps
the key (`app_attest_keys`: PEM, counter, environment, receipt).

### `POST /device/ios/assert`

`{ "challenge", "keyId", "assertion" }` — every later check:
`generateAssertion(keyId, SHA-256(UTF-8 challenge))`, base64 of CBOR
`{signature, authenticatorData}`. A key this player never had attested →
`409 attest_key_unknown`, **and the challenge stays good**: the app drops the
key and attests a new one (with the same challenge or a new one). Otherwise:
ECDSA-SHA256 over `SHA-256(authenticatorData ‖ SHA-256(challenge))` by the
stored key (`signature`), our App ID (`app_id`), a counter above the stored
one (`counter`) — which then moves up.

## Runs

### `POST /runs`

`{ "mode": "free" | "daily", "engineVersion": 2, "contentVersion": 1 }` →

```json
{ "runId": "01J…", "seed": 3141592653, "engineVersion": 2, "contentVersion": 1, "mode": "daily", "dayKey": "2026-09-26", "startedAt": "…" }
```

- An engine or catalog the API does not play (or no body — the v1 app) →
  `422 engine_outdated` before any run exists.
- Needs a username (`422 validation_failed`) — every account has one since
  automatic names; only an older account with none is refused.
- A player has **one open run**: starting another marks the previous one
  `abandoned`. Runs older than `QUEZBY_RUN_TTL_MINUTES` (120) become `expired`.
- The run records the player's device verdict standing now (`pass`, `fail`, or
  none) in `runs.device_verdict` — nothing with `QUEZBY_INTEGRITY_MODE=off`.
- `free`: seed `random_int(1, 4294967295)`. `daily`: the day's seed —
  `hash_hmac('sha256', "quezby-daily|{day}|{engine}", QUEZBY_DAILY_SECRET)` —
  the same for everyone; one attempt per Istanbul day, taken when started
  (`409 daily_already_played`, also under a race).

### `POST /runs/{runId}/checkpoint`

`{ "reel": 162, "prefixHash": "3f5c…" }` → `{ "receipt": "…" }` (200).

A few times in a ranked run — right at the first verdict after the game clock
(after the countdown) passes 45 s, 120 s and 240 s (`CHECKPOINTS.marksMs` in
`@quezby/config`) — the app sends how many reels it has played (`reel`, 1–5000)
and `prefixHash(actions, reel)`: the lower-case hex SHA-256 of the first `reel`
moves written `g,t,d;g,t,d;…` (`App\Game\Checkpoint::prefixHash`, checked
against `packages/config/fixtures/checkpoints.json`). The API signs them with
the time it saw them: `base64url(json {r: runId, n, h, t: ms}) . base64url(HMAC-SHA256)`,
keyed from `APP_KEY`. **Nothing is written** — the receipt is the record; the
app keeps it and sends it back with the finish. The run never waits on it. A
check-in lost on the way — no answer (network, timeout) or a 5xx — is sent
again at a later verdict, no sooner than 5 s after it failed, with that
verdict's `reel` and `prefixHash`, just like a mark's: at most twice a run, and
never two in one verdict (a new mark's goes first). No 4xx is retried — the app
goes by the status, so a hosting firewall's HTML 403, which the SDK codes
`server_error`, is not either. So a run sends at most five check-ins, the
receipts a finish carries (`CHECKPOINTS.maxReceipts`), well under the 12/min
throttle. Another player's or an unknown run → 404; a run no longer
`started` → `409 run_already_finished`; one past its time → `410 run_expired`
(left for the finish to close).

### `POST /runs/{runId}/finish`

`{ "actions": [[1, 412, 0], [2, 530, 0], [3, 380, 690], [0, 0, 0]], "clientScore": 1234, "clientReels": 4, "checkpoints": ["…", "…"] }`

`checkpoints` is optional (older apps send none; up to 20 strings of at most
512 characters pass validation); the API reads the first 5 distinct receipts.

The API:

1. Loads the run — the caller's, `started`, not expired (else 404 / 409 / 410,
   an expired run becomes `expired`), on the current engine (`422 engine_outdated`).
2. Replays `actions` from the run's seed. A log the engine refuses →
   `422 run_rejected`, the run stored as `rejected`.
3. Checks plausibility (see [scoring.md](../product/scoring.md), *Hile koruması*):
   hard flags (`wall_clock`, `fast_decisions`, `hold_bounds`, `client_mismatch`,
   `banned`, and from the receipts and the device below) make the run
   `flagged`; soft signals hold a score that would reach the season's top 10
   or the week's top 3 as `review`.

   **Receipts.** Each is held against the log and the clock: not one the API
   signed for this run → hard `checkpoint_forged`; `n` past the log or `h` not
   the hash of its first `n` moves → hard `checkpoint_mismatch`. `needed` is
   the least time from the start to the verdict of reel `n` on the app's pace
   (countdown + each reel on screen + the pause and slide after every earlier
   one — not after reel `n`, as the app checks in right at its verdict);
   `elapsed = t − startedAt`. `elapsed < needed − 1 s` → hard `wall_clock`
   (with `reel`); `elapsed > needed × 1.35 + 10 s` → hard `slow_motion`; else
   `> needed × 1.2 + 6 s` → soft `slow_timing`. Each mark the run went on at
   least 5 s past (on its needed time after the countdown) wants a receipt of
   its own, stamped no sooner than the mark after the start (1 s tolerance) —
   early receipts cannot stand in for later marks; fewer → soft
   `checkpoint_missing` (`{expected, received}`). All numbers are in
   `config/quezby.php` › `plausibility.checkpoints`.

   **Integrity mode** (`QUEZBY_INTEGRITY_MODE`, per environment):
   `enforce` (production) — `device_verdict = fail` → hard `device_integrity`
   (the result says `flagReason: "device"`), none → soft `device_unverified`;
   `log` (local, staging, and the default) — the verdict is only recorded on the
   run; `off` — devices are neither checked nor recorded.
4. Counts the run from the replay (stats, which posts were shown and liked).
5. A `ranked` run adds to the player's lifetime stats and, when it scored,
   upserts today's, this week's, this month's and the season's rows (plus
   today's `challenge` row for a daily run) and — once the league is open to
   them — seats the player in this week's league group.

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
  "leagueUnlock": null,
  "shareText": "Quezby'de 240.310 puan yaptım! 405 post · bugün #12. Sen kaç yaparsın?"
}
```

`RunResult` = `{ runId, mode, status: "ranked"|"flagged"|"review", score, reels,
hits, misses, perfects, maxStreak, level, accuracy, avgReactionMs, activeMs,
endedBy, maxCombo, breakdown: { reelPoints, bonusPoints, bonuses: { flawless|lightning|coolHead|comeback: { count, points } } },
stats: { swipes, likes, holds, perfects, freezes, misses: { timeout, wrong, holdEarly, holdLate, caught }, avgReactionMs, bestReactionMs, levelMisses[] },
flagReason: "device" | null }`.
`flagReason` is `device` when a `flagged` run carries `device_integrity` — the
phone failed its integrity check, so its runs never rank, and the app says so
("Bu cihazda skorlar sıralamaya girmiyor"). It is null for every other flag:
the other checks are not explained to the player.
`passed` lists up to three players the run overtook on today's board. `daily`
is null for a free run; `league` is null when the run did not rank, or the
league is not open to the player yet. `leagueUnlock` is `{ required, remaining }`
until it opens — `{ "required": 3, "remaining": 2 }` after a new player's first
counted run — and null once it has.
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
{ "season": 2, "weekKey": "2026-W39", "tier": "gold", "endsAt": "…", "serverTime": "…", "joined": true, "unlock": null,
  "members": [{ "rank": 1, "username": "…", "points": 912000, "daysPlayed": 5, "isMe": false, "isFollowing": false, "zone": "promote", "gap": null }],
  "me": LeagueMember, "promoteCount": 5, "demoteCount": 5,
  "lastWeek": { "weekKey": "2026-W38", "tier": "silver", "rank": 3, "members": 28, "outcome": "promoted", "newTier": "gold" } }
```

Points are the sum of each day's best score this week. **The league opens to a
player after their first 3 counted runs** — ranked and scoring
(`config/quezby.php` › `leagues.unlock_runs`); zero-score, flagged and held
runs do not count, and a new player's practice run never reaches the API.
Until then `unlock` is `{ "required": 3, "remaining": n }` and nobody is seated;
anyone who has ever sat in a league is never locked again. A player is seated
on their first ranked run of the week once it is open (`joined: false` until
then, with the tier they will play); a player who opens it mid-week brings the
week's earlier daily bests along. Zones: ⌊members × 5 / 30⌋ up and down; none above `diamond`
or below `bronze`. Last week is settled lazily, the first time any of its
players needs it — no cron.

## Analytics

Only for a player who said yes (`settings.analytics`); the whole design —
what is kept, for how long, and why it never bloats — is
`docs/product/analytics.md`.

### `POST /analytics/visits`

The visits the phone summed up, sent as the app goes to the background (and
what waited, on the next chance) — one request per visit, never per tap:

```json
{
  "sentAt": "2026-09-26T10:00:00.000Z",
  "platform": "ios",
  "visits": [{
    "id": "3f5c…32 lower-case hex",
    "startedAt": "2026-09-26T09:55:00.000Z",
    "seconds": 240,
    "appVersion": "1.0.0",
    "journey": [["home", 0], ["game", 12], ["share_result", 230]],
    "counts": { "home": 1, "game": 1, "share_result": 1 }
  }]
}
```

→ `200 { "record": true }`, or `{ "record": false }` when nothing of this
player is kept — analytics switched off (`QUEZBY_ANALYTICS_ENABLED`), no
consent, or outside the sample (`QUEZBY_ANALYTICS_SAMPLE`): the app then
records nothing for a day. Nothing is written in that case.

- Codes are `AnalyticsScreen | AnalyticsEvent` (`@quezby/config`'s closed
  catalog). One this API does not know is dropped and counted, not refused.
- `sentAt` is stamped as the request leaves: every `startedAt` moves by the
  phone's clock skew. A visit older than 7 days or ahead of the API's clock
  is turned away (counted); `seconds` is held to 4 hours and to the time since
  the visit began; a player's day takes at most 50 visits.
- `id` makes it idempotent: a visit sent twice is kept once.
- Refused as `422 validation_failed`: no visits or more than 10, an `id` that
  is not 32 hex characters, a journey over 40 steps or a step that is not
  `[code, seconds]`, a count over 999, an unknown `platform`.

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
- `POST /ops/admins` — `X-Ops-Token`: `{ "email", "name"? }` → the admin
  panel's first owner with a temporary password (`201`), or a new temporary
  password for an existing admin (`200`) — `docs/backend/admin-api.md`.
- `POST /ops/moderate` — `X-Moderation-Token` (`MODERATION_TOKEN`):
  `{ "action": "held" }`, `{ "action": "approve"|"reject", "runId", "reason"? }`,
  `{ "action": "ban", "username", "reason" }`, `{ "action": "unban", "username" }`.
  The same work as `php artisan quezby:review`, `quezby:run:approve`,
  `quezby:run:reject`, `quezby:user:ban`, `quezby:user:unban`. Without the
  token set, the route does not exist (404). Every decision, here and from
  the commands, is on the admin panel's audit log.

## Admin panel

`/api/v1/admin/*` is the admin panel's API — staff accounts with roles, their
own guard (an admin token opens no route above, a player token none there), a
`403 forbidden` for a role that may not, page-based lists and an audit log.
Its contract is `docs/backend/admin-api.md`.

## Ranking

A board row is `(season, period, period_key, user_id)` → best `score`, its
`reels`, `run_id` and `achieved_at` (ms). A row only ever moves to a strictly
higher score. Rank = `1 + count(score > mine) + count(score = mine and achieved_at < mine)`.
The season is the engine version; a rules change starts every board fresh.
