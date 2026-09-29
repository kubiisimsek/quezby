<?php

use App\Enums\SocialProvider;
use App\Models\Run;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Tests\Support\FakeIdentityProvider;

beforeEach(function () {
    $this->idp = FakeIdentityProvider::install();
});

it('links Apple to a guest, who keeps their runs and stops being a guest', function () {
    $guest = $this->signIn();
    Run::factory()->for($guest)->count(2)->create();
    $nonce = $this->idp->nonce();

    $this->postJson('/api/v1/me/identities/apple', ['identityToken' => $this->idp->appleToken($nonce), 'nonce' => $nonce])
        ->assertOk()
        ->assertJsonPath('user.id', $guest->id)
        ->assertJsonPath('user.isGuest', false)
        ->assertJsonPath('user.identities', ['apple']);

    $this->assertSame(2, $guest->runs()->count());
    $this->postJson('/api/v1/auth/apple', $this->idp->appleSignIn())
        ->assertOk()
        ->assertJsonPath('created', false)
        ->assertJsonPath('user.id', $guest->id);
});

it('links Google to a guest, who keeps their runs and stops being a guest', function () {
    $guest = $this->signIn();
    Run::factory()->for($guest)->create();

    $this->postJson('/api/v1/me/identities/google', ['idToken' => $this->idp->googleToken()])
        ->assertOk()
        ->assertJsonPath('user.id', $guest->id)
        ->assertJsonPath('user.isGuest', false)
        ->assertJsonPath('user.identities', ['google']);

    $this->assertSame(1, $guest->runs()->count());
    $this->postJson('/api/v1/auth/google', $this->idp->googleSignIn())
        ->assertOk()
        ->assertJsonPath('user.id', $guest->id);
});

it('links both providers to one player', function () {
    $player = $this->signIn(User::factory()->withUsername()->linked()->create());
    $nonce = $this->idp->nonce();

    $this->postJson('/api/v1/me/identities/google', ['idToken' => $this->idp->googleToken()])->assertOk();
    $this->postJson('/api/v1/me/identities/apple', ['identityToken' => $this->idp->appleToken($nonce), 'nonce' => $nonce])
        ->assertOk()
        ->assertJsonPath('user.identities', ['apple', 'google']);

    $this->assertSame(2, $player->identities()->count());
});

it('refuses an account another player has', function () {
    FakeIdentityProvider::attach(User::factory()->create(), SocialProvider::Google);
    $player = $this->signIn();

    $this->assertApiError(
        $this->postJson('/api/v1/me/identities/google', ['idToken' => $this->idp->googleToken()]),
        409,
        'identity_taken',
    );
    $this->assertSame(0, $player->identities()->count());
});

it('refuses a second account of the same provider', function () {
    $player = $this->signIn();
    FakeIdentityProvider::attach($player, SocialProvider::Google, ['subject' => 'first-google-account']);

    $this->assertApiError(
        $this->postJson('/api/v1/me/identities/google', ['idToken' => $this->idp->googleToken()]),
        409,
        'already_linked',
    );
    $this->assertApiError(
        $this->postJson('/api/v1/me/identities/google', ['idToken' => $this->idp->googleToken(['sub' => 'first-google-account'])]),
        409,
        'already_linked',
    );
    $this->assertSame(['first-google-account'], $player->identities()->pluck('subject')->all());
});

it('refuses a token the API cannot trust', function () {
    $this->signIn();
    $nonce = $this->idp->nonce();

    $this->assertApiError(
        $this->postJson('/api/v1/me/identities/google', ['idToken' => $this->idp->googleToken(['aud' => 'someone-else'])]),
        422,
        'identity_invalid',
    );
    $this->assertApiError(
        $this->postJson('/api/v1/me/identities/apple', ['identityToken' => $this->idp->appleToken($nonce), 'nonce' => str_repeat('0', 64)]),
        422,
        'identity_invalid',
    );
});

it('needs the provider’s token', function () {
    $this->signIn();

    $this->assertApiError($this->postJson('/api/v1/me/identities/apple', ['idToken' => 'x']), 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => ['identityToken', 'nonce']]]);
    $this->assertApiError($this->postJson('/api/v1/me/identities/google', ['identityToken' => 'x']), 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => ['idToken']]]);
});

it('refuses to unlink the last way in', function (SocialProvider $provider) {
    $player = $this->signIn();
    FakeIdentityProvider::attach($player, $provider);

    $this->assertApiError($this->deleteJson("/api/v1/me/identities/{$provider->value}"), 409, 'last_sign_in_method');
    $this->assertSame(1, $player->identities()->count());
})->with(SocialProvider::cases());

it('unlinks when an email and password remain', function () {
    $player = $this->signIn(User::factory()->linked('kubi@example.com')->create());
    FakeIdentityProvider::attach($player, SocialProvider::Apple);

    $this->deleteJson('/api/v1/me/identities/apple')
        ->assertOk()
        ->assertJsonPath('user.identities', [])
        ->assertJsonPath('user.isGuest', false);
    $this->assertSame(0, $player->identities()->count());
});

it('unlinks when another provider remains', function () {
    $player = $this->signIn();
    FakeIdentityProvider::attach($player, SocialProvider::Apple);
    FakeIdentityProvider::attach($player, SocialProvider::Google);

    $this->deleteJson('/api/v1/me/identities/google')
        ->assertOk()
        ->assertJsonPath('user.identities', ['apple']);
    $this->assertApiError($this->deleteJson('/api/v1/me/identities/apple'), 409, 'last_sign_in_method');
});

it('unlinking a provider that is not linked changes nothing', function () {
    $this->signIn(User::factory()->linked()->create());

    $this->deleteJson('/api/v1/me/identities/google')
        ->assertOk()
        ->assertJsonPath('user.identities', []);
});

it('does not know other providers', function () {
    $this->signIn();

    $this->assertApiError($this->postJson('/api/v1/me/identities/facebook', ['idToken' => 'x']), 404, 'not_found');
    $this->assertApiError($this->deleteJson('/api/v1/me/identities/facebook'), 404, 'not_found');
});

it('needs a signed-in player', function () {
    $this->assertApiError($this->postJson('/api/v1/me/identities/google', ['idToken' => 'x']), 401, 'unauthenticated');
    $this->assertApiError($this->deleteJson('/api/v1/me/identities/google'), 401, 'unauthenticated');
});

it('lets a player who signed in with Apple add an email and password', function () {
    $player = $this->signIn();
    FakeIdentityProvider::attach($player, SocialProvider::Apple);

    Mail::fake();
    $this->postJson('/api/v1/me/credentials', ['email' => 'Kubi@Example.com', 'password' => 'long-enough'])->assertStatus(202);
    $this->postJson('/api/v1/me/credentials/verify', ['code' => $this->codeSentTo('kubi@example.com')])
        ->assertOk()
        ->assertJsonPath('user.email', 'kubi@example.com')
        ->assertJsonPath('user.identities', ['apple']);

    $this->postJson('/api/v1/auth/login', ['email' => 'kubi@example.com', 'password' => 'long-enough'])
        ->assertOk()
        ->assertJsonPath('user.id', $player->id);
});
