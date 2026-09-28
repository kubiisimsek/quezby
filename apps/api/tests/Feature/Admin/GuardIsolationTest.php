<?php

use App\Content\Catalog;
use App\Game\Rules;
use App\Models\Admin;
use App\Models\User;

/*
| Staff and players never share a door: an admin's token opens no player
| route and a player's token no admin route. Real tokens, one request each —
| a guard remembers the last request's user.
*/

function guardIsolationAdminToken(): string
{
    return Admin::factory()->owner()->create()->createToken('admin-panel', ['admin'], now()->addHour())->plainTextToken;
}

function guardIsolationPlayerToken(): string
{
    return User::factory()->withUsername('kerem.35')->create()->createToken('ios')->plainTextToken;
}

test('an admin token opens no player route', function (string $method, string $uri, array $body) {
    $response = $this->json($method, $uri, $body, ['Authorization' => 'Bearer '.guardIsolationAdminToken()]);

    $this->assertApiError($response, 401, 'unauthenticated');
})->with([
    'me' => ['GET', '/api/v1/me', []],
    'a board' => ['GET', '/api/v1/leaderboards/weekly', []],
    'starting a run' => ['POST', '/api/v1/runs', ['mode' => 'free', 'engineVersion' => Rules::ENGINE_VERSION, 'contentVersion' => Catalog::LATEST]],
    'adding a friend' => ['PUT', '/api/v1/users/kerem.35/friend', []],
]);

test('a player token opens no admin route', function (string $method, string $uri) {
    $response = $this->json($method, $uri, [], ['Authorization' => 'Bearer '.guardIsolationPlayerToken()]);

    $this->assertApiError($response, 401, 'unauthenticated');
})->with([
    'me' => ['GET', '/api/v1/admin/me'],
    'signing out' => ['POST', '/api/v1/admin/auth/logout'],
]);

test('each token still opens its own side', function () {
    $this->getJson('/api/v1/admin/me', ['Authorization' => 'Bearer '.guardIsolationAdminToken()])->assertOk();

    app('auth')->forgetGuards();
    $this->getJson('/api/v1/me', ['Authorization' => 'Bearer '.guardIsolationPlayerToken()])->assertOk();
});

test('no token opens no admin route', function () {
    $this->assertApiError($this->getJson('/api/v1/admin/me'), 401, 'unauthenticated');
});
