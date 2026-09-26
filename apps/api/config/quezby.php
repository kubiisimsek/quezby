<?php

use App\Content\Catalog;
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
    | `fast_decision_ms`. Its checkpoint receipts hold it to the clock on the
    | way, too: a slowed-down game passes the first check, not the second.
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
    | Leagues and friends
    |--------------------------------------------------------------------------
    */

    'leagues' => [
        'group_size' => 30,
        // Promoted and demoted per 30 members, scaled down for smaller groups.
        'zone_per_30' => 5,
        // Counted runs (ranked, scoring) before the league opens to a new player.
        'unlock_runs' => 3,
    ],

    'follows' => [
        'limit' => 500,
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
