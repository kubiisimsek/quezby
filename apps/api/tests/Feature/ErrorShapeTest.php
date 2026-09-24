<?php

use App\Models\User;
use App\Providers\AppServiceProvider;
use Illuminate\Support\Facades\Route;

test('an unknown route is not found', function () {
    $this->assertApiError($this->getJson('/api/v1/nothing-here'), 404, 'not_found');
    $this->assertApiError($this->get('/'), 404, 'not_found');
});

test('a wrong method is not found', function () {
    $this->assertApiError($this->getJson('/api/v1/auth/guest'), 405, 'not_found');
});

test('a missing model is not found', function () {
    Route::middleware('api')->get('/api/v1/_test/missing', fn () => User::query()->findOrFail('01jzzzzzzzzzzzzzzzzzzzzzzz'));

    $this->assertApiError($this->getJson('/api/v1/_test/missing'), 404, 'not_found');
});

test('a crash is a server error without details', function () {
    config(['app.debug' => false]);
    Route::get('/api/v1/_test/crash', fn () => throw new RuntimeException('secret detail'));

    $response = $this->assertApiError($this->getJson('/api/v1/_test/crash'), 500, 'server_error');

    $this->assertSame('Bir şeyler ters gitti, birazdan tekrar dene.', $response->json('error.message'));
    $this->assertStringNotContainsString('secret detail', $response->getContent());
});

test('a crash explains itself in local debug mode', function () {
    config(['app.debug' => true]);
    Route::get('/api/v1/_test/crash', fn () => throw new RuntimeException('what broke'));

    $this->assertApiError($this->getJson('/api/v1/_test/crash'), 500, 'server_error')
        ->assertJsonPath('error.debug.message', 'what broke');
});

test('validation errors carry Turkish messages and fields', function () {
    $response = $this->postJson('/api/v1/auth/login', []);

    $this->assertApiError($response, 422, 'validation_failed')
        ->assertJsonPath('error.fields.email', ['E-posta gerekli.'])
        ->assertJsonPath('error.fields.password', ['Şifre gerekli.'])
        ->assertJsonPath('error.message', 'E-posta gerekli.');
});

test('the API refuses to start with debug on a public host', function () {
    foreach (['staging', 'production'] as $environment) {
        $this->app['env'] = $environment;
        config(['app.debug' => true]);

        try {
            (new AppServiceProvider($this->app))->register();
            $this->fail("Booted {$environment} with APP_DEBUG=true.");
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('APP_DEBUG must be false', $e->getMessage());
            $this->assertFalse(config('app.debug'));
        }
    }
});

test('debug is fine locally, and production is fine without it', function () {
    $this->app['env'] = 'local';
    config(['app.debug' => true]);
    (new AppServiceProvider($this->app))->register();

    $this->app['env'] = 'production';
    config(['app.debug' => false]);
    (new AppServiceProvider($this->app))->register();

    $this->addToAssertionCount(1);
});
