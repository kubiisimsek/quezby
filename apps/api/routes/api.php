<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\AppConfigController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CredentialsController;
use App\Http\Controllers\DailyController;
use App\Http\Controllers\DeviceController;
use App\Http\Controllers\FollowController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\IdentityController;
use App\Http\Controllers\LeaderboardController;
use App\Http\Controllers\LeagueController;
use App\Http\Controllers\MeController;
use App\Http\Controllers\ModerationController;
use App\Http\Controllers\OpsController;
use App\Http\Controllers\RunController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\SocialAuthController;
use App\Http\Controllers\StatsController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UsernameController;
use App\Http\Middleware\VerifyModerationToken;
use App\Http\Middleware\VerifyOpsToken;
use Illuminate\Support\Facades\Route;

/*
| The contract: docs/backend/api-contract.md. Everything lives under /api/v1.
*/

Route::prefix('v1')->group(function () {
    Route::get('health', HealthController::class);
    Route::get('app/config', AppConfigController::class);

    Route::post('auth/guest', [AuthController::class, 'guest'])->middleware('throttle:guest-signup');
    Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('auth/nonce', [SocialAuthController::class, 'nonce'])->middleware('throttle:auth-nonce');
    Route::post('auth/apple', [SocialAuthController::class, 'apple'])->middleware('throttle:social-auth');
    Route::post('auth/google', [SocialAuthController::class, 'google'])->middleware('throttle:social-auth');

    // `presence`: a token's first request of the day records the phone and, with consent, the player's day.
    Route::middleware(['auth:sanctum', 'presence'])->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);

        Route::get('me', [MeController::class, 'show']);
        Route::delete('me', [MeController::class, 'destroy']);
        Route::put('me/username', [UsernameController::class, 'update'])->middleware('throttle:username-update');
        Route::put('me/settings', SettingsController::class);
        Route::post('me/credentials', CredentialsController::class);
        Route::post('me/identities/{provider}', [IdentityController::class, 'store'])->middleware('throttle:identities');
        Route::delete('me/identities/{provider}', [IdentityController::class, 'destroy'])->middleware('throttle:identities');
        Route::get('me/stats', StatsController::class)->middleware('throttle:reads');
        Route::get('me/following', [FollowController::class, 'following'])->middleware('throttle:reads');
        Route::get('me/followers', [FollowController::class, 'followers'])->middleware('throttle:reads');

        Route::get('usernames/check', [UsernameController::class, 'check'])->middleware('throttle:username-check');

        Route::post('device/challenge', [DeviceController::class, 'challenge'])->middleware('throttle:device-challenge');
        Route::post('device/android', [DeviceController::class, 'android'])->middleware('throttle:device-check');
        Route::post('device/ios/attest', [DeviceController::class, 'iosAttest'])->middleware('throttle:device-check');
        Route::post('device/ios/assert', [DeviceController::class, 'iosAssert'])->middleware('throttle:device-check');

        Route::post('runs', [RunController::class, 'store'])->middleware('throttle:run-start');
        Route::post('runs/{runId}/checkpoint', [RunController::class, 'checkpoint'])->middleware('throttle:run-checkpoint');
        Route::post('runs/{runId}/finish', [RunController::class, 'finish'])->middleware('throttle:run-finish');

        Route::get('leaderboards/{board}', LeaderboardController::class)->middleware('throttle:reads');
        Route::get('daily', DailyController::class)->middleware('throttle:reads');
        Route::get('leagues/current', LeagueController::class)->middleware('throttle:reads');

        Route::post('analytics/visits', AnalyticsController::class)->middleware('throttle:analytics');

        Route::get('users', [UserController::class, 'search'])->middleware('throttle:search');
        Route::get('users/{username}', [UserController::class, 'show'])->middleware('throttle:reads');
        Route::put('users/{username}/follow', [FollowController::class, 'store'])->middleware('throttle:follow');
        Route::delete('users/{username}/follow', [FollowController::class, 'destroy'])->middleware('throttle:follow');
    });

    Route::prefix('ops')->middleware(['throttle:ops', VerifyOpsToken::class])->group(function () {
        Route::post('migrate', [OpsController::class, 'migrate']);
        Route::post('optimize', [OpsController::class, 'optimize']);
        Route::post('admins', [OpsController::class, 'admins']);
    });

    Route::post('ops/moderate', ModerationController::class)->middleware(['throttle:moderation', VerifyModerationToken::class]);

    /*
    | The admin panel — docs/backend/admin-api.md. Every route but the login
    | says the least role that may use it; `RolesTest` holds them to that.
    */
    Route::prefix('admin')->name('admin.')->group(function () {
        Route::post('auth/login', [Admin\AuthController::class, 'login'])->middleware('throttle:admin-login')->name('auth.login');

        Route::middleware(['auth:admin', 'throttle:admin'])->group(function () {
            Route::middleware('admin.role:viewer')->group(function () {
                Route::post('auth/logout', [Admin\AuthController::class, 'logout'])->name('auth.logout');
                Route::get('me', [Admin\MeController::class, 'show'])->name('me');
                Route::put('me/password', [Admin\MeController::class, 'password'])->name('me.password');

                Route::get('players', [Admin\PlayerController::class, 'index'])->name('players.index');
                Route::get('players/{player}', [Admin\PlayerController::class, 'show'])->whereUlid('player')->name('players.show');
                Route::get('players/{player}/activity', [Admin\PlayerController::class, 'activity'])->whereUlid('player')->name('players.activity');
                Route::get('audit', Admin\AuditController::class)->name('audit');
                Route::get('counts', Admin\CountsController::class)->name('counts');
                Route::get('runs', [Admin\RunController::class, 'index'])->name('runs.index');
                Route::get('runs/{run}', [Admin\RunController::class, 'show'])->whereUlid('run')->name('runs.show');
                Route::get('suspects', Admin\SuspectController::class)->name('suspects');
                Route::get('overview', Admin\OverviewController::class)->name('overview');
                Route::get('analytics', Admin\AnalyticsController::class)->name('analytics');
                Route::get('boards', [Admin\BoardController::class, 'index'])->name('boards.index');
                Route::get('boards/keys', [Admin\BoardController::class, 'keys'])->name('boards.keys');
                Route::get('leagues', [Admin\LeagueController::class, 'index'])->name('leagues.index');
                Route::get('leagues/groups/{group}', [Admin\LeagueController::class, 'show'])->whereNumber('group')->name('leagues.show');
                Route::get('content', Admin\ContentController::class)->name('content');
            });

            Route::middleware('admin.role:moderator')->group(function () {
                Route::post('players/{player}/ban', [Admin\PlayerActionController::class, 'ban'])->whereUlid('player')->name('players.ban');
                Route::post('players/{player}/unban', [Admin\PlayerActionController::class, 'unban'])->whereUlid('player')->name('players.unban');
                Route::post('players/{player}/rename', [Admin\PlayerActionController::class, 'rename'])->whereUlid('player')->name('players.rename');
                Route::post('players/{player}/sign-out', [Admin\PlayerActionController::class, 'signOut'])->whereUlid('player')->name('players.sign-out');
                Route::post('runs/{run}/approve', [Admin\RunActionController::class, 'approve'])->whereUlid('run')->name('runs.approve');
                Route::post('runs/{run}/reject', [Admin\RunActionController::class, 'reject'])->whereUlid('run')->name('runs.reject');
            });

            Route::middleware('admin.role:owner')->group(function () {
                Route::post('players/{player}/delete', [Admin\PlayerActionController::class, 'destroy'])->whereUlid('player')->name('players.delete');

                Route::get('admins', [Admin\AdminController::class, 'index'])->name('admins.index');
                Route::post('admins', [Admin\AdminController::class, 'store'])->name('admins.store');
                Route::put('admins/{admin}', [Admin\AdminController::class, 'update'])->whereUlid('admin')->name('admins.update');
                Route::post('admins/{admin}/reset-password', [Admin\AdminController::class, 'resetPassword'])->whereUlid('admin')->name('admins.reset-password');

                Route::get('system', [Admin\SystemController::class, 'show'])->name('system.show');
                Route::post('system/{action}', [Admin\SystemController::class, 'run'])->whereIn('action', ['migrate', 'optimize', 'expire-runs', 'analytics-prune'])->name('system.run');
            });
        });
    });
});
