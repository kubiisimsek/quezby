<?php

use App\Content\Catalog;
use App\Game\Difficulty;
use App\Game\Rules;

return [

    /*
    |--------------------------------------------------------------------------
    | Engine
    |--------------------------------------------------------------------------
    |
    | The engine the API replays runs with. It is the PHP engine's own constant
    | on purpose: a run started on one engine can only be verified by it.
    |
    */

    'engine_version' => Rules::ENGINE_VERSION,

    // Dereceli's difficulty table (`App\Game\Difficulty`), sealed apart from
    // the rules. A rated run records the version it was played on.
    'difficulty_version' => Difficulty::VERSION,

    /*
    |--------------------------------------------------------------------------
    | Season
    |--------------------------------------------------------------------------
    |
    | Every board belongs to a season, and a season is an engine version: the
    | rules are locked (`packages/engine/rules.lock.json`), and the day they
    | change, every board starts fresh instead of ranking two games together.
    |
    */

    'season' => Rules::ENGINE_VERSION,

    /*
    |--------------------------------------------------------------------------
    | Content
    |--------------------------------------------------------------------------
    |
    | The newest catalog of fake posts the app draws reels from. Older catalogs
    | stay known (`App\Content\Catalog`), so an older app's likes still count.
    |
    */

    'content_version' => Catalog::LATEST,

    /*
    |--------------------------------------------------------------------------
    | App versions
    |--------------------------------------------------------------------------
    |
    | Below `min_version` the app must update; below `latest_version` it may.
    |
    */

    'apps' => [
        'ios' => [
            'min_version' => env('QUEZBY_IOS_MIN_VERSION', '1.0.0'),
            'latest_version' => env('QUEZBY_IOS_LATEST_VERSION', '1.0.0'),
            'store_url' => env('QUEZBY_IOS_STORE_URL'),
        ],
        'android' => [
            'min_version' => env('QUEZBY_ANDROID_MIN_VERSION', '1.0.0'),
            'latest_version' => env('QUEZBY_ANDROID_LATEST_VERSION', '1.0.0'),
            'store_url' => env('QUEZBY_ANDROID_STORE_URL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Runs
    |--------------------------------------------------------------------------
    */

    'runs' => [
        // A started run that is not finished within this many minutes expires.
        'ttl_minutes' => (int) env('QUEZBY_RUN_TTL_MINUTES', 120),

        // No human plays this many reels; a longer log is refused unread.
        'max_actions' => 5000,

        // A run given up this soon after it started — in the 3, 2, 1 — is
        // cancelled for nothing (`POST /runs/{id}/cancel`); later, leaving it
        // is a forfeit like any other.
        'cancel_seconds' => 5,
    ],

    /*
    |--------------------------------------------------------------------------
    | Plausibility
    |--------------------------------------------------------------------------
    |
    | A run is flagged when its log could not have been played in the time that
    | passed (`now − startedAt < activeMs + reels × min_transition_ms −
    | clock_tolerance_ms`), or when, among at least `fast_min_samples` skip and
    | like hits, more than `fast_share_limit` were decided under
    | `fast_decision_ms` — unless more than `fast_wrong_share` of all its fast
    | gestures were wrong, which is a guesser, not a bot. Its checkpoint
    | receipts hold it to the clock on the way, too: a slowed-down game passes
    | the first check, not the second.
    |
    */

    'plausibility' => [
        // The app's pace between reels — the twin of `@quezby/config`'s PACE,
        // checked against `packages/config/fixtures/pace.json`.
        'pace' => [
            'countdown_step_ms' => 600,
            'countdown_steps' => 3,
            'slide_ms' => 170,
            'exit_ms' => ['skip_hit' => 0, 'hit' => 160, 'miss' => 260],
        ],
        'clock_tolerance_ms' => 1000,

        // Hard flags: the run is kept, never ranked.
        'fast_decision_ms' => 250,
        'fast_share_limit' => 0.2,
        'fast_min_samples' => 30,
        'fast_wrong_share' => 0.1,
        'hold_slack_ms' => 150,

        // Soft signals: only a top score that shows one waits for review.
        'reaction_cv_min' => 0.08,
        'reaction_cv_samples' => 40,
        'floor_hugging_ms' => 280,
        'floor_hugging_share' => 0.25,
        'floor_hugging_samples' => 30,
        'perfect_share_limit' => 0.9,
        'perfect_min_holds' => 15,
        'score_jump_factor' => 3,
        'score_jump_min_runs' => 5,
        'review_top_all' => 10,
        'review_top_weekly' => 3,
        // A rated run never reaches the score boards: with a soft signal it
        // waits for review when it would lift its player into the Elo board's top.
        'review_top_rating' => 10,

        // Checkpoints: a few times in a run the app has the API stamp how far
        // it got; the finish brings the receipts back (`App\Game\Checkpoint`).
        // `marks_ms` and `max_receipts` are the twin of `@quezby/config`'s
        // CHECKPOINTS, checked against packages/config/fixtures/checkpoints.json.
        'checkpoints' => [
            // Game-clock marks after the countdown at which the app checks in.
            'marks_ms' => [45000, 120000, 240000],
            // Receipts read from a finish; any more are ignored.
            'max_receipts' => 5,
            // A receipt stamped later than needed × ratio + ms after the start
            // is a slowed-down game: hard `slow_motion`, or soft `slow_timing`.
            'slow_motion_ratio' => 1.35,
            'slow_motion_ms' => 10000,
            'slow_timing_ratio' => 1.2,
            'slow_timing_ms' => 6000,
            // A mark is only expected of a run that went on this long past it.
            'missing_grace_ms' => 5000,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Device integrity
    |--------------------------------------------------------------------------
    |
    | Whether the phone a run is played on is a real, unmodified one: Google
    | Play Integrity on Android, App Attest on iOS, each proved against a
    | one-time challenge and kept as a verdict for a while. A run records its
    | player's verdict when it starts (`runs.device_verdict`); the mode says
    | what that does:
    |
    | - `enforce`: a device that failed never ranks (hard `device_integrity`);
    |   one without a verdict ranks, but a top score waits for review (soft
    |   `device_unverified`).
    | - `log`: verdicts are recorded on the runs and change nothing.
    | - `off`: devices are not checked; the endpoints answer `unavailable`.
    |
    */

    'integrity' => [
        'mode' => env('QUEZBY_INTEGRITY_MODE', 'log'),

        // A challenge is good for one proof, within this many seconds.
        'challenge_ttl_seconds' => 300,

        // How long a verdict stands; the app checks again after it. An
        // `unavailable` one is never stored: it only says when to try again.
        'verdict_ttl_minutes' => [
            'pass' => 360,
            'fail' => 720,
            'unavailable' => 30,
        ],

        'android' => [
            // Apps whose Play Integrity tokens count, tried in this order when
            // Google decodes one. An empty line counts as unset: Quezby's one
            // application id, the same in every environment.
            'packages' => array_values(array_filter(array_map('trim', explode(',', (string) (env('PLAY_INTEGRITY_PACKAGES') ?: 'com.kubisimsek.game.quezby'))))),
            // The Google Cloud service account's JSON key, absolute or relative
            // to the API's root. Without it Android checks are `unavailable`.
            'credentials' => env('GOOGLE_PLAY_INTEGRITY_CREDENTIALS'),
            // A token asked for longer ago than this (or as far ahead) is stale.
            'token_max_age_seconds' => 600,
            // Google's access tokens live an hour; a new one is fetched sooner.
            'access_token_ttl_seconds' => 3000,
        ],

        'ios' => [
            // App Attest keys are for `{APPLE_TEAM_ID}.{bundle id}`: the team
            // and apps of Sign in with Apple (`social.apple`). Environments a
            // key may come from: `development` (Xcode builds) and/or
            // `production` (TestFlight and the App Store).
            'environments' => array_values(array_filter(array_map('trim', explode(',', (string) (env('APP_ATTEST_ENVIRONMENTS') ?: 'production'))))),
            // Apple's App Attestation Root CA, pinned; relative to the API's root.
            'root_ca' => 'resources/certs/apple-app-attestation-root-ca.pem',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Günün akışı
    |--------------------------------------------------------------------------
    |
    | The daily challenge's seed is an HMAC of the day with this secret (the
    | app key when empty), so nobody knows tomorrow's feed today. The epoch is
    | challenge #1.
    |
    */

    'daily' => [
        'secret' => env('QUEZBY_DAILY_SECRET'),
        'epoch' => env('QUEZBY_DAILY_EPOCH', '2026-09-24'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Friends
    |--------------------------------------------------------------------------
    */

    /*
    |--------------------------------------------------------------------------
    | Elo
    |--------------------------------------------------------------------------
    |
    | Only Dereceli (`rated`) runs play for Elo. Each is a match against a
    | target: the score a player of that rating typically makes (`targets`, per engine version — a new
    | season needs its own). Past it the rating rises, short of it it falls,
    | by `max_delta × tanh((P − R) / width)` where P is the rating whose
    | typical score the run's was — never more than `max_delta` either way.
    | `docs/product/scoring.md` → "Elo".
    |
    */

    'rating' => [
        // Free and daily runs, ranked and scoring, before Dereceli — and with
        // it Elo and a league — opens to a player. Once they have played a
        // rated run, it never closes again.
        'unlock_runs' => (int) env('QUEZBY_LEAGUE_UNLOCK_RUNS', 20),
        'max_delta' => 100,
        'width' => 800,
        // Faster moves while the rating is still finding its level: right
        // after placement, and when a player comes back after a long break.
        'provisional_width' => 400,
        'provisional_runs' => 15,
        'return_provisional_runs' => 5,
        'return_after_days' => 30,
        // The first rated runs place a player: the rating their median
        // scores, held inside `placement_min`–`placement_max` (Gümüş).
        'placement_runs' => 3,
        'placement_min' => 1200,
        'placement_max' => 1800,
        // Runs after a promotion that cannot drop the player out of the new league.
        'shield_runs' => 3,
        // Losses in Bronz, per cent.
        'bronze_loss_percent' => 50,
        // A run finished without a single reel this soon after its start was
        // given up in the countdown: it does not count.
        'void_window_seconds' => 30,
        // The Elo board: players with a counted run in this many days.
        'board_active_days' => 14,
        'board_limit' => 50,
        // Changes `GET /rating` lists.
        'history' => 20,
        // `quezby:rating:calibrate`: a player's median counts once they have
        // this many runs in the window; the anchors are set so the leagues
        // hold these shares of them, per cent, Bronz first.
        'calibration' => [
            'min_runs' => 10,
            'shares' => ['bronze' => 20, 'silver' => 35, 'gold' => 25, 'platinum' => 13, 'diamond' => 6, 'master' => 1],
        ],
        // Rating → the score a player of it typically makes at difficulty 0,
        // per engine version: what the placement runs are measured with, and
        // rated runs from before the difficulty table.
        'targets' => [
            2 => [0 => 8000, 1000 => 34000, 2000 => 100000, 3000 => 240000, 4000 => 480000, 5000 => 800000, 6000 => 1100000],
            // Engine v3 (blind moves): v2's anchors 1 % lower, as the simulated medians moved.
            3 => [0 => 8000, 1000 => 33700, 2000 => 99000, 3000 => 238000, 4000 => 475000, 5000 => 792000, 6000 => 1090000],
        ],
        // Dereceli gets harder as the rating climbs (`App\Game\Difficulty`):
        // difficulty 0 below `from`, then one more every `step` Elo, up to
        // `Difficulty::MAX` (4750+). `docs/product/scoring.md` → "Dereceli zorluğu".
        'difficulty' => [
            'from' => 1000,
            'step' => 250,
            // Rating → the score a player of it typically makes at the
            // difficulty that rating plays, per engine and difficulty version.
            // From the simulated profiles' medians at their difficulties
            // (`pnpm engine:simulate`); calibrate with `quezby:rating:calibrate`.
            // Version 2 sets the ladder on people: casual play at 1000 (level
            // with the placement table, as version 1 had it), average at 2000,
            // good at 4000, halfway from good to pro at MasterClass's door
            // (5000), pro at 6000, elite at 7000. Version 1 put the door past
            // the best simulated thumb; its table stays for its runs.
            'targets' => [
                3 => [
                    1 => [0 => 8000, 1000 => 31600, 2000 => 74100, 3000 => 148300, 4000 => 265700, 5000 => 394000, 6000 => 542300],
                    2 => [0 => 8000, 1000 => 31600, 2000 => 76200, 3000 => 96100, 4000 => 129500, 5000 => 176700, 6000 => 294400, 7000 => 485800],
                ],
            ],
        ],
    ],

    'friends' => [
        // Friends a player can have; a request that would pass it is refused.
        'limit' => 500,
        // Requests a player can have waiting for an answer at once.
        'pending_limit' => 100,
    ],

    /*
    | The inbox: a conversation per friend, made of the game's own messages —
    | "friends now", VS invites and results — and phrases picked from a fixed
    | list (`App\Enums\Phrase`). Nothing a player types is ever sent.
    */
    'inbox' => [
        // Messages older than this are pruned (lazily, at most once an hour).
        'keep_days' => (int) env('QUEZBY_INBOX_KEEP_DAYS', 90),
        // Phrases one player can send one friend in an Istanbul day.
        'phrases_per_day' => 20,
        // A phrase pushes at most once in this many seconds per sender and friend.
        'push_gap_seconds' => 300,
    ],

    /*
    | Profile photos: a square JPEG, `size` pixels a side, never more than
    | `max_bytes` (100 KB) — `AVATAR` in `@quezby/config`, tested against
    | `fixtures/social.json`. What arrives is decoded and encoded again, so a
    | photo's EXIF (its place included) never reaches anyone.
    */
    'avatars' => [
        'disk' => 'avatars',
        'size' => 512,
        'max_bytes' => 100 * 1024,
        'min_side' => 128,
        'max_side' => 4096,
        // JPEG qualities tried, best first, until the photo fits.
        'qualities' => [85, 75, 65, 55, 45, 35],
    ],

    /*
    | Push notifications through Firebase Cloud Messaging (`PushService`):
    | friend requests and answers, VS invites and results, phrases — in the
    | receiver's language, sent after the response has gone. Nothing is sent
    | until the Firebase project and its service account's key are set.
    */
    'push' => [
        'enabled' => (bool) env('QUEZBY_PUSH_ENABLED', true),
        'project_id' => env('FIREBASE_PROJECT_ID'),
        // The Firebase service account's JSON key, absolute or relative to the
        // API's root. Never commit it; upload it to storage/app/private/.
        'credentials' => env('FIREBASE_CREDENTIALS'),
        'access_token_ttl_seconds' => 3000,
        // Phones one player's pushes go to; the longest unused go first.
        'tokens_per_player' => 10,
    ],

    /*
    | VS: two friends, one seed, one attempt each. The challenger plays
    | first; the friend then has `expire_hours` to answer. A VS never counts on
    | a board, a league or a stat.
    */
    'duels' => [
        'expire_hours' => (int) env('QUEZBY_DUEL_EXPIRE_HOURS', 48),
        // VS a player can have sent and waiting for an answer at once.
        'waiting_limit' => 20,
    ],

    /*
    |--------------------------------------------------------------------------
    | Sign in with Apple / Google
    |--------------------------------------------------------------------------
    |
    | Identity tokens must be addressed to one of these apps. The Apple key
    | only revokes Apple's grant when an account is deleted; without it that
    | step is skipped.
    |
    */

    'social' => [
        'apple' => [
            // An empty `APPLE_BUNDLE_IDS=` line counts as unset, not as "no app":
            // Quezby's one bundle id, the same in every environment.
            'client_ids' => array_values(array_filter(array_map('trim', explode(',', (string) (env('APPLE_BUNDLE_IDS') ?: 'com.kubisimsek.game.quezby'))))),
            'team_id' => env('APPLE_TEAM_ID'),
            'key_id' => env('APPLE_KEY_ID'),
            'private_key_path' => env('APPLE_PRIVATE_KEY_PATH'),
        ],
        'google' => [
            'client_ids' => array_values(array_filter(array_map('trim', explode(',', (string) env('GOOGLE_CLIENT_IDS', ''))))),
        ],
        'jwks_ttl_seconds' => 86400,
        'nonce_ttl_minutes' => 10,
    ],

    /*
    |--------------------------------------------------------------------------
    | Email codes
    |--------------------------------------------------------------------------
    |
    | The six-digit code that proves an email: a new email account, an email
    | attached to an account, a password reset (`EmailCodes`). It goes out in
    | the language the player signed up in, through the mailer of `MAIL_*`.
    |
    */

    'email_codes' => [
        'ttl_minutes' => 15,
        // A new code no sooner than this after the last one.
        'resend_seconds' => 60,
        // Wrong tries before the code is gone and a new one must be asked for.
        'max_attempts' => 5,
    ],

    /*
    |--------------------------------------------------------------------------
    | Leaderboards
    |--------------------------------------------------------------------------
    |
    | A day starts at 00:00 and a week on Monday in this timezone.
    |
    */

    'leaderboard' => [
        'timezone' => env('QUEZBY_LEADERBOARD_TIMEZONE', 'Europe/Istanbul'),
        'default_limit' => 50,
        'max_limit' => 100,
    ],

    /*
    |--------------------------------------------------------------------------
    | Ops token
    |--------------------------------------------------------------------------
    |
    | Unlocks `POST /api/v1/ops/migrate` and `/ops/optimize` for hosts without
    | SSH. Empty means those routes do not exist. Clear it after deploying.
    |
    */

    'ops_token' => env('OPS_TOKEN', ''),

    /*
    |--------------------------------------------------------------------------
    | Moderation token
    |--------------------------------------------------------------------------
    |
    | Unlocks `POST /api/v1/ops/moderate` (approve, reject, ban) for hosts
    | without SSH — the same work as the `quezby:*` artisan commands. Empty
    | means the route does not exist.
    |
    */

    'moderation_token' => env('MODERATION_TOKEN', ''),

    /*
    |--------------------------------------------------------------------------
    | Admin panel
    |--------------------------------------------------------------------------
    |
    | `apps/admin`, behind `/api/v1/admin`. A panel session ends after
    | `token_hours` however busy it is; lists come a page at a time.
    |
    */

    'admin' => [
        'token_hours' => (int) env('QUEZBY_ADMIN_TOKEN_HOURS', 12),
        'per_page' => 25,
        'max_per_page' => 100,
    ],

    /*
    |--------------------------------------------------------------------------
    | The panel's Loglar page (`SystemLogger`)
    |--------------------------------------------------------------------------
    |
    | Failed calls to Firebase, Google and Apple, API errors (not a 401 or a
    | 404), every push decision and the errors phones send in. Two layers, so
    | the table stays the same size however long the game runs:
    |
    | - `system_logs`, every row in full, kept by level (`keep_days`): an
    |   error for months, a warning for two weeks, a push that went fine for
    |   days. Old rows go, a batch at a time, on one write in `prune_odds`.
    | - `system_log_days`, one row per day, source, event and level with how
    |   many — kept for good, a few dozen rows a day whatever the traffic.
    |
    | Past `per_minute` rows of a level in a minute, the rest of that minute
    | is dropped from `system_logs` (still counted in `system_log_days`), each
    | level on its own budget so a flood of pushes never drops an error.
    | storage/logs/laravel*.log keeps getting Laravel's own lines.
    |
    */

    'logs' => [
        'keep_days' => [
            'error' => (int) env('QUEZBY_LOG_KEEP_ERROR_DAYS', 90),
            'warning' => (int) env('QUEZBY_LOG_KEEP_WARNING_DAYS', 14),
            'info' => (int) env('QUEZBY_LOG_KEEP_INFO_DAYS', 3),
        ],
        'per_minute' => ['error' => 600, 'warning' => 300, 'info' => 300],
        'prune_odds' => 100,
        'prune_batch' => 1000,
        // What a phone may send in one `POST /me/logs`.
        'app_batch' => 20,
    ],

    /*
    |--------------------------------------------------------------------------
    | Usage analytics and the device registry
    |--------------------------------------------------------------------------
    |
    | `docs/product/analytics.md`. Analytics is kept only for players who said
    | yes (`users.analytics_at`), in layers that stop growing: visits with
    | their screen journeys, one row per player and active day, and anonymous
    | daily totals kept for good. The device registry is kept for every
    | player, consent or not: one row per phone, no IP.
    |
    */

    'analytics' => [
        // The kill switch: off, nothing is kept and the app is told to keep
        // nothing for a day.
        'enabled' => (bool) env('QUEZBY_ANALYTICS_ENABLED', true),

        // Of every 1000 consenting players, how many are kept — the valve for
        // a flood. The same players stay in, by a hash of their id.
        'sample' => max(0, min(1000, (int) env('QUEZBY_ANALYTICS_SAMPLE', 1000))),

        // How long visits (with their journeys) stay — never under 8 days: the
        // app may send a visit up to 7 days late, and a visit forgotten
        // sooner could be taken twice.
        'keep_visits_days' => max(8, (int) env('QUEZBY_ANALYTICS_VISIT_DAYS', 30)),

        // How long a player's active days stay: the last 7 and 30 days, a
        // player's 30-day strip and the day-1 step of the funnel read them.
        'keep_days_days' => max(62, (int) env('QUEZBY_ANALYTICS_DAY_DAYS', 90)),

        // Visits kept per player and Istanbul day; any more are turned away.
        'visits_per_day' => 50,

        // Retention counts come back this many days after a player joined.
        'max_age' => 60,

        // Pruning runs after a response at most this often, in rows at a time.
        'upkeep_every_minutes' => 60,
        'upkeep_chunk' => 500,

        // Players whose app talked to the API this recently are "online".
        'online_minutes' => 5,

        // The twin of `@quezby/config`'s ANALYTICS, checked against
        // `packages/config/fixtures/analytics.json`.
        'limits' => [
            'visits_per_batch' => 10,
            'journey_steps' => 40,
            'max_count' => 999,
            'max_age_days' => 7,
            'max_visit_seconds' => 14400,
        ],
    ],

    'devices' => [
        // A phone not seen for this many days leaves the registry.
        'keep_days' => max(30, (int) env('QUEZBY_DEVICE_DAYS', 180)),

        // The most phones kept per player; a new one pushes out the longest unseen.
        'per_player' => 10,
    ],

];
