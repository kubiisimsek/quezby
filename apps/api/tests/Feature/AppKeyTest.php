<?php

use App\Enums\AdminRole;
use Illuminate\Encryption\MissingAppKeyException;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Http;
use Tests\Support\FakeIdentityProvider;

dataset('broken app keys', [
    'missing' => [''],
    'not base64' => ['base64:%%%'],
    'too short' => ['base64:'.base64_encode(str_repeat('k', 16))],
]);

it('answers players with a server error while APP_KEY is missing or broken, and reports why', function (string $key) {
    $this->signIn();
    config(['app.key' => $key]);
    Exceptions::fake();

    $this->assertApiError($this->getJson('/api/v1/health'), 500, 'server_error');
    $this->assertApiError($this->getJson('/api/v1/me'), 500, 'server_error');

    Exceptions::assertReported(fn (MissingAppKeyException $e) => str_contains($e->getMessage(), 'Önbelleği yenile'));
})->with('broken app keys');

it('trades no Apple code for a token without APP_KEY, so none is spent', function () {
    $idp = FakeIdentityProvider::install();
    $body = $idp->appleSignIn(body: ['authorizationCode' => 'a-one-time-code']);
    config(['app.key' => '']);

    $this->assertApiError($this->postJson('/api/v1/auth/apple', $body), 500, 'server_error');

    Http::assertNothingSent();
    $this->assertDatabaseCount('users', 0);
});

it('keeps the admin panel and the ops routes open, as they are how a missing key is put right', function () {
    config(['app.key' => '', 'quezby.ops_token' => 'a-long-random-ops-token']);
    $this->signInAdmin(AdminRole::Owner);

    $this->getJson('/api/v1/admin/system')->assertOk()->assertJsonPath('appKey', false);

    // Really caching the config here would pin the test configuration for `php artisan serve`.
    Artisan::shouldReceive('call')->once()->with('optimize:clear', [])->andReturn(0);
    Artisan::shouldReceive('call')->once()->with('optimize', [])->andReturn(0);
    Artisan::shouldReceive('output')->twice()->andReturn("cleared\n", "cached\n");
    $this->postJson('/api/v1/ops/optimize', [], ['X-Ops-Token' => 'a-long-random-ops-token'])->assertOk();
});

it('lets every request through once the key is there', function () {
    $this->getJson('/api/v1/health')->assertOk()->assertJsonPath('status', 'ok');
});
