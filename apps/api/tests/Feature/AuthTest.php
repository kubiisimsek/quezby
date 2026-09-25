<?php

use App\Models\User;
use App\Services\Identity\GuestNames;

test('a guest signs up and the token works', function () {
    $response = $this->postJson('/api/v1/auth/guest', ['platform' => 'ios', 'installId' => 'install-123']);

    $response->assertCreated()
        ->assertJsonPath('user.email', null)
        ->assertJsonPath('user.isGuest', true)
        ->assertJsonPath('user.settings', ['haptics' => true])
        ->assertJsonPath('user.best', null);
    $this->assertMatchesRegularExpression('/^guest\d{8}$/', $response->json('user.username'));
    $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/', $response->json('user.createdAt'));
    $this->assertDatabaseHas('users', [
        'id' => $response->json('user.id'),
        'platform' => 'ios',
        'install_id' => 'install-123',
        'username' => $response->json('user.username'),
        'password' => null,
    ]);

    $this->withToken($response->json('token'))->getJson('/api/v1/me')
        ->assertOk()
        ->assertJsonPath('user.id', $response->json('user.id'))
        ->assertJsonPath('ranks', ['daily' => null, 'weekly' => null, 'monthly' => null, 'all' => null]);
});

test('a guest plays under its automatic name straight away', function () {
    $token = $this->postJson('/api/v1/auth/guest', ['platform' => 'android', 'installId' => 'install-1'])
        ->assertCreated()
        ->json('token');

    $this->withToken($token)->startRun()->assertCreated();
});

test('two guests never share a name', function () {
    $this->app->instance(GuestNames::class, new GuestNames(drawn(7, 7, 8)));

    $first = $this->postJson('/api/v1/auth/guest', ['platform' => 'ios', 'installId' => 'install-1'])->assertCreated();
    $second = $this->postJson('/api/v1/auth/guest', ['platform' => 'ios', 'installId' => 'install-2'])->assertCreated();

    expect($first->json('user.username'))->toBe('guest00000007')
        ->and($second->json('user.username'))->toBe('guest00000008');
});

test('a guest whose name was taken in the same instant draws another', function () {
    $this->app->instance(GuestNames::class, new GuestNames(drawn(7, 8)));
    $raced = false;
    User::creating(function (User $user) use (&$raced) {
        if (! $raced && $user->username === 'guest00000007') {
            $raced = true;
            User::factory()->withUsername('guest00000007')->create();
        }
    });

    $this->postJson('/api/v1/auth/guest', ['platform' => 'ios', 'installId' => 'install-1'])
        ->assertCreated()
        ->assertJsonPath('user.username', 'guest00000008');
});

test('guest signup needs a known platform and an install id', function () {
    $response = $this->postJson('/api/v1/auth/guest', ['platform' => 'windows']);

    $this->assertApiError($response, 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => ['platform', 'installId']]]);
    $this->assertSame('Seçilen platform geçersiz.', $response->json('error.fields.platform.0'));
});

test('guest signup is throttled per IP', function () {
    for ($i = 0; $i < 10; $i++) {
        $this->postJson('/api/v1/auth/guest', ['platform' => 'android', 'installId' => "install-{$i}"])->assertCreated();
    }

    $this->assertApiError(
        $this->postJson('/api/v1/auth/guest', ['platform' => 'android', 'installId' => 'one-too-many']),
        429,
        'too_many_requests',
    )->assertHeader('Retry-After');
});

test('a linked account logs in and out', function () {
    $user = User::factory()->withUsername()->linked('kubi@example.com', 'secret-password')->create();

    $response = $this->postJson('/api/v1/auth/login', ['email' => 'Kubi@Example.com', 'password' => 'secret-password']);

    $response->assertOk()
        ->assertJsonPath('user.id', $user->id)
        ->assertJsonPath('user.isGuest', false)
        ->assertJsonPath('user.email', 'kubi@example.com');
    $token = $response->json('token');

    $this->withToken($token)->getJson('/api/v1/me')->assertOk();
    $this->withToken($token)->postJson('/api/v1/auth/logout')->assertNoContent();

    $this->app['auth']->forgetGuards();
    $this->assertApiError($this->withToken($token)->getJson('/api/v1/me'), 401, 'unauthenticated');
    $this->assertSame(0, $user->tokens()->count());
});

test('logout revokes only the current token', function () {
    $user = User::factory()->create();
    $phone = $user->createToken('ios')->plainTextToken;
    $tablet = $user->createToken('ios')->plainTextToken;

    $this->withToken($phone)->postJson('/api/v1/auth/logout')->assertNoContent();

    $this->app['auth']->forgetGuards();
    $this->withToken($tablet)->getJson('/api/v1/me')->assertOk();
});

test('a wrong password or an unknown email is invalid credentials', function () {
    User::factory()->linked('kubi@example.com', 'secret-password')->create();

    $this->assertApiError(
        $this->postJson('/api/v1/auth/login', ['email' => 'kubi@example.com', 'password' => 'wrong-password']),
        422,
        'invalid_credentials',
    );
    $this->assertApiError(
        $this->postJson('/api/v1/auth/login', ['email' => 'nobody@example.com', 'password' => 'secret-password']),
        422,
        'invalid_credentials',
    );
});

test('login is throttled per IP', function () {
    for ($i = 0; $i < 10; $i++) {
        $this->postJson('/api/v1/auth/login', ['email' => 'kubi@example.com', 'password' => 'guess-'.$i])->assertStatus(422);
    }

    $this->assertApiError(
        $this->postJson('/api/v1/auth/login', ['email' => 'kubi@example.com', 'password' => 'guess-11']),
        429,
        'too_many_requests',
    );
});

test('a request without a token is unauthenticated', function () {
    $this->assertApiError($this->getJson('/api/v1/me'), 401, 'unauthenticated');
    $this->assertApiError($this->withToken('1|not-a-real-token')->getJson('/api/v1/me'), 401, 'unauthenticated');
});

test('a request that does not ask for JSON still gets the JSON error', function () {
    $this->assertApiError($this->get('/api/v1/me'), 401, 'unauthenticated');
});
