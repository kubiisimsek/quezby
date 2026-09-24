<?php

use App\Http\Controllers\AppConfigController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CredentialsController;
use App\Http\Controllers\DailyController;
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

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);

        Route::get('me', [MeController::class, 'show']);
        Route::delete('me', [MeController::class, 'destroy']);
        Route::put('me/username', [UsernameController::class, 'update']);
        Route::put('me/settings', SettingsController::class);
        Route::post('me/credentials', CredentialsController::class);
        Route::post('me/identities/{provider}', [IdentityController::class, 'store'])->middleware('throttle:identities');
        Route::delete('me/identities/{provider}', [IdentityController::class, 'destroy'])->middleware('throttle:identities');
        Route::get('me/stats', StatsController::class)->middleware('throttle:reads');
        Route::get('me/following', [FollowController::class, 'following'])->middleware('throttle:reads');
        Route::get('me/followers', [FollowController::class, 'followers'])->middleware('throttle:reads');

        Route::get('usernames/check', [UsernameController::class, 'check'])->middleware('throttle:username-check');

        Route::post('runs', [RunController::class, 'store'])->middleware('throttle:run-start');
        Route::post('runs/{runId}/finish', [RunController::class, 'finish'])->middleware('throttle:run-finish');

        Route::get('leaderboards/{board}', LeaderboardController::class)->middleware('throttle:reads');
        Route::get('daily', DailyController::class)->middleware('throttle:reads');
        Route::get('leagues/current', LeagueController::class)->middleware('throttle:reads');

        Route::get('users', [UserController::class, 'search'])->middleware('throttle:search');
        Route::get('users/{username}', [UserController::class, 'show'])->middleware('throttle:reads');
        Route::put('users/{username}/follow', [FollowController::class, 'store'])->middleware('throttle:follow');
        Route::delete('users/{username}/follow', [FollowController::class, 'destroy'])->middleware('throttle:follow');
    });

    Route::prefix('ops')->middleware(['throttle:ops', VerifyOpsToken::class])->group(function () {
        Route::post('migrate', [OpsController::class, 'migrate']);
        Route::post('optimize', [OpsController::class, 'optimize']);
    });

    Route::post('ops/moderate', ModerationController::class)->middleware(['throttle:moderation', VerifyModerationToken::class]);
});
