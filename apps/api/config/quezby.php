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
    | `fast_decision_ms`.
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
            // An empty `APPLE_BUNDLE_IDS=` line counts as unset, not as "no app".
            'client_ids' => array_values(array_filter(array_map('trim', explode(',', (string) (env('APPLE_BUNDLE_IDS') ?: implode(',', [
                'com.kubisimsek.game.quezby',
                'com.kubisimsek.game.quezby.staging',
                'com.kubisimsek.game.quezby.local',
            ])))))),
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

];
