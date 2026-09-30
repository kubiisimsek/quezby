# API contract — `/api/v1`

**Types:** `packages/types/src/index.ts` · **Client:** `packages/sdk/src/index.ts`
**Server:** `apps/api` (Laravel + Sanctum) · **Tests:** Pest, `apps/api/tests`

The API is the authority for identity, usernames and **every number a player
sees after a run**. The app never tells the API a score: it tells it what the
player did, and the API replays that with its own copy of the engine
(`apps/api/app/Game`, the PHP twin of `@quezby/engine`). The app runs the
engine only to draw the game; ranks, gaps, stats, league standings, daily
cards, VS results, share texts and period end times all come from here.

A contract change is one commit: `packages/types` → Laravel request/resource →
`packages/sdk` → the screen that reads it.

## Conventions

- JSON in, JSON out, camelCase keys. Timestamps are ISO-8601 UTC strings with
  milliseconds. Boards and a VS that count down also send `serverTime`: the
  app counts from the server's clock, never the phone's.
- Auth is a Sanctum personal access token: `Authorization: Bearer <token>`.
- **Language.** The API speaks the game's six languages — `tr`, `en`, `de`,
  `ar`, `fr`, `es` (`Locale` in `packages/types`) — and the app names the one
  it speaks in `Accept-Language` on every call. A player route answers in the
  first of the six the header names, by the primary subtag in the header's
  order of preference (`de-AT` → `de`, `ja, fr;q=0.8` → `fr`); when it names
  none of them (or is empty), in the signed-in player's own language
  (`Me.locale`); else in Turkish. Every error `message` (401s and 429s
  included), every validation line in `fields`, and the share texts follow it.
  A push does not: it is written in its receiver's own language (`Me.locale`),
  whatever the request that caused it spoke (*Push*).
  The admin panel (`/admin/*`) and the ops routes always answer in Turkish,
  whatever the browser sends — and so does whatever is answered before a route
  is found (an unknown path, a wrong method, maintenance).
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

  `code` is one of `ApiErrorCode` in `packages/types`. `message` is in the
  request's language (see *Language*) and safe to show; the app prefers its own
  line per `code` and shows the server's only for `validation_failed`. A
  username problem keeps its code in `fields` in every language. A limit's
  message names the limit (`friend_limit`, `request_limit`, `message_limit`,
  `duel_limit`: "You can have up to 500 friends.").

| Status | When |
| ------ | ---- |
| 401 | `unauthenticated` — missing or revoked token |
| 403 | `forbidden` — the admin panel only: the admin's role may not do this (`docs/backend/admin-api.md`) · `friends_hidden` — another player's friend list, to someone who is not their friend |
| 404 | `not_found` — also another player's run, an unknown board (`daily` included), a banned player, a player who blocked you, a VS that is not yours to see |
| 409 | `username_taken`, `username_locked`, `email_taken`, `already_linked`, `identity_taken`, `last_sign_in_method`, `run_already_finished`, `daily_already_played`, `rated_locked`, `attest_key_unknown`, `duel_unavailable` |
| 410 | `run_expired` |
| 422 | `validation_failed`, `username_invalid`, `invalid_credentials`, `identity_invalid`, `run_rejected`, `engine_outdated`, `cannot_befriend_self`, `friend_limit`, `request_limit`, `not_friends`, `message_limit`, `duel_limit`, `photo_invalid`, `challenge_invalid`, `integrity_invalid` |
| 429 | `too_many_requests` |

Throttles: guest sign-up 10/h/IP · login 10/min/IP · nonce 20/min/IP · Apple/Google
10/min/IP · identities 10/min · username check 60/min · username pick 10/min · run start 30/min · run
checkpoint 12/min · run finish 20/min · device challenge 20/min · device checks
(Android, iOS attest and assert together) 10/min · analytics visits 12/min · search 30/min ·
friend requests and answers, blocks, marking a conversation read or the notifications seen and
declining a VS (`social`) 60/min · phrases 30/min · profile photo 10/h · reports 10/h · push token 20/min ·
every read (boards, daily, league, stats, players, friend lists, past games, inbox, notifications, friends, requests,
blocks, conversations, VS) 60/min · the inbox's pulse (`pulse`, its own budget) 60/min ·
profile photos served 600/min/IP.

## Health and app

### `GET /health` — public

`{ "status": "ok", "time": "…" }`

### `GET /app/config?platform=ios&version=1.0.0` — public

```json
{ "status": "ok", "engineVersion": 3, "contentVersion": 1, "latestVersion": "1.0.0", "minVersion": "1.0.0", "storeUrl": null }
```

`status` is `update_required` when `version < minVersion` (per platform),
`update_available` when `version < latestVersion`, else `ok`. A version that
does not parse is `ok` — the network must never lock a player out.

## Accounts

### `POST /auth/guest` — public

`{ "platform": "ios", "installId": "…" }` → `201 { "token", "user": Me }`. A
new account with no email, password or identity, named `guest` + 8 digits
(`guest48128742`) until its player picks a name — once: a picked name never
changes (`PUT /me/username`) — so it can start a run at once. The account plays
in the request's language (`Me.locale`). The digits are drawn at random; a taken name is drawn again, and a race
on the unique index draws once more. Names like it are reserved: no player can
pick one (`PUT /me/username` → `422 username_invalid`, `reserved`).

### Email codes

Every email address is proved before it counts: a six-digit code goes to it,
in the language the player **signed up in** (a sign-up: the request's; an
attached email or a reset: the account's `locale`). Only the code's HMAC is
kept (`email_codes`). A code is good for 15 minutes; a new one no sooner than
60 seconds after the last (asking again sooner keeps the live code and sends
nothing); 5 wrong tries expire it, and a new one can still be asked for.
Every call that sends one answers **`202 CodeSentResponse`**:
`{ "email", "resendIn": 60, "expiresAt" }` — `resendIn` is the seconds before
a new code may go out. A wrong code is `422 code_invalid`; an expired, used
up or never sent one `422 code_expired`. Sending is throttled to 20 an hour
per IP (`throttle:email-send`), checking to 20 a minute (`throttle:email-verify`).
The mail goes through `MAIL_*` (SMTP on staging and production; `log` locally,
where each code lands in `storage/logs/laravel.log`).

### `POST /auth/register` — public

`{ "email", "password", "platform", "installId" }` → `202 CodeSentResponse`.
The first half of an email sign-up: **nothing is made yet** and no token is
given. The password (≥ 8) waits, hashed, with the code. An email an account
holds → `409 email_taken` (accounts are never merged). Calling again while the
code is fresh keeps it and takes the new password. 10 an hour per IP
(`throttle:register`).

### `POST /auth/register/resend` — public

`{ "email" }` → `202 CodeSentResponse`, or `422 code_expired` when no sign-up
waits for that email.

### `POST /auth/register/verify` — public

`{ "email", "code" }` → `201 { "token", "user": Me }`: the account is made and
signed in — an email account from the start (`isGuest: false`), named `guest`
+ 8 digits until its player picks a name, playing in the language it signed up
in, on the platform and install id it signed up from. `409 email_taken` if an
account took the email in between.

### `POST /auth/login` — public

`{ "email", "password" }` → `{ "token", "user" }`, or `422 invalid_credentials`.
An email sign-up never verified, with its own password, gets a new code (when
the last is a minute old) and `409 email_unverified`: the app asks for the code.

### `POST /auth/password/forgot` — public

`{ "email" }` → `202 CodeSentResponse` — the same answer whether an account has
that email or not; only an account's email gets a code, in the account's
language. Calling again sends a new one once the last is a minute old.

### `POST /auth/password/reset` — public

`{ "email", "code", "password" }` (≥ 8) → `{ "token", "user" }`: the new
password is set, **every other token is revoked**, and this phone is signed in.
An account that had no password (Apple or Google only) gets one.

### `POST /auth/nonce` — public

→ `201 { "nonce": "…", "expiresAt": "…" }`. Single use, 10 minutes. Sign in
with Apple hashes it into the identity token; the API consumes it once.

### `POST /auth/apple` — public

`{ "identityToken", "nonce", "authorizationCode"?, "platform", "installId" }` →
`201 { "token", "user", "created": true }` for a new player — named
`guest48128742` like a guest, playing in the request's language, and the app
starts its first steps — `200 … "created": false` for a returning one, who
keeps their own language whatever the phone speaks (so does an email login). The token must be signed by Apple (JWKS, cached), issued
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
{ "user": Me, "ranks": { "weekly": 40, "monthly": 88, "all": 311 } }
```

`Me` = `{ id, username, avatarUrl, email, isGuest, identities: ("apple"|"google")[], settings: { haptics, pushFriends, pushVs, pushMessages, analytics }, locale, best: { score, reels, achievedAt } | null, createdAt }`.
`avatarUrl` is the profile photo's address (*Profile photo* below), null for
none. `settings.analytics` is the player's consent to usage analytics — false
until they say yes; the three `push*` settings are true until turned off.
`locale` is the language the player plays in: the request's when the account
was made, then whatever the phone last set (`PUT /me/locale`); accounts from
before languages are `tr`. A phone signing in to the account takes it.
`username` is set from the moment the account exists — the automatic
`guest48128742` until the player picks one; it is null only on accounts made
before automatic names.
`best` is this season's best (the season's all-time row). `isGuest` is true
while no email, Apple or Google is attached. A rank is null without a ranked
run in that period. There is no day rank: the boards a player climbs are the
week, the month and the season (*Boards*).

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
player's visits, days and firsts (only anonymous daily totals stay).
`pushFriends` (a friend request came, or yours was accepted), `pushVs` (a VS
sent to you, the end of one you sent) and `pushMessages` (a phrase) choose
which news reaches the player's phones as a push (*Push*). Every setting is a
JSON boolean (`422 validation_failed` otherwise); unknown keys are ignored.

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

### `PUT /me/locale`

`{ "locale": "de" }` → `{ "user": Me }` — the same shape as `PUT /me/username`.
One of the six (`UpdateLocaleRequest`), else `422 validation_failed` on
`locale`. The app sends it when the player picks a language (**Dil**). The API
answers in it whenever a request names none of the six.

### `POST /me/credentials` · `POST /me/credentials/resend` · `POST /me/credentials/verify`

`{ "email", "password" }` (≥ 8) → `202 CodeSentResponse`: a code goes to the
email in the account's language, and the password waits with it. `409
email_taken`; `409 already_linked` when the account already has an email (a
player who signed in with Apple or Google may still add one). `resend` (no
body) → `202`, or `422 code_expired` with nothing waiting. `verify`
`{ "code" }` → `{ "user": Me }`: the email and password are attached; `409
email_taken` if another account took the email in between.

### `POST /me/identities/{apple|google}`

The Apple or Google sign-in body without `platform`/`installId` → `{ "user": Me }`.
Keeps the account and its runs. `409 identity_taken` if another player owns
that Apple/Google account, `409 already_linked` if this one already has that
provider, `404` for another provider.

### `DELETE /me/identities/{apple|google}`

→ `{ "user": Me }`. `409 last_sign_in_method` when it is the only way in (no
email and no other identity). Unlinking Apple revokes its grant.

### `DELETE /me`

Deletes the account, its runs, board rows, league seats, friendships and
their conversations, friend requests, blocks, VS, reports (made and received),
push tokens, email codes waiting, stats, device checks, App Attest keys and challenges, its phones
in the device registry, its usage analytics (visits, days, firsts), every
token and its profile photo's file; revokes Apple's grant when there is one
(never blocks). Anonymous daily totals stay. `204`.
Required by App Store guideline 5.1.1(v).

### `PUT /me/avatar` · `DELETE /me/avatar` — profile photo

`{ "image": "<base64>" }` → `{ "user": Me }`, with the new `avatarUrl`;
`DELETE` takes the photo away (idempotent) → `{ "user": Me }`. The app crops
the square the player framed, scales it to 512 px and squeezes a JPEG to at
most 100 KB (`AVATAR` in `@quezby/config`). The API trusts none of it
(`AvatarService`, PHP's GD): it takes a JPEG, PNG or WebP of 128–4096 px a
side and at most 102,400 bytes decoded, cuts the middle square, scales it to
at most 512 px (never up) and encodes a fresh JPEG — quality 85 down to 35,
then at 384 px — until it fits in 102,400 bytes. Re-encoding drops every byte
of metadata, the EXIF location included; a see-through PNG lands on white.
Anything else → `422 photo_invalid` (no `image` at all → `422
validation_failed`). Each photo gets a new random name (24 hex characters +
`.jpg`) on the `avatars` disk, `storage/app/avatars` — outside the web root and
never in an update zip; the one before it is deleted. Every player the API
shows carries their `avatarUrl`: summaries, cards, board rows, league
members, passed players, the blocks list. Deleting the account deletes the
file; a moderator can take a photo down (`docs/backend/admin-api.md`).

### `GET /media/avatars/{file}` — public

The JPEG, for anyone with its address — no token, no language:
`Cache-Control: public, max-age=31536000, immutable` (a photo never changes
under its name), `X-Content-Type-Options: nosniff`,
`Content-Security-Policy: default-src 'none'`. Any other name, or a photo that
is gone → 404.

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

`{ "mode": "free" | "daily" | "rated" | "vs", "engineVersion": 3, "contentVersion": 1, "difficultyVersion": 1 }` —
a VS also names the friend it challenges (`"opponent": "ekin"`) or the VS it
answers (`"duel": "01J…"`) — → `201`

```json
{ "runId": "01J…", "seed": 3141592653, "engineVersion": 3, "contentVersion": 1, "difficulty": 0, "mode": "daily", "dayKey": "2026-09-26", "duelId": null, "startedAt": "…" }
```

- An engine or catalog the API does not play (or no body — the v1 app) →
  `422 engine_outdated` before any run exists. So does a `rated` start
  without the difficulty table the API plays (`difficultyVersion`, the
  engine's `DIFFICULTY_VERSION`); the other modes do not need it.
- `difficulty` is what the app plays the run at — `new Run(seed, difficulty)`
  — and what the finish replays it at: the Dereceli difficulty of the
  player's rating (0–16, one more every 250 Elo from 1000; 0 while placing),
  set once the run left open has been charged, and 0 for every other mode.
  The run keeps it (`runs.difficulty`, `runs.difficulty_version`).
  [scoring.md → Dereceli zorluğu](../product/scoring.md#dereceli-zorluğu).
- Needs a username (`422 validation_failed`) — every account has one since
  automatic names; only an older account with none is refused.
- A player has **one open run**: starting another marks the previous one
  `abandoned`. Runs older than `QUEZBY_RUN_TTL_MINUTES` (120) become `expired`.
  Either is a **forfeit** on the player's Elo — the full loss (*Elo* in
  [scoring.md](../product/scoring.md#elo)) — unless the run belongs to a past
  season or a banned player. The app sends a finish kept on the phone before
  it starts another run.
- The run records the player's device verdict standing now (`pass`, `fail`, or
  none) in `runs.device_verdict` — nothing with `QUEZBY_INTEGRITY_MODE=off`.
- `rated` (Dereceli, the only mode that plays for Elo): a fresh seed, as
  `free`; before the player has **20 counted free or daily runs** — ranked and
  scoring, `rating.unlock_runs` — `409 rated_locked` and no run. Once a
  player has a rating row (their first rated run), it never locks again.
- `free`: seed `random_int(1, 4294967295)`. `daily`: the day's seed —
  `hash_hmac('sha256', "quezby-daily|{day}|{engine}", QUEZBY_DAILY_SECRET)` —
  the same for everyone; one attempt per Istanbul day, taken when started
  (`409 daily_already_played`, also under a race).
- `vs`: `opponent` opens a new VS against a friend on a fresh seed; `duel`
  answers one on its seed and catalog. Exactly one of the two, `duel` a ULID
  (`422 validation_failed` otherwise); the rest — who may, and when — is *VS*.
  `duelId` names the VS; it is null in the other modes, as `dayKey` is outside
  `daily`.

### `POST /runs/{runId}/checkpoint`

`{ "reel": 162, "prefixHash": "3f5c…" }` → `{ "receipt": "…" }` (200).

A few times in a run from `POST /runs` (a VS's too — never a practice run) —
right at the first verdict after the game clock
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

### `POST /runs/{runId}/cancel` → `204`

A run given up in its countdown (3, 2, 1): closed as `abandoned`, and — within
`runs.cancel_seconds` (5) of its start — for nothing on the rating. Later it is
a forfeit, as leaving it would be: a run already under way ends with its
score, never with a cancel. A run no longer `started` is left as it is (still
`204`); another player's or an unknown run → 404. A daily run's attempt stays
used; a VS left this way is lost, as an unfinished one always is.

### `POST /runs/{runId}/finish`

`{ "actions": [[1, 412, 0], [2, 530, 0], [3, 380, 690], [0, 0, 0]], "clientScore": 1234, "clientReels": 4, "checkpoints": ["…", "…"] }`

`checkpoints` is optional (older apps send none; up to 20 strings of at most
512 characters pass validation); the API reads the first 5 distinct receipts.

The API:

1. Loads the run — the caller's, `started`, not expired (else 404 / 409 / 410,
   an expired run becomes `expired` and is a forfeit), on the current engine
   (`422 engine_outdated`).
2. Replays `actions` from the run's seed. A log the engine refuses →
   `422 run_rejected`, the run stored as `rejected` — a forfeit too.
3. Checks plausibility (see [scoring.md](../product/scoring.md), *Hile koruması*):
   hard flags (`wall_clock`, `fast_decisions`, `hold_bounds`, `client_mismatch`,
   `banned`, and from the receipts and the device below) make the run
   `flagged`; soft signals hold a score that would reach the season's top 10
   or the week's top 3 as `review`. A `vs` run answers to the hard flags only
   — nothing of it is held for review: clean, it is `played`; flagged, it
   loses its VS (a challenger's is never sent).

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
5. A `rated` run moves the player's **Elo** (`rating`, below) — and with it
   their league and its ranking. No other mode touches it. A rated run with a
   soft signal is held for `review` when it would lift its player into the
   top `plausibility.review_top_rating` (10) of the Elo board.
6. A `ranked` run adds to the player's lifetime stats and, when a `free` or
   `daily` run scored, upserts this week's, this month's and the season's rows
   — and a daily run today's `challenge` row. **A rated run never reaches a
   score board** (its `isNewBest` is false, its `passed` empty, its `ranks`
   the player's as they stand, and its `shareText` names no week rank). No
   run writes a day row.
7. A `vs` run touches none of that: it settles its VS (*VS*).

→

```json
{
  "run": RunResult,
  "best": { "score": 240310, "reels": 405, "achievedAt": "…" },
  "isNewBest": true,
  "ranks": { "weekly": 44, "monthly": 80, "all": 311 },
  "rankChanges": { "weekly": { "before": 51, "after": 44 }, "monthly": { "before": null, "after": 80 }, … },
  "passed": [{ "username": "ayse", "avatarUrl": null, "score": 239000, "isFriend": true }],
  "daily": { "dayKey": "2026-09-26", "number": 3, "rank": 37, "players": 1204, "grid": "🟩🟩🟨🟥⬛", "shareText": "…" },
  "rating": { "kind": "run", "before": 2298, "after": 2340, "delta": 42, "tierBefore": "gold", "tier": "gold", "target": 150800, "nextTarget": 155000, "placement": null, "shielded": false },
  "leagueUnlock": null,
  "shareText": "Quezby · Günün akışı #3\n🟩🟩🟨🟥⬛\n240.310 puan · #37/1.204",
  "duel": null
}
```

`RunResult` = `{ runId, mode, status: "ranked"|"flagged"|"review"|"played", score, reels,
hits, misses, perfects, maxStreak, level, accuracy, avgReactionMs, activeMs,
endedBy, maxCombo, breakdown: { reelPoints, bonusPoints, bonuses: { flawless|lightning|coolHead|comeback: { count, points } } },
stats: { swipes, likes, holds, perfects, freezes, misses: { timeout, wrong, holdEarly, holdLate, caught }, avgReactionMs, bestReactionMs, levelMisses[] },
flagReason: "device" | null }`.
`shareText` is what "Paylaş" sends, built from the server's own numbers in the
request's language (`lang/{locale}/share.php`): `Quezby'de 240.310 puan
yaptım! 405 post · bu hafta #12. Sen kaç yaparsın?`, `I scored 240,310 points
on Quezby! 405 posts · this week #12. How many can you score?` — the rank is
the player's on this week's board, and "this week #…" is left out while they
have none. For a daily run it is `daily.shareText`; after a VS it is null —
a VS is between two friends. Every
number is grouped the language's way (`Locale::group`, the app's
`groupDigits`); counts take the language's forms (six in Arabic). Every line of
an Arabic share text starts with U+200F (RIGHT-TO-LEFT MARK), so a messaging
app lays it out right to left.
`flagReason` is `device` when a `flagged` run carries `device_integrity` — the
phone failed its integrity check, so its runs never rank, and the app says so
("Bu cihazda skorlar sıralamaya girmiyor"). It is null for every other flag:
the other checks are not explained to the player.
`passed` lists up to three players the run overtook on this week's board,
closest first. `daily` is null outside a daily run.

`rating` (`RunRating`) is null after any run but a rated one. `kind`: `run` — against its
`target` (the score to beat, as the player saw it); `placement` — one of the
first three rated runs (`placement: { played, required }`; `before`/`after` null
until the last one places the player, when `after` is set); `forfeit` — a run
flagged for how it was played, the full loss; `void` — did not count (a banned
player's, one flagged only for its phone, one without a reel inside 30 s of
its start); `pending` — held for review, counted if a moderator lets it
through. `delta` is `after − before`, never beyond ±100; `tierBefore`/`tier`
say whether the run moved the player between leagues; `nextTarget` is the next
run's target; `shielded` — a fresh promotion held the player in their league;
`difficulty` — the difficulty the run was played at; `nextDifficulty` — the
next rated run's, from the rating now (null until placed).

`leagueUnlock` (`LeagueUnlock`) is how far
Dereceli still is after a free or daily run: `{ required, remaining, placement }`
— `{ "required": 20, "remaining": 19, "placement": 3 }` after a new player's
first counted run, `remaining: 0` on the very run that opens it (the app
celebrates), `placement` the rated runs that will place them — and null after
any later run, a rated run and a VS.
`duel` is the VS a `vs` run played (`DuelView`, *VS*) as it stands after the
run; null otherwise. A VS run's `ranks` are the player's ranks as they stand,
its `rankChanges` show no move and its `passed` is empty.
A `flagged` or `review` run still answers 200.

## Past games

### `GET /me/runs?cursor=&mode=`

```json
{
  "runs": [{ "runId": "01J…", "mode": "vs", "status": "played", "score": 88120, "reels": 231, "level": 12,
             "activeMs": 201000, "finishedAt": "…", "isBest": false, "dailyNumber": null,
             "duel": { "id": "01J…", "status": "finished", "turn": null, "you": { "score": 88120, "valid": true },
                       "them": { "score": 79410, "valid": true }, "outcome": "won", "expiresAt": null, "opponent": "ekin" } }],
  "nextCursor": "…"
}
```

Every run the player played to its end and the API replayed — `ranked`,
`review`, `flagged` or `played` — the newest first, thirty a page; `mode`
(`free`, `daily`, `vs`) keeps to one. Pass `nextCursor` back as `?cursor=`
(null on the last page; a cursor the API did not write → `422
validation_failed`). Runs left open, abandoned, expired or refused are not
games the player finished and are left out. `isBest` marks the run behind this
season's best; `dailyNumber` is a daily run's "Günün akışı #…"; `duel` is a VS
run's VS from the player's side (`DuelBrief`, *VS*, settled as it is read)
with the other player's username.

### `GET /me/runs/{runId}`

`{ "summary": RunSummary, "run": RunResult }` — one past game with everything
its replay counted. Another player's run, or one not in the history → 404.

## Boards

### `GET /leaderboards/{board}?scope=everyone|friends&limit=50`

`board` ∈ `weekly`, `monthly`, `all`, `challenge` (today's Günün akışı). There
is no day board: `/leaderboards/daily` is 404.

```json
{
  "board": "weekly", "periodKey": "2026-W39", "season": 2, "scope": "everyone",
  "startsAt": "2026-09-20T21:00:00.000Z", "endsAt": "2026-09-27T21:00:00.000Z", "serverTime": "…",
  "entries": [{ "rank": 1, "username": "kubi", "avatarUrl": "https://…/api/v1/media/avatars/3f5c….jpg", "score": 250311, "reels": 377, "isMe": false, "isFriend": true, "gap": null }],
  "me": { "rank": 44, "username": "…", "avatarUrl": null, "score": 39960, "reels": 204, "isMe": true, "isFriend": false, "gap": 1241 },
  "neighbors": [ …two above, me, two below… ],
  "rival": { "entry": { "rank": 43, "username": "ekin", … }, "gap": 1241 },
  "nextRankProgress": 969,
  "players": 5120
}
```

One row per player: their best ranked score in the period, this season.
Periods are in `Europe/Istanbul` — a week starts on Monday (ISO week,
`2026-W39`), a month on the 1st (`2026-09`); `all` never ends; the
`challenge` board is today's, keyed by the day (`2026-09-26`), which starts at
00:00 there. Ties go to whoever got there first. `gap` is what it takes to pass the
row above (its score − yours + 1); `nextRankProgress` is your score towards the
rival's, per-mille. `friends` = your friends, and you. `limit` 1–100.

### `GET /daily`

```json
{ "dayKey": "2026-09-26", "number": 3, "endsAt": "…", "serverTime": "…",
  "attempt": { "status": "ranked", "score": 52340, "rank": 37, "grid": "🟩🟩🟨🟥⬛", "shareText": "…" },
  "top": [LeaderboardEntry, …3], "me": LeaderboardEntry | null, "players": 1204 }
```

`attempt` is null before today's run starts; `unfinished` while it is open;
`void` when it was abandoned, expired or rejected; otherwise the run's status
(never `played`, a VS run's).
`shareText` is built for every request, never stored, so it is in the
request's language: `Quezby · Günün akışı #3`, the grid and `52.340 puan ·
#37/1.204` on three lines (`Daily Feed`, `Tages-Feed`, `خلاصة اليوم`, `Fil du
jour`, `Feed del día` in the other five; each Arabic line opens with U+200F).

### `GET /rating`

```json
{ "placed": true, "rating": 2340, "tier": "gold", "floor": 2000, "ceil": 3000, "progress": 340, "target": 108600, "difficulty": 6, "peak": 2400,
  "placement": null, "provisional": false, "shield": { "tier": "gold", "runs": 2 },
  "history": [{ "kind": "run", "delta": 42, "before": 2298, "after": 2340, "score": 162000, "target": 150800, "tier": "gold", "runId": "01J…", "at": "…" }] }
```

The player's Elo and league (`RatingResponse`). `unlock` (`LeagueUnlock`) is
how far Dereceli still is — `{ "required": 20, "remaining": 12, "placement": 3 }` —
and null once it is open. Before placement `placed` is false, `placement` is
`{ "played": 2, "required": 3 }` and every other field is null or empty. `floor`/`ceil` bound the league (`ceil` null in
`master` — MasterClass has no top), `progress` is how far into it, per-mille;
`target` is the score the next run has to reach to win rating, rounded up to a
hundred — the typical score of the rating at its own difficulty;
`difficulty` is the Dereceli difficulty the next rated run is played at;
`provisional` — moves are still twice as big (after placement, back
after 30 idle days); `shield` — a fresh promotion's runs left. `history` is the
last 20 changes that set or moved the rating, newest first — runs that did
not count and the placement runs before the last are left out; `kind` is
`placement`, `run`, `forfeit`, `reversal` (a moderator took a gain back) or
`adjust` (an owner set the rating by hand from the admin panel — `score`,
`target` and `runId` null; `before` null when it placed the player).
Only rated runs place a player — or an owner's `adjust`, which also opens
Dereceli (`unlock` null). See [scoring.md → Elo](../product/scoring.md#elo).

### `GET /ratings?scope=everyone|friends|league`

```json
{ "scope": "everyone", "players": 312,
  "entries": [{ "rank": 1, "username": "ekin", "avatarUrl": null, "rating": 5210, "tier": "master", "isMe": false, "isFriend": false, "gap": null }],
  "me": RatingEntry }
```

The Elo board (`RatingBoardResponse`): placed players with a counted rated run in
the last 14 days (`rating.board_active_days`), banned ones left out, highest
first — of two equal ratings, the one reached first. `friends` is your friends
and you; `league` is the players of your own league (your rating's tier) —
the league screen's ranking, which never resets: there are no weekly groups.
Before placement `league` answers no rows (`players: 0`, `me` null). The top
50; `me` is your row wherever it is (null when you are not on the board);
`gap` is the rating to pass the row above.

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

## Players and friends

A friendship takes two yeses: one player asks, the other accepts — or asks
back, which is the same thing (`FriendService`). It lasts until either ends
it or blocks the other. What another player is to you is their `relation`
(`PlayerRelation`): `none`, `friend`, `requested` (your request waits for
them), `incoming` (theirs waits for you) or `blocked` (you blocked them).
Nobody is told they were blocked. The follows from before friends became
friendships where two players followed each other, and requests from the
follower where only one did (`FollowsToFriends`, in the migration).

### `GET /users?search=ku`

`search` is lower-cased and must match `^[a-z0-9.*]{2,20}$`. Prefix match,
by username — yourself, banned players and anyone on either side of a block
with you left out — 20 at most → `{ "users": [PlayerSummary] }`.
`PlayerSummary` = `{ username, avatarUrl, best, league, relation }`: `best` is
this season's best score, `league` their rating's league (null before
placement).

### `GET /users/{username}`

`{ "player": { username, avatarUrl, createdAt, best, league, rating, ranks: { weekly, all }, stats: { runs, reels, likes, perfects }, friends, relation, isMe } }`.
`league` and `rating` are their Elo's league and number (null before placement).
`friends` counts their friends who are not banned. Unknown, banned, or a
player who blocked you → 404.

### `GET /users/{username}/friends?cursor=`

`{ "friends": [PlayerSummary], "total": 42, "nextCursor": "…" | null }`
(`FriendListResponse`) — a player's friends A to Z by username, fifty a page.
Only the player themselves and their friends see it; anyone else →
`403 friends_hidden`. Unknown, banned, or a player who blocked you → 404, as
for the card.

- Banned players are left out, and so is anyone on either side of a block
  with you. `total` counts that same list, every page together — so a
  friend's total can be lower than their card's `friends`.
- Each `relation` is that player's to **you**, not to the list's owner: on a
  friend's list, a friend of yours is `friend`, someone you asked
  `requested`, a stranger `none` — and you are on it as `none`.
- Pass `nextCursor` back as `?cursor=`; it names the last player of the page
  (base64url of the username). One that cannot be a username →
  `422 validation_failed`. The queries are the same few whatever the list's
  length.

### `PUT /users/{username}/friend` · `DELETE /users/{username}/friend`

→ `{ "relation": "requested" }` (`RelationResponse`: where the two stand
afterwards). Idempotent.

- `PUT` sends a request — or accepts theirs when it waits; two requests
  crossing make friends too. A new request pushes to them; accepting opens the
  two's conversation with a `friends` line and pushes to the one who asked
  (*Inbox*, *Push*). Yourself → `422 cannot_befriend_self`; unknown, banned,
  or a block either way → 404; the caller at `quezby.friends.limit` (500)
  friends — banned ones do not count — → `422 friend_limit`, for a request and
  for an answer; `quezby.friends.pending_limit` (100) of the caller's requests
  still waiting (to players who are not banned) → `422 request_limit`; a
  caller without a username yet → `422 validation_failed`.
- `DELETE` takes a request back, turns one down or ends a friendship —
  whichever there is. Ending it deletes the two's conversation and cancels the
  VS open between them. A banned player can still be let go of; only an
  unknown one → 404. A block stays: only unblocking lifts it.

### `GET /me/friend-requests`

`{ "incoming": [{ "player": PlayerSummary, "requestedAt": "…" }], "outgoing": [ … ] }`
— the newest hundred each way, banned players left out.

### `PUT /users/{username}/block` · `DELETE /users/{username}/block`

→ `{ "relation": "blocked" }`. Idempotent. Blocking ends everything between
the two — the friendship and its conversation, a request either way, the VS
open between them (`cancelled`) — and keeps the blocked player away: to them
the blocker is not there (the card, a friend request, a conversation and a VS
answer 404), and neither finds the other in a search. The blocker sees
`blocked` and cannot add them before lifting it (404). Boards and league
groups still show both. Yourself or an unknown player → 404. `DELETE` lifts
it — a banned player's too — and the two are strangers again (`none`).

### `GET /me/blocks`

`{ "users": [{ "username", "avatarUrl", "blockedAt" }] }` — everyone you
blocked, the latest first, banned players too.

### `POST /users/{username}/report`

`{ "reason": "photo" | "name" }` → `204`, whatever becomes of it: the reporter
is never told. A player reports each photo or name of another once; a new
photo or a new name can be reported afresh; a player without a photo has none
to report (still `204`). Yourself, unknown or banned → 404. Moderators take a
photo down, reset a name or let the reports go in the admin panel —
`docs/backend/admin-api.md` → *Reports*.

## Inbox

One conversation per friend, made of the game's own lines and phrases picked
from a fixed list — nothing a player types ever reaches another
(`InboxService`). A line goes from whoever made it happen to the other
friend, who has it unread until they open the conversation:

| `kind` | From → to |
| --- | --- |
| `friends` | the one who accepted → the one who asked |
| `phrase` | the sender → the friend |
| `vs_invite` | the challenger → the friend, once the challenger's clean run sent the VS |
| `vs_result`, `vs_declined`, `vs_expired` | the friend → the challenger |

`InboxMessage` = `{ id, kind, mine, phrase, duel: DuelBrief | null, createdAt }`
— `duel` is a `vs_*` line's VS as it stands now. Lines are kept
`inbox.keep_days` (90, `QUEZBY_INBOX_KEEP_DAYS`) days and pruned lazily: after
the response of a friends list or a conversation, at most once an hour, a
thousand lines at a time — no cron. A friendship that ends, or a block,
deletes the conversation.

### `GET /me/inbox`

```json
{
  "requests": 2,
  "threads": 3,
  "yourTurn": 4,
  "friends": 12,
  "waiting": [{ "id": "01k…", "opponent": PlayerSummary, "expiresAt": "…" }],
  "notifications": 3,
  "serverTime": "…"
}
```

What the badges count: requests waiting for you, friends whose conversation
wants a look (a line unread, or a VS waiting for you to play) and how many
friends' VS wait for you (`yourTurn`). `friends` is your friends who are not
banned. `waiting` (`WaitingDuel`) names the VS waiting for you to play — the
one running out first first, three at most while `yourTurn` counts them all —
each with the friend who sent it and when the chance to answer runs out;
count down with `serverTime`. A VS leaves it once you decline it, start your
run or its time runs out. `notifications` is how many of the bell's
notifications you have not seen yet (*Notifications*). Banned players are left
out; the player's open VS are settled first.

### `GET /me/pulse`

`{ "stamp": 42 }` — a number that moves whenever the player's inbox does
(`users.inbox_stamp`, `InboxStamp`). It goes up, for both players, with a
friend request sent, a friendship begun or ended, a block that parted two
friends, every line (a phrase, "friends now", a VS invite, result, refusal or
expiry); for the blocker alone with a block or its lifting; for the player
alone when they open the bell's list with something in it unseen, so their
other phone's badge clears too. Reading a conversation moves nothing. Nothing is on a clock, so the pulse itself first
settles the player's waiting VS whose 48 hours ran out (`settleDue`): both
players then hear of it without opening anything.

This is how the inbox is live without a socket (shared hosting has none): the
app asks every 3 s on Mesajlar, a conversation, a friend list and Arkadaş bul, every 10 s
elsewhere, never mid-run or in the background, and fetches its lists only when
the number moved. A push, when the player allowed them, gets there first. The
answer costs two indexed reads; it has its own throttle, apart from the other
reads.

### `GET /me/friends?cursor=`

`{ "friends": [FriendThread], "nextCursor": "…" | null }` — fifty a page, the
friend last heard from first, banned friends left out; pass `nextCursor` back
as `?cursor=` (one the API did not write → `422 validation_failed`).
`FriendThread` = `{ player: PlayerSummary, friendsSince, lastActivityAt, last: InboxMessage | null, unread, duel: DuelBrief | null }`
— `last` is null once the conversation's lines were pruned; `duel` is the VS
open between the two that you know of.

### `GET /me/threads/{username}?before=`

`{ "player": PlayerSummary, "h2h": { "wins", "losses", "draws" }, "duel": DuelView | null, "messages": [InboxMessage], "nextBefore": 812 | null }`
— the conversation with a friend, thirty lines a page, oldest first within
it; `nextBefore` (a message id) as `?before=` fetches the thirty before them.
`h2h` is how you stand over every VS the two finished. Not a friend, unknown,
banned, or a player who blocked you → 404.

### `POST /me/threads/{username}/read`

Marks the conversation read up to its newest line. `204`.

### `POST /me/threads/{username}/messages`

`{ "phrase": "gg" }` → `201 { "message": InboxMessage }`. One of the 24 codes
of `PHRASES` in `@quezby/config` (`App\Enums\Phrase`, tested against
`packages/config/fixtures/social.json`): `hi`, `whats_up`, `gg`, `gg_wp`,
`rematch`, `your_turn`, `beat_that`, `ready`, `wow`, `close_one`, `clutch`,
`ez`, `bot`, `nerf`, `lucky`, `lag`, `warming_up`, `rage_quit`, `respect`,
`afk`, `daily`, `thanks`, `next_time`, `bye`. Each phone
says a phrase in its own language, a push in the receiver's
(`lang/{locale}/phrases.php`). Anything else → `422 validation_failed`; not a
friend → `422 not_friends`; `inbox.phrases_per_day` (20) to one friend in an
Istanbul day already → `422 message_limit`.

## Notifications

The bell on the lobby: what happened to the player among friends
(`NotificationService`). Nothing is stored for it — it reads the requests
waiting for the player and the game's lines a friend's move sent them:

| `kind` | What happened | `player` |
| --- | --- | --- |
| `friend_request` | a request waits for you | the one who asked |
| `friends` | your request was accepted | the one who accepted |
| `vs_invite` | a friend sent you a VS | the challenger |
| `vs_result` | the friend you challenged played it | that friend |
| `vs_declined` | … turned it down | that friend |
| `vs_expired` | … let it run out | that friend |

Phrases are not here: they are the inbox's. Neither are your own lines — the
challenger is never told of the VS they sent. Banned players and anyone on
either side of a block with you are left out; a friendship that ends or a
block deletes the lines anyway, and a request answered, taken back or turned
down is gone with it.

### `GET /me/notifications`

```json
{
  "notifications": [
    {
      "id": "request:ada",
      "kind": "friend_request",
      "player": PlayerSummary,
      "duel": null,
      "createdAt": "2026-09-26T10:06:00.000Z",
      "unseen": true
    },
    {
      "id": "message:812",
      "kind": "vs_invite",
      "player": PlayerSummary,
      "duel": DuelBrief,
      "createdAt": "2026-09-26T10:03:00.000Z",
      "unseen": false
    }
  ],
  "unseen": 1
}
```

The newest fifty, newest first (`NotificationItem`). `id` is
`request:{username}` for a request and `message:{id}` for the rest; `player`
is the other player as you see them (`relation` `incoming` for a request,
`friend` for the rest); `duel` is a `vs_*` notification's VS as it stands now,
from your side (a `vs_invite` you have not played says `turn: "you"`). An item
is `unseen` when it came after the last time you opened the list — all of
them, until you first do. `unseen` counts every unseen one, not only the fifty
shown; `GET /me/inbox` carries the same count as `notifications`. A VS of yours
whose time ran out is settled first, as the pulse does. The same handful of
queries however many there are.

### `POST /me/notifications/seen`

The player opened the list: everything so far is seen
(`users.notifications_seen_at` = now, to the millisecond). `204`. When
something was unseen, the player's pulse moves, so their other phone's badge
clears too; opening it again with nothing new moves nothing. It changes nothing
else — a request still waits, a conversation stays unread.

## VS

Two friends, one seed, one attempt each (`DuelService`); both runs start with
`POST /runs` and `"mode": "vs"` (*Runs*).

1. **The challenger plays first.** `{ "mode": "vs", "opponent": "ekin" }`
   opens a VS on a fresh seed, `playing`: the friend knows nothing of it yet.
   Only a friend can be challenged (`422 not_friends`; unknown, banned or a
   player who blocked you → 404); two friends have one open VS at a time,
   whoever sent it (`409 duel_unavailable`); a player has at most
   `duels.waiting_limit` (20) VS waiting for an answer (`422 duel_limit`).
2. **A clean run sends it.** When the challenger's run comes back `played`,
   the VS is `waiting`: the friend gets a `vs_invite` line and a push — never
   the score — and has `QUEZBY_DUEL_EXPIRE_HOURS` (48) to start theirs
   (`expiresAt`). A challenger's run that is `flagged`, or never finished
   (abandoned for another run, expired, refused), makes it `void`: it is never
   sent.
3. **The friend answers** with `{ "mode": "vs", "duel": "<id>" }`, on the
   VS's seed and catalog — only a VS made out to them (else 404), once it was
   sent, while it is `waiting` and before they started it (else
   `409 duel_unavailable`) — or turns it down.
4. **The higher clean score wins**; a tie is a draw; the friend's run that is
   flagged, or left unfinished, loses. `finished`: the challenger gets a
   `vs_result` line and a push.
5. Nobody answered by `expiresAt` → `expired`, counting for nobody (a
   `vs_expired` line, no push); a VS still waiting when the rules change
   (another engine version) expires too. Declined → `declined` (a
   `vs_declined` line, no push). The friendship ending, or a block, while it
   is open → `cancelled`.
6. **Nothing runs on a clock:** a VS is settled whenever one of the two looks
   — the inbox, the friends list, a conversation, the VS, the history, a new
   VS.
7. **A VS counts nowhere.** Its runs are replayed and checked like any other,
   but only the hard flags matter (*Runs* › finish); they never reach a board,
   a league, the lifetime stats, the season's best or the league's unlock
   count, and a moderator can neither approve nor reject one. Its finish
   answers `duel` and no share text.

### `GET /duels/{id}`

```json
{ "duel": { "id": "01J…", "status": "waiting", "turn": "you", "you": null, "them": null, "outcome": null,
            "expiresAt": "…", "sent": false, "opponent": PlayerSummary,
            "h2h": { "wins": 3, "losses": 2, "draws": 0 }, "serverTime": "…" } }
```

The first seven fields are a `DuelBrief` — what an inbox line, a friends row
and a past game carry: `turn` is who plays next (`you`, `them`, null once it
is over); `you` and `them` are each side's run, `{ score, valid }` (`score`
null for a run left unfinished, `valid` false for one that was not clean):
`you` null until you played, `them` null until it is `finished` — the
challenger's score stays hidden from the friend until they have played, and
for good if they never do; `outcome` (`won`, `lost`, `draw`) once `finished`;
`expiresAt` only while `waiting`. `DuelView` adds `sent` (you sent it, and
played first), the other player (`opponent`), how the two stand over every VS
they finished (`h2h`) and `serverTime` to count down with. Only its two players
see a VS, the friend only once it was sent; anyone else → 404.

### `POST /duels/{id}/decline`

→ `{ "duel": DuelView }`, now `declined`. Only the friend, and only a VS still
waiting for them that they have not started (else 404 / `409
duel_unavailable`).

## Push

### `PUT /me/push-token` · `DELETE /me/push-token`

`{ "token": "…", "platform": "ios" | "android" }` → `204`. The phone's Firebase
Cloud Messaging token (20–255 characters of `A-Za-z0-9:_-.`), which the app
makes only once the player allowed notifications and sends at sign-in and
whenever Firebase hands out a new one. A token belongs to one account at a
time: a phone that signs in to another account takes its token along. A
player keeps the ten phones registered most recently
(`push.tokens_per_player`). `DELETE` with `{ "token" }`, before signing out,
stops this phone getting the account's news; idempotent.

What `PushService` sends, through FCM's HTTP v1 API once the response has
gone (`defer()` — no queue, no cron):

| News | To | Setting | Words (`lang/{locale}/push.php`) | `data.kind` |
| --- | --- | --- | --- | --- |
| A friend request | the player asked | `pushFriends` | `friend_request` | `friend_request` |
| A request accepted | the player who asked | `pushFriends` | `friend_accepted` | `friends` |
| A VS sent | the friend | `pushVs` | `vs_invite` | `vs_invite` |
| A VS ended | the challenger | `pushVs` | `vs_won`, `vs_lost` or `vs_draw`, with both scores | `vs_result` |
| A phrase | the friend | `pushMessages` | `phrase` (`lang/{locale}/phrases.php`) | `phrase` |

- The title is "Quezby"; the words are in the receiver's language
  (`Me.locale`) and name the friend (`@ekin`); `data` is `PushData`,
  `{ kind, username, duelId? }` (`duelId` for a VS) — what a tap opens.
- A phrase pushes at most once per sender and friend in
  `inbox.push_gap_seconds` (300 s); the rest wait in the inbox. A VS declined
  or run out only lands in the inbox. Nothing a banned player does pushes, and
  a banned player gets none.
- Every phone of the receiver gets it: Android on the channel `social` at high
  priority, one notification per friend (`tag`); iOS at APNs priority 10 with
  the default sound, grouped per friend (`thread-id`).
- The access token comes from a JWT signed with the service account's key
  (`scope firebase.messaging`), traded at `oauth2.googleapis.com` and kept
  about 50 minutes (dropped on a 401). A token FCM calls gone — 404,
  `UNREGISTERED`, or an invalid `message.token` — is deleted; any other
  refusal is logged ("Firebase refused a push.").
- Nothing is sent, and nothing breaks, until `QUEZBY_PUSH_ENABLED`,
  `FIREBASE_PROJECT_ID` and a readable `FIREBASE_CREDENTIALS` are all set; the
  admin panel's Sistem page says whether they are. Setup:
  `docs/development/push-setup.md`.

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
`period` is `weekly`, `monthly`, `all` or `challenge` — and `daily`: every
ranked run also keeps its Istanbul day's best, which no route serves as a
board; the league adds those rows up (`LeaderboardPeriod::calendar()`).

## Rating

`player_ratings` holds one row per player: `rating` (null until placed),
`tier`, `peak`, `placement_scores`, `provisional_left`, `shield_tier` /
`shield_left`, `rated_at`, `changed_at`. `rating_changes` holds every move and
every run that did not count (`kind`, `score`, `target`, `performance`,
`before`/`after`/`delta`, `width`, `shielded`, `engine_version`) — `run_id`,
`reversal_of` and `league_member_id` are unique, so a run, a reversal and a
week's bonus each move a rating once. Every write locks the player's row. The
rating is not reset by a new season; the target table is per engine version
(`config/quezby.php` › `rating`).
