<?php

use App\Models\SocialIdentity;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Tests\Support\FakeIdentityProvider;

beforeEach(function () {
    $this->idp = FakeIdentityProvider::install();
});

it('signs up a new Apple player', function () {
    $response = $this->postJson('/api/v1/auth/apple', $this->idp->appleSignIn(body: ['installId' => 'install-1']));

    $response->assertCreated()
        ->assertJsonPath('created', true)
        ->assertJsonPath('user.email', null)
        ->assertJsonPath('user.isGuest', false)
        ->assertJsonPath('user.identities', ['apple'])
        ->assertJsonPath('user.locale', 'tr');
    $this->assertMatchesRegularExpression('/^guest\d{8}$/', $response->json('user.username'));
    $userId = $response->json('user.id');
    $this->assertDatabaseHas('users', ['id' => $userId, 'platform' => 'ios', 'install_id' => 'install-1', 'email' => null, 'locale' => 'tr']);
    $this->assertDatabaseHas('social_identities', [
        'user_id' => $userId,
        'provider' => 'apple',
        'subject' => FakeIdentityProvider::APPLE_SUBJECT,
        'email' => FakeIdentityProvider::APPLE_EMAIL,
        'email_verified' => true,
        'apple_refresh_token' => null,
    ]);

    $this->withToken($response->json('token'))->getJson('/api/v1/me')
        ->assertOk()
        ->assertJsonPath('user.id', $userId)
        ->assertJsonPath('user.identities', ['apple']);
});

it('signs the same Apple player back in', function () {
    $first = $this->postJson('/api/v1/auth/apple', $this->idp->appleSignIn())->assertCreated();
    $this->travel(1)->hours();

    // A phone that speaks another language finds the player in their own.
    $again = $this->withHeader('Accept-Language', 'fr')->postJson('/api/v1/auth/apple', $this->idp->appleSignIn(body: ['installId' => 'new-phone']));

    $again->assertOk()
        ->assertJsonPath('created', false)
        ->assertJsonPath('user.id', $first->json('user.id'))
        ->assertJsonPath('user.username', $first->json('user.username'))
        ->assertJsonPath('user.locale', 'tr');
    $this->assertNotSame($first->json('token'), $again->json('token'));
    $this->assertSame(1, User::query()->count());
    $this->assertTrue(SocialIdentity::query()->sole()->last_used_at->equalTo(now()->startOfSecond()));
});

it('keeps the email off the account, and a token without one is fine', function () {
    $this->postJson('/api/v1/auth/apple', $this->idp->appleSignIn(claims: ['email' => null, 'email_verified' => null]))
        ->assertCreated()
        ->assertJsonPath('user.email', null);

    $this->assertDatabaseHas('social_identities', ['provider' => 'apple', 'email' => null, 'email_verified' => false]);
});

it('takes tokens for every configured app', function () {
    $this->postJson('/api/v1/auth/apple', $this->idp->appleSignIn(claims: ['aud' => FakeIdentityProvider::APPLE_OTHER_BUNDLE_ID]))
        ->assertCreated();
});

it('refuses a token the API cannot trust', function (Closure $body) {
    $response = $this->postJson('/api/v1/auth/apple', $body($this->idp));

    $this->assertApiError($response, 422, 'identity_invalid');
    $this->assertSame(0, User::query()->count());
})->with([
    'signed with an unknown key' => function (FakeIdentityProvider $idp) {
        $nonce = $idp->nonce();

        return [...$idp->appleSignIn($nonce), 'identityToken' => $idp->appleToken($nonce, kid: 'key-2')];
    },
    'for another app' => fn (FakeIdentityProvider $idp) => $idp->appleSignIn(claims: ['aud' => 'com.example.other']),
    'expired' => fn (FakeIdentityProvider $idp) => $idp->appleSignIn(claims: ['exp' => now()->subMinutes(2)->getTimestamp()]),
    'without an expiry' => fn (FakeIdentityProvider $idp) => $idp->appleSignIn(claims: ['exp' => null]),
    'from another issuer' => fn (FakeIdentityProvider $idp) => $idp->appleSignIn(claims: ['iss' => 'https://accounts.google.com']),
    'without a subject' => fn (FakeIdentityProvider $idp) => $idp->appleSignIn(claims: ['sub' => null]),
    'with a bad signature' => function (FakeIdentityProvider $idp) {
        $body = $idp->appleSignIn();

        return [...$body, 'identityToken' => $idp->tamper($body['identityToken'], ['sub' => 'someone-else'])];
    },
    'carrying another nonce' => fn (FakeIdentityProvider $idp) => [...$idp->appleSignIn(), 'nonce' => $idp->nonce()],
    'with a nonce the API never issued' => fn (FakeIdentityProvider $idp) => $idp->appleSignIn(str_repeat('0', 64)),
    'that is not a token' => fn (FakeIdentityProvider $idp) => [...$idp->appleSignIn(), 'identityToken' => 'not.a.token'],
]);

it('refuses a nonce that was already used', function () {
    $body = $this->idp->appleSignIn();
    $this->postJson('/api/v1/auth/apple', $body)->assertCreated();

    $this->assertApiError($this->postJson('/api/v1/auth/apple', $body), 422, 'identity_invalid');
});

it('refuses a nonce that expired', function () {
    $nonce = $this->idp->nonce();
    $this->travel(11)->minutes();

    $this->assertApiError($this->postJson('/api/v1/auth/apple', $this->idp->appleSignIn($nonce)), 422, 'identity_invalid');
});

it('allows a minute of clock skew', function () {
    $this->postJson('/api/v1/auth/apple', $this->idp->appleSignIn(claims: ['exp' => now()->subSeconds(30)->getTimestamp()]))
        ->assertCreated();
});

it('fetches Apple’s keys once for many sign-ins', function () {
    $this->postJson('/api/v1/auth/apple', $this->idp->appleSignIn())->assertCreated();
    $this->postJson('/api/v1/auth/apple', $this->idp->appleSignIn())->assertOk();

    Http::assertSentCount(1);
});

it('refetches Apple’s keys once when they rotate', function () {
    $this->postJson('/api/v1/auth/apple', $this->idp->appleSignIn())->assertCreated();
    $this->idp->publish('key-2');

    $nonce = $this->idp->nonce();
    $this->postJson('/api/v1/auth/apple', [...$this->idp->appleSignIn($nonce), 'identityToken' => $this->idp->appleToken($nonce, kid: 'key-2')])
        ->assertOk();
    Http::assertSentCount(2);

    $nonce = $this->idp->nonce();
    $this->assertApiError(
        $this->postJson('/api/v1/auth/apple', [...$this->idp->appleSignIn($nonce), 'identityToken' => $this->idp->appleToken($nonce, kid: 'key-3')]),
        422,
        'identity_invalid',
    );
    Http::assertSentCount(2);
});

it('needs a token, a nonce, a platform and an install id', function () {
    $response = $this->postJson('/api/v1/auth/apple', ['platform' => 'windows', 'identityToken' => str_repeat('a', 4097)]);

    $this->assertApiError($response, 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => ['identityToken', 'nonce', 'platform', 'installId']]])
        ->assertJsonPath('error.fields.nonce', ['Tek kullanımlık kod gerekli.'])
        ->assertJsonPath('error.fields.identityToken', ['Kimlik jetonu en fazla 4096 karakter olabilir.']);
});
