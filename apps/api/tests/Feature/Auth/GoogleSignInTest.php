<?php

use App\Models\SocialIdentity;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Tests\Support\FakeIdentityProvider;

beforeEach(function () {
    $this->idp = FakeIdentityProvider::install();
});

it('signs up a new Google player', function () {
    $response = $this->postJson('/api/v1/auth/google', $this->idp->googleSignIn(body: ['installId' => 'install-1']));

    $response->assertCreated()
        ->assertJsonPath('created', true)
        ->assertJsonPath('user.email', null)
        ->assertJsonPath('user.isGuest', false)
        ->assertJsonPath('user.identities', ['google']);
    $this->assertMatchesRegularExpression('/^guest\d{8}$/', $response->json('user.username'));
    $userId = $response->json('user.id');
    $this->assertDatabaseHas('users', ['id' => $userId, 'platform' => 'android', 'install_id' => 'install-1']);
    $this->assertDatabaseHas('social_identities', [
        'user_id' => $userId,
        'provider' => 'google',
        'subject' => FakeIdentityProvider::GOOGLE_SUBJECT,
        'email' => FakeIdentityProvider::GOOGLE_EMAIL,
        'email_verified' => true,
    ]);

    $this->withToken($response->json('token'))->getJson('/api/v1/me')
        ->assertOk()
        ->assertJsonPath('user.id', $userId);
});

it('signs the same Google player back in', function () {
    $first = $this->postJson('/api/v1/auth/google', $this->idp->googleSignIn())->assertCreated();
    User::query()->whereKey($first->json('user.id'))->update(['username' => 'ekin.su']);

    $this->postJson('/api/v1/auth/google', $this->idp->googleSignIn(body: ['platform' => 'ios']))
        ->assertOk()
        ->assertJsonPath('created', false)
        ->assertJsonPath('user.id', $first->json('user.id'))
        ->assertJsonPath('user.username', 'ekin.su');
    $this->assertSame(1, User::query()->count());
    Http::assertSentCount(1);
});

it('takes the web and the iOS client id as audience', function (string $clientId) {
    $this->postJson('/api/v1/auth/google', $this->idp->googleSignIn(['aud' => $clientId]))->assertCreated();
})->with([
    'web' => FakeIdentityProvider::GOOGLE_WEB_CLIENT_ID,
    'iOS' => FakeIdentityProvider::GOOGLE_IOS_CLIENT_ID,
]);

it('takes both issuers Google signs with', function (string $issuer) {
    $this->postJson('/api/v1/auth/google', $this->idp->googleSignIn(['iss' => $issuer]))->assertCreated();
})->with(['accounts.google.com', 'https://accounts.google.com']);

it('refuses a token the API cannot trust', function (Closure $claims) {
    $body = $this->idp->googleSignIn($claims());

    $this->assertApiError($this->postJson('/api/v1/auth/google', $body), 422, 'identity_invalid');
    $this->assertSame(0, User::query()->count());
})->with([
    'for another client' => fn () => ['aud' => '999-other.apps.googleusercontent.com'],
    'for no client' => fn () => ['aud' => null],
    'from another issuer' => fn () => ['iss' => 'https://appleid.apple.com'],
    'expired' => fn () => ['exp' => now()->subMinutes(2)->getTimestamp()],
    'issued in the future' => fn () => ['iat' => now()->addMinutes(5)->getTimestamp()],
]);

it('refuses a token signed with a key Google does not publish', function () {
    $body = $this->idp->googleSignIn();
    $body['idToken'] = $this->idp->googleToken(kid: 'key-2');

    $this->assertApiError($this->postJson('/api/v1/auth/google', $body), 422, 'identity_invalid');
});

it('refuses a token that was tampered with', function () {
    $body = $this->idp->googleSignIn();
    $body['idToken'] = $this->idp->tamper($body['idToken'], ['aud' => FakeIdentityProvider::GOOGLE_IOS_CLIENT_ID]);

    $this->assertApiError($this->postJson('/api/v1/auth/google', $body), 422, 'identity_invalid');
});

it('drops an email Google has not verified', function (mixed $verified) {
    $this->postJson('/api/v1/auth/google', $this->idp->googleSignIn(['email_verified' => $verified]))->assertCreated();

    $identity = SocialIdentity::query()->sole();
    $this->assertNull($identity->email);
    $this->assertFalse($identity->email_verified);
})->with([
    'false' => false,
    'the string false' => 'false',
    'missing' => null,
]);

it('never merges accounts by email', function () {
    $owner = User::factory()->withUsername()->linked(FakeIdentityProvider::GOOGLE_EMAIL)->create();

    $response = $this->postJson('/api/v1/auth/google', $this->idp->googleSignIn())->assertCreated();

    $this->assertNotSame($owner->id, $response->json('user.id'));
    $this->assertSame(0, $owner->identities()->count());
});

it('needs a token, a platform and an install id', function () {
    $response = $this->postJson('/api/v1/auth/google', ['platform' => 'windows', 'installId' => str_repeat('a', 101)]);

    $this->assertApiError($response, 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => ['idToken', 'platform', 'installId']]])
        ->assertJsonPath('error.fields.idToken', ['Kimlik jetonu gerekli.']);
});

it('is throttled per IP, Apple and Google together', function () {
    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/api/v1/auth/apple', [])->assertStatus(422);
        $this->postJson('/api/v1/auth/google', [])->assertStatus(422);
    }

    $this->assertApiError($this->postJson('/api/v1/auth/google', $this->idp->googleSignIn()), 429, 'too_many_requests')
        ->assertHeader('Retry-After');
    $this->assertApiError($this->postJson('/api/v1/auth/apple', $this->idp->appleSignIn()), 429, 'too_many_requests');
    $this->assertSame(0, User::query()->count());
});
