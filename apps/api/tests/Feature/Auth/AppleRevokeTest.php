<?php

use App\Enums\SocialProvider;
use App\Models\SocialIdentity;
use App\Models\User;
use App\Services\Identity\AppleTokenRevoker;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\Support\FakeIdentityProvider;

beforeEach(function () {
    $this->idp = FakeIdentityProvider::install()->withAppleKey();
});

it('trades the authorization code for a refresh token, and keeps it encrypted', function () {
    $this->freezeSecond();

    $this->postJson('/api/v1/auth/apple', $this->idp->appleSignIn(body: ['authorizationCode' => 'c.auth-code']))
        ->assertCreated();

    Http::assertSent(fn (Request $request) => $request->url() === AppleTokenRevoker::TOKEN_URL
        && $request->method() === 'POST'
        && $request->isForm()
        && $request['client_id'] === FakeIdentityProvider::APPLE_BUNDLE_ID
        && $request['code'] === 'c.auth-code'
        && $request['grant_type'] === 'authorization_code');

    [$request] = Http::recorded(fn (Request $request) => $request->url() === AppleTokenRevoker::TOKEN_URL)->sole();
    [$header, $claims] = $this->idp->clientSecret($request['client_secret']);
    $this->assertSame('ES256', $header['alg']);
    $this->assertSame(FakeIdentityProvider::APPLE_KEY_ID, $header['kid']);
    $this->assertSame(FakeIdentityProvider::APPLE_TEAM_ID, $claims['iss']);
    $this->assertSame('https://appleid.apple.com', $claims['aud']);
    $this->assertSame(FakeIdentityProvider::APPLE_BUNDLE_ID, $claims['sub']);
    $this->assertSame(now()->getTimestamp(), $claims['iat']);
    $this->assertSame(300, $claims['exp'] - $claims['iat']);

    $identity = SocialIdentity::query()->sole();
    $stored = DB::table('social_identities')->value('apple_refresh_token');
    $this->assertSame(FakeIdentityProvider::APPLE_REFRESH_TOKEN, $identity->apple_refresh_token);
    $this->assertStringNotContainsString(FakeIdentityProvider::APPLE_REFRESH_TOKEN, $stored);
    $this->assertSame(FakeIdentityProvider::APPLE_REFRESH_TOKEN, Crypt::decryptString($stored));
    $this->assertArrayNotHasKey('apple_refresh_token', $identity->toArray());
});

it('asks as the app the identity token was issued to', function () {
    $body = $this->idp->appleSignIn(claims: ['aud' => FakeIdentityProvider::APPLE_OTHER_BUNDLE_ID], body: ['authorizationCode' => 'c.auth-code']);

    $this->postJson('/api/v1/auth/apple', $body)->assertCreated();

    [$request] = Http::recorded(fn (Request $request) => $request->url() === AppleTokenRevoker::TOKEN_URL)->sole();
    $this->assertSame(FakeIdentityProvider::APPLE_OTHER_BUNDLE_ID, $request['client_id']);
    $this->assertSame(FakeIdentityProvider::APPLE_OTHER_BUNDLE_ID, $this->idp->clientSecret($request['client_secret'])[1]['sub']);
});

it('keeps the newest refresh token when the player signs in again', function () {
    FakeIdentityProvider::attach(User::factory()->create(), SocialProvider::Apple, ['apple_refresh_token' => 'r.old-token']);

    $this->postJson('/api/v1/auth/apple', $this->idp->appleSignIn(body: ['authorizationCode' => 'c.auth-code']))->assertOk();

    $this->assertSame(FakeIdentityProvider::APPLE_REFRESH_TOKEN, SocialIdentity::query()->sole()->apple_refresh_token);
});

it('trades the code when Apple is linked, too', function () {
    $player = $this->signIn();
    $nonce = $this->idp->nonce();

    $this->postJson('/api/v1/me/identities/apple', [
        'identityToken' => $this->idp->appleToken($nonce),
        'nonce' => $nonce,
        'authorizationCode' => 'c.auth-code',
    ])->assertOk();

    $this->assertSame(FakeIdentityProvider::APPLE_REFRESH_TOKEN, $player->identities()->sole()->apple_refresh_token);
});

it('signs in all the same when Apple will not trade the code', function (int|Closure $answer) {
    $this->idp->appleAnswers(token: $answer);

    $this->postJson('/api/v1/auth/apple', $this->idp->appleSignIn(body: ['authorizationCode' => 'c.expired-code']))
        ->assertCreated();

    $this->assertSame(1, $this->idp->attempts(AppleTokenRevoker::TOKEN_URL));
    $this->assertNull(SocialIdentity::query()->sole()->apple_refresh_token);
})->with([
    'an error' => [400],
    'no answer' => [fn () => Http::failedConnection()],
]);

it('trades nothing without a Sign in with Apple key', function () {
    config(['quezby.social.apple.team_id' => null]);

    $this->postJson('/api/v1/auth/apple', $this->idp->appleSignIn(body: ['authorizationCode' => 'c.auth-code']))
        ->assertCreated();

    $this->assertSame(0, $this->idp->attempts(AppleTokenRevoker::TOKEN_URL));
    $this->assertNull(SocialIdentity::query()->sole()->apple_refresh_token);
});

it('revokes Apple’s grant when the account is deleted', function () {
    $player = $this->signIn(FakeIdentityProvider::playerWithAppleGrant());

    $this->deleteJson('/api/v1/me')->assertNoContent();

    Http::assertSent(fn (Request $request) => $request->url() === AppleTokenRevoker::REVOKE_URL
        && $request->isForm()
        && $request['client_id'] === FakeIdentityProvider::APPLE_BUNDLE_ID
        && $request['token'] === FakeIdentityProvider::APPLE_REFRESH_TOKEN
        && $request['token_type_hint'] === 'refresh_token');
    foreach (Http::recorded(fn (Request $request) => $request->url() === AppleTokenRevoker::REVOKE_URL) as [$request]) {
        [$header, $claims] = $this->idp->clientSecret($request['client_secret']);
        $this->assertSame(FakeIdentityProvider::APPLE_KEY_ID, $header['kid']);
        $this->assertSame(FakeIdentityProvider::APPLE_TEAM_ID, $claims['iss']);
        $this->assertSame($request['client_id'], $claims['sub']);
    }
    $this->assertModelMissing($player);
    $this->assertDatabaseCount('social_identities', 0);
});

it('asks Apple as every configured app, since the token does not say which it belongs to', function () {
    $this->signIn(FakeIdentityProvider::playerWithAppleGrant());

    $this->deleteJson('/api/v1/me')->assertNoContent();

    $asked = Http::recorded(fn (Request $request) => $request->url() === AppleTokenRevoker::REVOKE_URL)
        ->map(fn (array $pair) => $pair[0]['client_id'])
        ->all();
    $this->assertSame([FakeIdentityProvider::APPLE_BUNDLE_ID, FakeIdentityProvider::APPLE_OTHER_BUNDLE_ID], $asked);
});

it('deletes the account all the same when Apple fails', function (int|Closure $answer) {
    $this->idp->appleAnswers(revoke: $answer);
    $player = $this->signIn(FakeIdentityProvider::playerWithAppleGrant());

    $this->deleteJson('/api/v1/me')->assertNoContent();

    $this->assertSame(2, $this->idp->attempts(AppleTokenRevoker::REVOKE_URL));
    $this->assertModelMissing($player);
})->with([
    'an error' => [500],
    'no answer' => [fn () => Http::failedConnection()],
]);

it('deletes the account without asking Apple when no key is configured', function (array $config) {
    config($config);
    $player = $this->signIn(FakeIdentityProvider::playerWithAppleGrant());

    $this->deleteJson('/api/v1/me')->assertNoContent();

    Http::assertNothingSent();
    $this->assertModelMissing($player);
})->with([
    'no team id' => [['quezby.social.apple.team_id' => null]],
    'no key id' => [['quezby.social.apple.key_id' => '']],
    'no key file' => [['quezby.social.apple.private_key_path' => null]],
    'a key file that is not there' => [['quezby.social.apple.private_key_path' => '/nowhere/AuthKey_KEY1234567.p8']],
]);

it('deletes the account when the stored token cannot be decrypted', function () {
    $player = $this->signIn(FakeIdentityProvider::playerWithAppleGrant());
    DB::table('social_identities')->update(['apple_refresh_token' => 'not-encrypted']);

    $this->deleteJson('/api/v1/me')->assertNoContent();

    Http::assertNothingSent();
    $this->assertModelMissing($player);
});

it('asks Apple nothing for an identity without a refresh token, or for Google', function () {
    $player = $this->signIn();
    FakeIdentityProvider::attach($player, SocialProvider::Apple);
    FakeIdentityProvider::attach($player, SocialProvider::Google);

    $this->deleteJson('/api/v1/me')->assertNoContent();

    Http::assertNothingSent();
    $this->assertModelMissing($player);
});

it('revokes Apple’s grant when Apple is unlinked', function () {
    $player = $this->signIn(FakeIdentityProvider::playerWithAppleGrant());

    $this->deleteJson('/api/v1/me/identities/apple')->assertOk();

    Http::assertSent(fn (Request $request) => $request->url() === AppleTokenRevoker::REVOKE_URL
        && $request['token'] === FakeIdentityProvider::APPLE_REFRESH_TOKEN);
    $this->assertSame(0, $player->identities()->count());
});

it('revokes nothing when unlinking Apple is refused', function () {
    $player = $this->signIn();
    FakeIdentityProvider::attach($player, SocialProvider::Apple, ['apple_refresh_token' => FakeIdentityProvider::APPLE_REFRESH_TOKEN]);

    $this->assertApiError($this->deleteJson('/api/v1/me/identities/apple'), 409, 'last_sign_in_method');

    Http::assertNothingSent();
});
