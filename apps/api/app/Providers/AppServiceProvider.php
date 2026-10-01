<?php

namespace App\Providers;

use App\Services\Analytics\Presence;
use App\Services\Logs\ApiErrorLogger;
use App\Services\Logs\ExternalCallLogger;
use App\Support\ModerationToken;
use App\Support\OpsToken;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Http\Events\RequestHandled;
use Illuminate\Http\Client\Events\ConnectionFailed;
use Illuminate\Http\Client\Events\ResponseReceived;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Laravel\Sanctum\Events\TokenAuthenticated;
use RuntimeException;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->refuseDebugOnPublicHosts();

        // One per request: it remembers whether an exception already wrote this request's row.
        $this->app->scoped(ApiErrorLogger::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Unique indexes stay under old MySQL/MariaDB key limits on shared hosting.
        Schema::defaultStringLength(191);

        $this->configureRateLimiting();

        // Sanctum names the token just before it moves `last_used_at`: the old value says whether today was seen.
        Event::listen(fn (TokenAuthenticated $event) => Presence::remember($event));

        // The Loglar page: failed calls to Firebase, Google and Apple, and API errors.
        Event::listen(ResponseReceived::class, [ExternalCallLogger::class, 'received']);
        Event::listen(ConnectionFailed::class, [ExternalCallLogger::class, 'failed']);
        Event::listen(RequestHandled::class, [ApiErrorLogger::class, 'handled']);
    }

    /**
     * A debug page on staging or production would hand out stack traces and
     * environment details, so the API does not start at all.
     */
    private function refuseDebugOnPublicHosts(): void
    {
        if (! $this->app->environment('staging', 'production') || ! config('app.debug')) {
            return;
        }

        // Whatever renders this failure must not render it in debug mode.
        config(['app.debug' => false]);

        throw new RuntimeException(sprintf(
            'APP_DEBUG must be false when APP_ENV is "%s". Fix the .env file.',
            $this->app->environment(),
        ));
    }

    private function configureRateLimiting(): void
    {
        RateLimiter::for('guest-signup', fn (Request $request) => Limit::perHour(10)->by($request->ip()));

        RateLimiter::for('register', fn (Request $request) => Limit::perHour(10)->by($request->ip()));

        // Every email with a code in it; a new code waits a minute anyway (`quezby.email_codes`).
        RateLimiter::for('email-send', fn (Request $request) => Limit::perHour(20)->by($request->ip()));

        // A code has five tries of its own; this keeps one phone from walking many.
        RateLimiter::for('email-verify', fn (Request $request) => Limit::perMinute(20)->by($request->ip()));

        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));

        RateLimiter::for('username-check', fn (Request $request) => Limit::perMinute(60)
            ->by($request->user()?->getAuthIdentifier() ?? $request->ip()));

        // A name is picked once; a few more tries for the ones already taken.
        RateLimiter::for('username-update', fn (Request $request) => Limit::perMinute(10)
            ->by($request->user()?->getAuthIdentifier() ?? $request->ip()));

        RateLimiter::for('run-start', fn (Request $request) => Limit::perMinute(30)
            ->by($request->user()?->getAuthIdentifier() ?? $request->ip()));

        RateLimiter::for('run-finish', fn (Request $request) => Limit::perMinute(20)
            ->by($request->user()?->getAuthIdentifier() ?? $request->ip()));

        // A run checks in at most five times (three marks, two retries of a lost one); a few more for a second run in the minute.
        RateLimiter::for('run-checkpoint', fn (Request $request) => Limit::perMinute(12)
            ->by($request->user()?->getAuthIdentifier() ?? $request->ip()));

        RateLimiter::for('device-challenge', fn (Request $request) => Limit::perMinute(20)
            ->by($request->user()?->getAuthIdentifier() ?? $request->ip()));

        // Android, iOS attest and iOS assert share one budget: a phone proves itself every few hours.
        RateLimiter::for('device-check', fn (Request $request) => Limit::perMinute(10)
            ->by($request->user()?->getAuthIdentifier() ?? $request->ip()));

        RateLimiter::for('auth-nonce', fn (Request $request) => Limit::perMinute(20)->by($request->ip()));

        RateLimiter::for('social-auth', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));

        RateLimiter::for('identities', fn (Request $request) => Limit::perMinute(10)
            ->by($request->user()?->getAuthIdentifier() ?? $request->ip()));

        RateLimiter::for('search', fn (Request $request) => Limit::perMinute(30)
            ->by($request->user()?->getAuthIdentifier() ?? $request->ip()));

        // Friend requests, answers and blocks; declining a VS.
        RateLimiter::for('social', fn (Request $request) => Limit::perMinute(60)
            ->by($request->user()?->getAuthIdentifier() ?? $request->ip()));

        // Phrases sent to friends; each friend also has a daily cap (`inbox.phrases_per_day`).
        RateLimiter::for('messages', fn (Request $request) => Limit::perMinute(30)
            ->by($request->user()?->getAuthIdentifier() ?? $request->ip()));

        // Profile photos are fetched without a token: a board shows up to a hundred at once.
        RateLimiter::for('media', fn (Request $request) => Limit::perMinute(600)->by($request->ip()));

        RateLimiter::for('avatar', fn (Request $request) => Limit::perHour(10)
            ->by($request->user()?->getAuthIdentifier() ?? $request->ip()));

        RateLimiter::for('reports', fn (Request $request) => Limit::perHour(10)
            ->by($request->user()?->getAuthIdentifier() ?? $request->ip()));

        RateLimiter::for('push-token', fn (Request $request) => Limit::perMinute(20)
            ->by($request->user()?->getAuthIdentifier() ?? $request->ip()));

        // What a phone sends in for the Loglar page (`POST /me/logs`).
        RateLimiter::for('app-logs', fn (Request $request) => Limit::perMinute(10)
            ->by($request->user()?->getAuthIdentifier() ?? $request->ip()));

        RateLimiter::for('reads', fn (Request $request) => Limit::perMinute(60)
            ->by($request->user()?->getAuthIdentifier() ?? $request->ip()));

        // The inbox's pulse: every 3 s on the friends screens, every 10 s elsewhere — with room for a second phone.
        RateLimiter::for('pulse', fn (Request $request) => Limit::perMinute(60)
            ->by($request->user()?->getAuthIdentifier() ?? $request->ip()));

        // A phone sends its visits as it goes to the background — a few a day; a burst after a long offline stretch fits.
        RateLimiter::for('analytics', fn (Request $request) => Limit::perMinute(12)
            ->by($request->user()?->getAuthIdentifier() ?? $request->ip()));

        RateLimiter::for('moderation', fn (Request $request) => ModerationToken::current() !== ''
            ? Limit::perHour(120)->by($request->ip())
            : Limit::none());

        // Counts failed tokens too; unlimited while the ops routes are switched off (they answer 404).
        // Guessing an admin's password: five tries a minute from one address,
        // and ten in a quarter of an hour at one account from it.
        RateLimiter::for('admin-login', fn (Request $request) => [
            Limit::perMinute(5)->by('ip:'.$request->ip()),
            Limit::perMinutes(15, 10)->by('email:'.Str::lower((string) $request->input('email')).'|'.$request->ip()),
        ]);

        RateLimiter::for('admin', fn (Request $request) => Limit::perMinute(240)
            ->by('admin:'.($request->user()?->getAuthIdentifier() ?? $request->ip())));

        RateLimiter::for('ops', fn (Request $request) => OpsToken::current() !== ''
            ? Limit::perHour(10)->by($request->ip())
            : Limit::none());
    }
}
