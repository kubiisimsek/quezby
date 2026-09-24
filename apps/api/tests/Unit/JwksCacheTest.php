<?php

use App\Enums\ErrorCode;
use App\Enums\SocialProvider;
use App\Exceptions\ApiException;
use App\Services\Identity\JwksCache;
use Firebase\JWT\Key;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\Support\FakeIdentityProvider;

beforeEach(function () {
    $this->idp = FakeIdentityProvider::install();
    $this->jwks = app(JwksCache::class);
});

it('fetches a key set once and serves it from the cache', function () {
    $keys = $this->jwks->keys(SocialProvider::Apple, 'key-1');
    $this->jwks->keys(SocialProvider::Apple, 'key-1');

    $this->assertSame(['key-1'], array_keys($keys));
    $this->assertInstanceOf(Key::class, $keys['key-1']);
    $this->assertSame('RS256', $keys['key-1']->getAlgorithm());
    Http::assertSentCount(1);
    Http::assertSent(fn (Request $request) => $request->url() === 'https://appleid.apple.com/auth/keys' && $request->method() === 'GET');
});

it('keeps each provider’s keys apart', function () {
    $this->jwks->keys(SocialProvider::Apple, 'key-1');
    $this->jwks->keys(SocialProvider::Google, 'key-1');
    $this->jwks->keys(SocialProvider::Google, 'key-1');

    Http::assertSentCount(2);
    Http::assertSent(fn (Request $request) => $request->url() === 'https://www.googleapis.com/oauth2/v3/certs');
});

it('refetches once for a key it does not know, then not again for five minutes', function () {
    $this->freezeSecond();
    $this->jwks->keys(SocialProvider::Google, 'key-1');
    $this->idp->publish('key-1', 'key-2');

    $this->assertArrayHasKey('key-2', $this->jwks->keys(SocialProvider::Google, 'key-2'));
    Http::assertSentCount(2);

    // A made-up key id is not worth another request yet.
    $this->assertArrayNotHasKey('key-3', $this->jwks->keys(SocialProvider::Google, 'key-3'));
    Http::assertSentCount(2);

    $this->travel(301)->seconds();
    $this->jwks->keys(SocialProvider::Google, 'key-3');
    Http::assertSentCount(3);
});

it('fetches the set again once the cache runs out', function () {
    $this->freezeSecond();
    $this->jwks->keys(SocialProvider::Apple, 'key-1');

    $this->travel(config('quezby.social.jwks_ttl_seconds') - 1)->seconds();
    $this->jwks->keys(SocialProvider::Apple, 'key-1');
    Http::assertSentCount(1);

    $this->travel(2)->seconds();
    $this->jwks->keys(SocialProvider::Apple, 'key-1');
    Http::assertSentCount(2);
});

it('refuses when no key set can be had, and caches nothing', function (int|Closure $answer) {
    $this->idp->jwksAnswers($answer);

    expect(fn () => $this->jwks->keys(SocialProvider::Apple, 'key-1'))
        ->toThrow(fn (ApiException $e) => $this->assertSame(ErrorCode::IdentityInvalid, $e->errorCode));

    $this->idp->jwksAnswers(null);
    $this->assertArrayHasKey('key-1', $this->jwks->keys(SocialProvider::Apple, 'key-1'));
    $this->assertSame(2, $this->idp->attempts(JwksCache::URLS['apple']));
})->with([
    'an error' => [503],
    'no answer' => [fn () => Http::failedConnection()],
    'no keys' => [fn () => fn () => Http::response(['keys' => []])],
    'not a key set' => [fn () => fn () => Http::response('<html>')],
]);

it('keeps the cached keys when a refetch fails', function () {
    $this->jwks->keys(SocialProvider::Apple, 'key-1');
    $this->idp->jwksAnswers(Http::failedConnection());

    $this->assertSame(['key-1'], array_keys($this->jwks->keys(SocialProvider::Apple, 'key-2')));
    $this->assertSame(['key-1'], array_keys($this->jwks->keys(SocialProvider::Apple, 'key-1')));
    $this->assertSame(2, $this->idp->attempts(JwksCache::URLS['apple']));
});
