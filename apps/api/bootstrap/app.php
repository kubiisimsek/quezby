<?php

use App\Exceptions\ApiException;
use App\Exceptions\ErrorResponse;
use App\Http\Middleware\EnsureAdminRole;
use App\Http\Middleware\RecordPresence;
use App\Http\Middleware\RequireAppKey;
use App\Http\Middleware\ResolveLocale;
use App\Providers\AppServiceProvider;
use App\Services\Logs\ApiErrorLogger;
use Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // There is no login page to send a guest to: a missing token is a 401.
        $middleware->redirectGuestsTo(null);

        // The username rules trim exactly what JavaScript's trim() does.
        $middleware->trimStrings(except: ['username']);

        // `admin.role:moderator`: the admin panel's roles, lowest first. `presence`: the
        // device registry and, with consent, the player's day — once a day per token.
        // `locale`: the language a player route answers in. One call: `alias()`
        // replaces the list it was given before.
        $middleware->alias([
            'admin.role' => EnsureAdminRole::class,
            'locale' => ResolveLocale::class,
            'presence' => RecordPresence::class,
        ]);

        // The language is settled before anything may refuse the request, so a 401 or
        // a 429 is in it too — otherwise Laravel's priority list would run the auth
        // and throttle middleware first, whatever the route says.
        $middleware->prependToPriorityList(before: AuthenticatesRequests::class, prepend: ResolveLocale::class);

        // No player request without APP_KEY; the panel and the ops routes stay open to put it right.
        $middleware->api(prepend: [RequireAppKey::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->dontReport(ApiException::class);

        // Every reported exception is a row of the panel's Loglar page too.
        $exceptions->report(fn (Throwable $e) => AppServiceProvider::quietly(fn () => app(ApiErrorLogger::class)->exception($e)));

        // An API only: every error, whatever threw it, in the contract's shape.
        $exceptions->shouldRenderJsonWhen(fn () => true);
        $exceptions->render(fn (Throwable $e) => ErrorResponse::fromThrowable($e));
    })->create();
