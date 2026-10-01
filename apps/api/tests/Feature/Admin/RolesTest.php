<?php

use App\Enums\AdminRole;
use Illuminate\Routing\Route as RouteDefinition;
use Illuminate\Support\Facades\Route;

/*
| Who may use which admin route. The API is the only judge of a role — the
| panel just hides what an admin cannot use — so every route is listed here
| with the least role it asks for, and a route missing from the list fails.
*/

/**
 * `METHOD uri` under `/api/v1/admin/` → the least role that may use it.
 *
 * @return array<string, string>
 */
function adminRouteRoles(): array
{
    return [
        'POST auth/logout' => 'viewer',
        'GET me' => 'viewer',
        'PUT me/password' => 'viewer',
        'GET players' => 'viewer',
        'GET players/{player}' => 'viewer',
        'GET players/{player}/activity' => 'viewer',
        'GET audit' => 'viewer',
        'POST players/{player}/ban' => 'moderator',
        'POST players/{player}/unban' => 'moderator',
        'POST players/{player}/rename' => 'moderator',
        'POST players/{player}/sign-out' => 'moderator',
        'POST players/{player}/avatar/remove' => 'moderator',
        'POST players/{player}/reports/dismiss' => 'moderator',
        'GET reports' => 'viewer',
        'GET counts' => 'viewer',
        'GET runs' => 'viewer',
        'GET runs/{run}' => 'viewer',
        'GET suspects' => 'viewer',
        'GET overview' => 'viewer',
        'GET analytics' => 'viewer',
        'GET boards' => 'viewer',
        'GET boards/keys' => 'viewer',
        'GET ratings' => 'viewer',
        'GET ratings/calibration' => 'viewer',
        'GET content' => 'viewer',
        'POST runs/{run}/approve' => 'moderator',
        'POST runs/{run}/reject' => 'moderator',
        'GET logs' => 'moderator',
        'GET logs/summary' => 'moderator',
        'POST players/{player}/delete' => 'owner',
        'POST players/{player}/rating' => 'owner',
        'GET admins' => 'owner',
        'POST admins' => 'owner',
        'PUT admins/{admin}' => 'owner',
        'POST admins/{admin}/reset-password' => 'owner',
        'GET system' => 'owner',
        'POST system/{action}' => 'owner',
    ];
}

/** A ULID nothing has: routes with an id answer 404 or 422 — anything but 403 — once the role is right. */
const ADMIN_ROUTE_ID = '01jzzzzzzzzzzzzzzzzzzzzzzz';

function adminRouteUri(string $uri): string
{
    return '/api/v1/admin/'.preg_replace(['/\{group\}/', '/\{action\}/', '/\{[^}]+\}/'], ['999999', 'expire-runs', ADMIN_ROUTE_ID], $uri);
}

/**
 * Every route and role below the route's least role.
 *
 * @return iterable<string, array{string, string, AdminRole}>
 */
function adminRoutesTooLowFor(): iterable
{
    foreach (adminRouteRoles() as $route => $least) {
        [$method, $uri] = explode(' ', $route, 2);
        foreach (AdminRole::cases() as $role) {
            if (! $role->atLeast(AdminRole::from($least))) {
                yield "{$route} as {$role->value}" => [$method, $uri, $role];
            }
        }
    }
}

/**
 * Every route and role at or above the route's least role.
 *
 * @return iterable<string, array{string, string, AdminRole}>
 */
function adminRoutesAllowedFor(): iterable
{
    foreach (adminRouteRoles() as $route => $least) {
        [$method, $uri] = explode(' ', $route, 2);
        foreach (AdminRole::cases() as $role) {
            if ($role->atLeast(AdminRole::from($least))) {
                yield "{$route} as {$role->value}" => [$method, $uri, $role];
            }
        }
    }
}

test('every admin route but the login is listed with its least role', function () {
    $routes = collect(Route::getRoutes()->getRoutes())
        ->filter(fn (RouteDefinition $route) => str_starts_with($route->uri(), 'api/v1/admin/'))
        ->reject(fn (RouteDefinition $route) => $route->uri() === 'api/v1/admin/auth/login');

    $found = $routes->mapWithKeys(function (RouteDefinition $route) {
        $method = collect($route->methods())->reject(fn (string $method) => $method === 'HEAD')->first();
        $role = collect($route->gatherMiddleware())
            ->first(fn (string $middleware) => str_starts_with($middleware, 'admin.role:'));

        return ["{$method} ".substr($route->uri(), strlen('api/v1/admin/')) => $role === null ? null : substr($role, strlen('admin.role:'))];
    })->sortKeys()->all();

    expect($found)->toBe(collect(adminRouteRoles())->sortKeys()->all());
});

test('every admin route has a name of its own, so the routes can be cached', function () {
    $names = collect(Route::getRoutes()->getRoutes())
        ->filter(fn (RouteDefinition $route) => str_starts_with($route->uri(), 'api/v1/admin/'))
        ->map(fn (RouteDefinition $route) => (string) $route->getName());

    expect($names->reject(fn (string $name) => $name === '' || str_ends_with($name, '.'))->all())->toHaveCount($names->count())
        ->and($names->unique()->count())->toBe($names->count());
});

test('a role below the least one is forbidden', function (string $method, string $uri, AdminRole $role) {
    $this->signInAdmin($role);

    $this->assertApiError($this->json($method, adminRouteUri($uri)), 403, 'forbidden');
})->with(fn () => iterator_to_array(adminRoutesTooLowFor()));

test('the least role and every one above it get past the door', function (string $method, string $uri, AdminRole $role) {
    $this->signInAdmin($role);

    expect($this->json($method, adminRouteUri($uri))->status())->not->toBe(403);
})->with(fn () => iterator_to_array(adminRoutesAllowedFor()));
