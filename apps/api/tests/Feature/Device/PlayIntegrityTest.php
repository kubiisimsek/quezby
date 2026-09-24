<?php

use App\Models\DeviceCheck;
use App\Models\User;
use App\Services\Integrity\DeviceChallenges;
use App\Services\Integrity\GoogleServiceAccount;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Tests\Support\FakePlayIntegrity;

/*
| `POST /device/android`: a Play Integrity token (standard request, with
| `requestHash = sha256Hex(challenge)`), read through Google's decode
| endpoint behind `Http::fake`. A pass only for our app from Play on a device
| Google trusts; a readable token that falls short is a stored `fail`; when
| Google cannot be asked, `unavailable` — never held against the player.
*/

beforeEach(function () {
    Carbon::setTestNow('2026-09-24 12:00:00.000');
    $this->player = $this->signIn();
    $this->google = FakePlayIntegrity::install();
    $this->challenge = fn (?User $for = null) => app(DeviceChallenges::class)->issue($for ?? $this->player)['challenge'];
    $this->check = fn (string $challenge, string $token) => $this->postJson('/api/v1/device/android', ['challenge' => $challenge, 'token' => $token]);
});

it('passes a genuine app from Play on a genuine phone, for six hours', function () {
    $challenge = ($this->challenge)();

    ($this->check)($challenge, $this->google->token($challenge))
        ->assertOk()
        ->assertExactJson(['verdict' => 'pass', 'validUntil' => '2026-09-24T18:00:00.000Z', 'enforced' => false]);

    $check = DeviceCheck::query()->sole();
    expect($check->user_id)->toBe($this->player->id)
        ->and($check->platform->value)->toBe('android')
        ->and($check->verdict->value)->toBe('pass')
        ->and($check->reason)->toBeNull()
        ->and($check->details)->toBe([
            'package' => FakePlayIntegrity::PACKAGE,
            'app' => 'PLAY_RECOGNIZED',
            'device' => ['MEETS_DEVICE_INTEGRITY'],
            'licensing' => 'LICENSED',
            'ageMs' => 0,
        ])
        ->and($check->checked_at->toIso8601ZuluString('millisecond'))->toBe('2026-09-24T12:00:00.000Z');

    // Google was asked for our first app, with the service account's token and the app's token.
    expect($this->google->decodeRequests)->toHaveCount(1);
    ['package' => $package, 'request' => $request] = $this->google->decodeRequests[0];
    expect($package)->toBe(FakePlayIntegrity::PACKAGE)
        ->and($request->header('Authorization'))->toBe(['Bearer '.FakePlayIntegrity::ACCESS_TOKEN])
        ->and($request->data())->toBe(['integrity_token' => $this->google->token($challenge)]);
});

it('trades a service-account JWT for the access token', function () {
    $challenge = ($this->challenge)();

    ($this->check)($challenge, $this->google->token($challenge))->assertOk();

    expect($this->google->tokenRequests)->toHaveCount(1)
        ->and($this->google->tokenRequests[0]['grant_type'])->toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
    [$header, $claims] = $this->google->assertion();
    expect($header)->toMatchArray(['alg' => 'RS256', 'kid' => 'key-1'])
        ->and($claims)->toMatchArray([
            'iss' => FakePlayIntegrity::CLIENT_EMAIL,
            'scope' => 'https://www.googleapis.com/auth/playintegrity',
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => now()->getTimestamp(),
            'exp' => now()->getTimestamp() + 3600,
        ]);
});

it('keeps the access token for fifty minutes', function () {
    foreach ([0, 49] as $minutes) {
        $this->travelTo(Carbon::parse('2026-09-24 12:00:00')->addMinutes($minutes));
        $challenge = ($this->challenge)();
        ($this->check)($challenge, $this->google->token($challenge))->assertJsonPath('verdict', 'pass');
    }
    expect($this->google->tokenRequests)->toHaveCount(1)
        ->and($this->google->decodeRequests)->toHaveCount(2);

    $this->travelTo(Carbon::parse('2026-09-24 12:51:00'));
    $challenge = ($this->challenge)();
    ($this->check)($challenge, $this->google->token($challenge))->assertJsonPath('verdict', 'pass');
    expect($this->google->tokenRequests)->toHaveCount(2);
});

it('forgets an access token Google no longer takes', function () {
    $challenge = ($this->challenge)();
    $this->google->decodeAnswers(401);
    ($this->check)($challenge, $this->google->token($challenge))->assertJsonPath('verdict', 'unavailable');

    $this->google->decodeAnswers(null);
    $challenge = ($this->challenge)();
    ($this->check)($challenge, $this->google->token($challenge))->assertJsonPath('verdict', 'pass');

    expect($this->google->tokenRequests)->toHaveCount(2);
});

it('fails, for twelve hours, a token that falls short', function (array $set, string $reason) {
    $challenge = ($this->challenge)();

    ($this->check)($challenge, $this->google->token($challenge, $set))
        ->assertOk()
        ->assertExactJson(['verdict' => 'fail', 'validUntil' => '2026-09-25T00:00:00.000Z', 'enforced' => false]);

    $check = DeviceCheck::query()->sole();
    expect($check->verdict->value)->toBe('fail')
        ->and($check->reason)->toBe($reason)
        ->and($check->platform->value)->toBe('android');
})->with([
    'asked for another challenge' => [['requestDetails.requestHash' => hash('sha256', 'another challenge')], 'hash'],
    'no request hash' => [['requestDetails.requestHash' => null], 'hash'],
    'for an app that is not ours' => [['requestDetails.requestPackageName' => 'com.example.cheat'], 'package'],
    // Now is 2026-09-24 12:00:00 UTC: 1790251200000 ms.
    'asked for eleven minutes ago' => [['requestDetails.timestampMillis' => '1790250540000'], 'stale'],
    'from eleven minutes ahead' => [['requestDetails.timestampMillis' => '1790251860000'], 'stale'],
    'with no time' => [['requestDetails.timestampMillis' => null], 'stale'],
    'a changed or sideloaded app' => [['appIntegrity.appRecognitionVerdict' => 'UNRECOGNIZED_VERSION'], 'app'],
    'an app Google could not judge' => [['appIntegrity.appRecognitionVerdict' => 'UNEVALUATED'], 'app'],
    'a rooted phone or an emulator' => [['deviceIntegrity.deviceRecognitionVerdict' => ['MEETS_BASIC_INTEGRITY']], 'device'],
    'no device verdict at all' => [['deviceIntegrity.deviceRecognitionVerdict' => []], 'device'],
    'no device integrity section' => [['deviceIntegrity' => null], 'device'],
]);

it('says whether a fail costs the player anything', function (string $mode, bool $enforced, array $set, string $verdict) {
    config(['quezby.integrity.mode' => $mode]);
    $challenge = ($this->challenge)();

    ($this->check)($challenge, $this->google->token($challenge, $set))
        ->assertOk()
        ->assertJsonPath('verdict', $verdict)
        ->assertJsonPath('enforced', $enforced);
})->with([
    'enforced, a pass' => ['enforce', true, [], 'pass'],
    'enforced, a fail' => ['enforce', true, ['deviceIntegrity.deviceRecognitionVerdict' => []], 'fail'],
    'logged, a pass' => ['log', false, [], 'pass'],
    'logged, a fail' => ['log', false, ['deviceIntegrity.deviceRecognitionVerdict' => []], 'fail'],
    'off' => ['off', false, [], 'unavailable'],
]);

it('says it is enforced when Google cannot be asked, too', function () {
    config(['quezby.integrity.mode' => 'enforce']);
    $this->google->decodeAnswers(503);
    $challenge = ($this->challenge)();

    ($this->check)($challenge, $this->google->token($challenge))->assertExactJson([
        'verdict' => 'unavailable', 'validUntil' => '2026-09-24T12:30:00.000Z', 'enforced' => true,
    ]);
});

it('passes a phone that meets more than device integrity', function () {
    $challenge = ($this->challenge)();

    ($this->check)($challenge, $this->google->token($challenge, [
        'deviceIntegrity.deviceRecognitionVerdict' => ['MEETS_BASIC_INTEGRITY', 'MEETS_DEVICE_INTEGRITY', 'MEETS_STRONG_INTEGRITY'],
        'requestDetails.timestampMillis' => (string) (now()->getTimestampMs() - 599_000),
    ]))->assertJsonPath('verdict', 'pass');
});

it('asks Google for each of our apps in turn', function () {
    $this->google->strictPackages = true;
    $challenge = ($this->challenge)();

    ($this->check)($challenge, $this->google->token($challenge, package: FakePlayIntegrity::OTHER_PACKAGE))
        ->assertJsonPath('verdict', 'pass');

    expect(array_column($this->google->decodeRequests, 'package'))->toBe([FakePlayIntegrity::PACKAGE, FakePlayIntegrity::OTHER_PACKAGE]);
    expect(DeviceCheck::query()->sole()->details['package'])->toBe(FakePlayIntegrity::OTHER_PACKAGE);
});

it('only asks for the apps this API serves', function () {
    config(['quezby.integrity.android.packages' => [FakePlayIntegrity::OTHER_PACKAGE]]);
    $challenge = ($this->challenge)();

    ($this->check)($challenge, $this->google->token($challenge))->assertJsonPath('verdict', 'fail');

    expect(array_column($this->google->decodeRequests, 'package'))->toBe([FakePlayIntegrity::OTHER_PACKAGE])
        ->and(DeviceCheck::query()->sole()->reason)->toBe('package');
});

it('is unavailable, and stores nothing, when Google cannot be asked', function (Closure $break) {
    $break($this->google);
    $challenge = ($this->challenge)();

    ($this->check)($challenge, $this->google->token($challenge))
        ->assertOk()
        ->assertExactJson(['verdict' => 'unavailable', 'validUntil' => '2026-09-24T12:30:00.000Z', 'enforced' => false]);

    expect(DeviceCheck::query()->count())->toBe(0);
})->with([
    'Google errs' => [fn (FakePlayIntegrity $google) => $google->decodeAnswers(503)],
    'Google does not answer' => [fn (FakePlayIntegrity $google) => $google->decodeAnswers(fn () => Http::failedConnection())],
    'over quota' => [fn (FakePlayIntegrity $google) => $google->decodeAnswers(429)],
    'our project may not decode' => [fn (FakePlayIntegrity $google) => $google->decodeAnswers(403)],
    'no access token' => [fn (FakePlayIntegrity $google) => $google->tokenAnswers(400)],
    'the token endpoint errs' => [fn (FakePlayIntegrity $google) => $google->tokenAnswers(500)],
    'the token endpoint does not answer' => [fn (FakePlayIntegrity $google) => $google->tokenAnswers(fn () => Http::failedConnection())],
    'no credentials' => [fn () => config(['quezby.integrity.android.credentials' => null])],
    'credentials that are not there' => [fn () => config(['quezby.integrity.android.credentials' => 'storage/app/private/missing.json'])],
    'credentials that are not a key file' => [fn () => config(['quezby.integrity.android.credentials' => 'composer.json'])],
    'no apps' => [fn () => config(['quezby.integrity.android.packages' => []])],
]);

it('refuses what is not a token, without asking Google', function (string $token) {
    $challenge = ($this->challenge)();

    $this->assertApiError(($this->check)($challenge, $token), 422, 'integrity_invalid');

    expect($this->google->decodeRequests)->toBe([])
        ->and(app(DeviceChallenges::class)->consume($this->player, $challenge))->toBeTrue('the challenge is still good');
})->with([
    'words' => ['not a token'],
    'json' => ['{"requestHash":"x"}'],
    'a newline' => ["abc\ndef"],
]);

it('refuses a token Google cannot read for any of our apps', function () {
    $this->google->strictPackages = true;
    $challenge = ($this->challenge)();

    $this->assertApiError(($this->check)($challenge, 'eyJhbGciOiJBMjU2S1cifQ.garbage.token'), 422, 'integrity_invalid');

    expect(array_column($this->google->decodeRequests, 'package'))->toBe([FakePlayIntegrity::PACKAGE, FakePlayIntegrity::OTHER_PACKAGE])
        ->and(DeviceCheck::query()->count())->toBe(0);
});

it('takes a challenge once, from its own player, while it lasts', function () {
    $challenge = ($this->challenge)();
    $token = $this->google->token($challenge);
    ($this->check)($challenge, $token)->assertOk();

    $this->assertApiError(($this->check)($challenge, $token), 422, 'challenge_invalid');
    $this->assertApiError(($this->check)('never-issued', $this->google->token('never-issued')), 422, 'challenge_invalid');

    $theirs = ($this->challenge)(User::factory()->withUsername()->create());
    $this->assertApiError(($this->check)($theirs, $this->google->token($theirs)), 422, 'challenge_invalid');

    $late = ($this->challenge)();
    $this->travel(301)->seconds();
    $this->assertApiError(($this->check)($late, $this->google->token($late)), 422, 'challenge_invalid');

    expect(DeviceCheck::query()->count())->toBe(1)
        ->and($this->google->decodeRequests)->toHaveCount(1);
});

it('checks nothing with devices off', function () {
    config(['quezby.integrity.mode' => 'off']);
    $challenge = ($this->challenge)();

    ($this->check)($challenge, $this->google->token($challenge))->assertExactJson(['verdict' => 'unavailable', 'validUntil' => '2026-09-24T12:30:00.000Z', 'enforced' => false]);

    expect($this->google->decodeRequests)->toBe([])
        ->and($this->google->tokenRequests)->toBe([])
        ->and(DeviceCheck::query()->count())->toBe(0);
    $this->assertApiError(($this->check)($challenge, $this->google->token($challenge)), 422, 'challenge_invalid');
});

it('validates the envelope', function (array $body, array $fields) {
    $this->assertApiError($this->postJson('/api/v1/device/android', $body), 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => $fields]]);
})->with([
    'nothing' => [[], ['challenge', 'token']],
    'numbers' => [['challenge' => 1, 'token' => 2], ['challenge', 'token']],
    'a huge token' => [['challenge' => 'c', 'token' => str_repeat('a', 32769)], ['token']],
]);

it('shares one budget of ten a minute with the iOS checks', function () {
    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/api/v1/device/android')->assertStatus(422);
        $this->postJson('/api/v1/device/ios/attest')->assertStatus(422);
    }

    $this->assertApiError($this->postJson('/api/v1/device/ios/assert'), 429, 'too_many_requests');
    $this->assertApiError($this->postJson('/api/v1/device/android'), 429, 'too_many_requests');
});

it('names the token endpoint Google documents', function () {
    expect(GoogleServiceAccount::TOKEN_URL)->toBe('https://oauth2.googleapis.com/token');
});
