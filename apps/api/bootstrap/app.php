<?php

use App\Exceptions\ApiException;
use App\Exceptions\ErrorResponse;
use App\Http\Middleware\EnsureAdminRole;
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

        // `admin.role:moderator`: the admin panel's roles, lowest first.
        $middleware->alias(['admin.role' => EnsureAdminRole::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->dontReport(ApiException::class);

        // An API only: every error, whatever threw it, in the contract's shape.
        $exceptions->shouldRenderJsonWhen(fn () => true);
        $exceptions->render(fn (Throwable $e) => ErrorResponse::fromThrowable($e));
    })->create();
