<?php

use App\Models\AppAttestKey;
use App\Models\DeviceCheck;
use App\Models\User;
use App\Services\Integrity\AppAttestVerifier;
use App\Services\Integrity\DeviceChallenges;
use Tests\Support\CborWriter;
use Tests\Support\FakeAppAttest;

/*
| `POST /device/ios/attest` and `/device/ios/assert`: App Attest, checked the
| way Apple lays it out, against a whole chain made at test time — a root the
| API pins, an intermediate, and a credential certificate carrying the nonce.
*/

beforeEach(function () {
    $this->player = $this->signIn();
    $this->apple = FakeAppAttest::install();
    $this->challenge = fn (?User $for = null) => app(DeviceChallenges::class)->issue($for ?? $this->player)['challenge'];
    $this->attest = fn (string $challenge, string $keyId, string $attestation) => $this->postJson('/api/v1/device/ios/attest', [
        'challenge' => $challenge,
        'keyId' => $keyId,
        'attestation' => $attestation,
    ]);
    $this->assert = fn (string $challenge, string $keyId, string $assertion) => $this->postJson('/api/v1/device/ios/assert', [
        'challenge' => $challenge,
        'keyId' => $keyId,
        'assertion' => $assertion,
    ]);
    // A key attested through the API, as the app does on its first check.
    $this->attested = function () {
        $key = $this->apple->newKey();
        $challenge = ($this->challenge)();
        ($this->attest)($challenge, $this->apple->keyId($key), $this->apple->attestation($challenge, $key))->assertJsonPath('verdict', 'pass');

        return $key;
    };
});

describe('attestation', function () {
    it('passes a key Apple vouches for, and keeps it', function () {
        $this->freezeTime();
        $key = $this->apple->newKey();
        $challenge = ($this->challenge)();

        ($this->attest)($challenge, $this->apple->keyId($key), $this->apple->attestation($challenge, $key))
            ->assertOk()
            ->assertExactJson(['verdict' => 'pass', 'validUntil' => now()->addHours(6)->utc()->format('Y-m-d\TH:i:s.v\Z'), 'enforced' => false]);

        $stored = AppAttestKey::query()->sole();
        expect($stored->user_id)->toBe($this->player->id)
            ->and($stored->key_id)->toBe($this->apple->keyId($key))
            ->and($stored->public_key)->toBe($this->apple->publicPem($key))
            ->and($stored->counter)->toBe(0)
            ->and($stored->environment)->toBe('production')
            ->and(base64_decode((string) $stored->receipt))->toStartWith('apple-receipt-')
            ->and($stored->last_used_at)->toBeNull();
        $check = DeviceCheck::query()->sole();
        expect($check->platform->value)->toBe('ios')
            ->and($check->verdict->value)->toBe('pass')
            ->and($check->details)->toBe(['keyId' => $this->apple->keyId($key), 'environment' => 'production']);
    });

    it('fails, and keeps nothing, what Apple would not have signed', function (array $bend, string $reason) {
        $key = $this->apple->newKey();
        $challenge = ($this->challenge)();

        ($this->attest)($challenge, $this->apple->keyId($key), $this->apple->attestation($challenge, $key, $bend))
            ->assertOk()
            ->assertJsonPath('verdict', 'fail');

        expect(DeviceCheck::query()->sole()->reason)->toBe($reason)
            ->and(AppAttestKey::query()->count())->toBe(0);
    })->with([
        'another format' => [['fmt' => 'packed'], 'format'],
        'a chain to another root' => [['ca' => 'rogue'], 'chain'],
        'a nonce over another challenge' => [['nonceOver' => 'another challenge'], 'nonce'],
        'another team' => [['appId' => 'OTHERTEAM1.'.FakeAppAttest::BUNDLE_ID], 'app_id'],
        'an app that is not ours' => [['appId' => FakeAppAttest::TEAM_ID.'.com.example.cheat'], 'app_id'],
        'a counter past zero' => [['counter' => 1], 'counter'],
        'a development key where only production counts' => [['aaguid' => AppAttestVerifier::ENVIRONMENTS['development']], 'environment'],
        'no known environment' => [['aaguid' => str_repeat("\0", 16)], 'environment'],
        'a credential id that is not the key' => [['credentialId' => str_repeat('k', 32)], 'credential_id'],
    ]);

    it('fails a key id that is not the certified key', function () {
        $key = $this->apple->newKey();
        $challenge = ($this->challenge)();

        ($this->attest)($challenge, $this->apple->keyId($this->apple->newKey()), $this->apple->attestation($challenge, $key))
            ->assertJsonPath('verdict', 'fail');

        expect(DeviceCheck::query()->sole()->reason)->toBe('key_id');
    });

    it('fails a credential certificate that has run out', function () {
        $key = $this->apple->newKey();
        $this->travel(2)->days();
        $challenge = ($this->challenge)();

        ($this->attest)($challenge, $this->apple->keyId($key), $this->apple->attestation($challenge, $key, ['days' => 1]))
            ->assertJsonPath('verdict', 'fail');

        expect(DeviceCheck::query()->sole()->reason)->toBe('chain');
    });

    it('says whether a fail costs the player anything', function (string $mode, bool $enforced, array $bend, string $verdict) {
        config(['quezby.integrity.mode' => $mode]);
        $key = $this->apple->newKey();
        $challenge = ($this->challenge)();

        ($this->attest)($challenge, $this->apple->keyId($key), $this->apple->attestation($challenge, $key, $bend))
            ->assertOk()
            ->assertJsonPath('verdict', $verdict)
            ->assertJsonPath('enforced', $enforced);
    })->with([
        'enforced, a pass' => ['enforce', true, [], 'pass'],
        'enforced, a fail' => ['enforce', true, ['counter' => 1], 'fail'],
        'logged, a pass' => ['log', false, [], 'pass'],
        'logged, a fail' => ['log', false, ['counter' => 1], 'fail'],
        'off' => ['off', false, [], 'unavailable'],
    ]);

    it('takes development keys where the config allows them', function () {
        config(['quezby.integrity.ios.environments' => ['development', 'production']]);
        $key = $this->apple->newKey();
        $challenge = ($this->challenge)();

        ($this->attest)($challenge, $this->apple->keyId($key), $this->apple->attestation($challenge, $key, [
            'aaguid' => AppAttestVerifier::ENVIRONMENTS['development'],
            'appId' => FakeAppAttest::TEAM_ID.'.'.FakeAppAttest::BUNDLE_ID.'.staging',
        ]))->assertJsonPath('verdict', 'pass');

        expect(AppAttestKey::query()->sole()->environment)->toBe('development');
    });

    it('takes a key id in URL-safe base64 too', function () {
        $key = $this->apple->newKey();
        $challenge = ($this->challenge)();

        ($this->attest)($challenge, rtrim(strtr($this->apple->keyId($key), '+/', '-_'), '='), $this->apple->attestation($challenge, $key))
            ->assertJsonPath('verdict', 'pass');

        expect(AppAttestKey::query()->sole()->key_id)->toBe($this->apple->keyId($key));
    });

    it('fails a key attested before: Apple attests a key once', function () {
        $key = ($this->attested)();
        $challenge = ($this->challenge)();

        ($this->attest)($challenge, $this->apple->keyId($key), $this->apple->attestation($challenge, $key))
            ->assertJsonPath('verdict', 'fail');

        expect(DeviceCheck::query()->latest('id')->first()->reason)->toBe('key_reused')
            ->and(AppAttestKey::query()->count())->toBe(1);
    });

    it('refuses what is not an attestation, and leaves the challenge unused', function (Closure $attestation) {
        $key = $this->apple->newKey();
        $challenge = ($this->challenge)();

        $this->assertApiError(($this->attest)($challenge, $this->apple->keyId($key), $attestation($this->apple, $challenge, $key)), 422, 'integrity_invalid');

        expect(DeviceCheck::query()->count())->toBe(0)
            ->and(app(DeviceChallenges::class)->consume($this->player, $challenge))->toBeTrue();
    })->with([
        'not base64' => [fn () => '%%% not base64 %%%'],
        'not CBOR' => [fn () => base64_encode('hello, this is not CBOR')],
        'not a map' => [fn () => base64_encode(CborWriter::encode([1, 2, 3]))],
        'no certificates' => [fn () => base64_encode(CborWriter::encode(['fmt' => 'apple-appattest', 'attStmt' => [], 'authData' => CborWriter::bytes(str_repeat("\0", 60))]))],
        'one certificate' => [fn ($apple, $challenge, $key) => base64_encode(CborWriter::encode(
            ['fmt' => 'apple-appattest', 'attStmt' => ['x5c' => [CborWriter::bytes('x')]], 'authData' => CborWriter::bytes(str_repeat("\0", 60))],
        ))],
        'certificates that are not' => [fn () => base64_encode(CborWriter::encode(
            ['fmt' => 'apple-appattest', 'attStmt' => ['x5c' => [CborWriter::bytes('junk'), CborWriter::bytes('junk')]], 'authData' => CborWriter::bytes(str_repeat("\0", 60))],
        ))],
        'authenticator data cut short' => [fn ($apple, $challenge, $key) => (function () use ($apple, $challenge, $key) {
            $object = AppAttestVerifier::readAttestation($apple->attestation($challenge, $key));

            return base64_encode(CborWriter::encode([
                'fmt' => 'apple-appattest',
                'attStmt' => ['x5c' => array_map(CborWriter::bytes(...), $object->certificates)],
                'authData' => CborWriter::bytes(substr($object->authData, 0, 54)),
            ]));
        })()],
    ]);

    it('refuses a key id that is not one', function (string $keyId) {
        $key = $this->apple->newKey();
        $challenge = ($this->challenge)();

        $this->assertApiError(($this->attest)($challenge, $keyId, $this->apple->attestation($challenge, $key)), 422, 'integrity_invalid');
    })->with([
        'not base64' => ['%%%'],
        'too short' => [base64_encode(str_repeat('k', 31))],
        'too long' => [base64_encode(str_repeat('k', 33))],
    ]);

    it('takes a challenge once, from its own player, while it lasts', function () {
        $key = $this->apple->newKey();
        $challenge = ($this->challenge)();
        ($this->attest)($challenge, $this->apple->keyId($key), $this->apple->attestation($challenge, $key))->assertOk();

        $again = $this->apple->newKey();
        $this->assertApiError(($this->attest)($challenge, $this->apple->keyId($again), $this->apple->attestation($challenge, $again)), 422, 'challenge_invalid');

        $theirs = ($this->challenge)(User::factory()->withUsername()->create());
        $this->assertApiError(($this->attest)($theirs, $this->apple->keyId($again), $this->apple->attestation($theirs, $again)), 422, 'challenge_invalid');

        $late = ($this->challenge)();
        $this->travel(301)->seconds();
        $this->assertApiError(($this->attest)($late, $this->apple->keyId($again), $this->apple->attestation($late, $again)), 422, 'challenge_invalid');

        expect(AppAttestKey::query()->count())->toBe(1);
    });

    it('is unavailable without a team to check the App ID against', function () {
        config(['quezby.social.apple.team_id' => null]);
        $key = $this->apple->newKey();
        $challenge = ($this->challenge)();

        ($this->attest)($challenge, $this->apple->keyId($key), $this->apple->attestation($challenge, $key))
            ->assertOk()
            ->assertJsonPath('verdict', 'unavailable');

        expect(DeviceCheck::query()->count())->toBe(0)
            ->and(AppAttestKey::query()->count())->toBe(0);
    });

    it('is unavailable without the root certificate', function () {
        config(['quezby.integrity.ios.root_ca' => 'resources/certs/missing.pem']);
        $key = $this->apple->newKey();
        $challenge = ($this->challenge)();

        ($this->attest)($challenge, $this->apple->keyId($key), $this->apple->attestation($challenge, $key))
            ->assertJsonPath('verdict', 'unavailable');
    });

    it('checks nothing with devices off', function () {
        config(['quezby.integrity.mode' => 'off']);
        $key = $this->apple->newKey();
        $challenge = ($this->challenge)();

        ($this->attest)($challenge, $this->apple->keyId($key), $this->apple->attestation($challenge, $key))
            ->assertJsonPath('verdict', 'unavailable');

        expect(AppAttestKey::query()->count())->toBe(0);
    });

    it('validates the envelope', function (array $body, array $fields) {
        $this->assertApiError($this->postJson('/api/v1/device/ios/attest', $body), 422, 'validation_failed')
            ->assertJsonStructure(['error' => ['fields' => $fields]]);
    })->with([
        'nothing' => [[], ['challenge', 'keyId', 'attestation']],
        'a huge attestation' => [['challenge' => 'c', 'keyId' => 'k', 'attestation' => str_repeat('a', 65537)], ['attestation']],
    ]);
});

describe('assertion', function () {
    it('passes an assertion by an attested key, and moves its counter on', function () {
        $key = ($this->attested)();
        $this->travel(7)->hours();
        $challenge = ($this->challenge)();

        ($this->assert)($challenge, $this->apple->keyId($key), $this->apple->assertion($challenge, $key, 1))
            ->assertOk()
            ->assertExactJson(['verdict' => 'pass', 'validUntil' => now()->addHours(6)->utc()->format('Y-m-d\TH:i:s.v\Z'), 'enforced' => false]);

        $stored = AppAttestKey::query()->sole();
        expect($stored->counter)->toBe(1)
            ->and($stored->last_used_at?->timestamp)->toBe(now()->timestamp);
        expect(DeviceCheck::query()->latest('id')->first()->details)->toBe(['keyId' => $this->apple->keyId($key), 'counter' => 1]);

        $next = ($this->challenge)();
        ($this->assert)($next, $this->apple->keyId($key), $this->apple->assertion($next, $key, 5))->assertJsonPath('verdict', 'pass');
        expect(AppAttestKey::query()->sole()->counter)->toBe(5);
    });

    it('says whether a fail costs the player anything', function (string $mode, bool $enforced, int $counter, string $verdict) {
        $key = ($this->attested)();
        config(['quezby.integrity.mode' => $mode]);
        $challenge = ($this->challenge)();

        ($this->assert)($challenge, $this->apple->keyId($key), $this->apple->assertion($challenge, $key, $counter))
            ->assertOk()
            ->assertJsonPath('verdict', $verdict)
            ->assertJsonPath('enforced', $enforced);
    })->with([
        'enforced, a pass' => ['enforce', true, 1, 'pass'],
        'enforced, a fail' => ['enforce', true, 0, 'fail'],
        'logged, a pass' => ['log', false, 1, 'pass'],
        'logged, a fail' => ['log', false, 0, 'fail'],
        'off' => ['off', false, 1, 'unavailable'],
    ]);

    it('fails a counter that did not go up', function (int $counter) {
        $key = ($this->attested)();
        $challenge = ($this->challenge)();
        ($this->assert)($challenge, $this->apple->keyId($key), $this->apple->assertion($challenge, $key, 3))->assertJsonPath('verdict', 'pass');

        $replay = ($this->challenge)();
        ($this->assert)($replay, $this->apple->keyId($key), $this->apple->assertion($replay, $key, $counter))->assertJsonPath('verdict', 'fail');

        expect(DeviceCheck::query()->latest('id')->first()->reason)->toBe('counter')
            ->and(AppAttestKey::query()->sole()->counter)->toBe(3);
    })->with(['the same' => [3], 'lower' => [2], 'zero' => [0]]);

    it('fails a signature that is not the key\'s over this challenge', function (Closure $bend) {
        $key = ($this->attested)();
        $challenge = ($this->challenge)();

        ($this->assert)($challenge, $this->apple->keyId($key), $this->apple->assertion($challenge, $key, 1, $bend($this->apple)))
            ->assertJsonPath('verdict', 'fail');

        expect(DeviceCheck::query()->latest('id')->first()->reason)->toBe('signature')
            ->and(AppAttestKey::query()->sole()->counter)->toBe(0);
    })->with([
        'signed by another key' => [fn (FakeAppAttest $apple) => ['signWith' => $apple->newKey()]],
        'over another challenge' => [fn () => ['signedChallenge' => 'another challenge']],
    ]);

    it('fails an assertion for an app that is not ours', function () {
        $key = ($this->attested)();
        $challenge = ($this->challenge)();

        ($this->assert)($challenge, $this->apple->keyId($key), $this->apple->assertion($challenge, $key, 1, ['appId' => FakeAppAttest::TEAM_ID.'.com.example.cheat']))
            ->assertJsonPath('verdict', 'fail');

        expect(DeviceCheck::query()->latest('id')->first()->reason)->toBe('app_id');
    });

    it('does not know a key it never attested, and keeps the challenge for attesting one', function () {
        $key = $this->apple->newKey();
        $challenge = ($this->challenge)();

        $this->assertApiError(($this->assert)($challenge, $this->apple->keyId($key), $this->apple->assertion($challenge, $key, 1)), 409, 'attest_key_unknown');

        ($this->attest)($challenge, $this->apple->keyId($key), $this->apple->attestation($challenge, $key))->assertJsonPath('verdict', 'pass');
    });

    it("does not know another player's key", function () {
        $key = ($this->attested)();
        $this->signIn();
        $challenge = app(DeviceChallenges::class)->issue(auth()->user())['challenge'];

        $this->assertApiError(($this->assert)($challenge, $this->apple->keyId($key), $this->apple->assertion($challenge, $key, 1)), 409, 'attest_key_unknown');
    });

    it('refuses what is not an assertion', function (Closure $assertion) {
        $key = ($this->attested)();
        $challenge = ($this->challenge)();

        $this->assertApiError(($this->assert)($challenge, $this->apple->keyId($key), $assertion()), 422, 'integrity_invalid');
        expect(app(DeviceChallenges::class)->consume($this->player, $challenge))->toBeTrue();
    })->with([
        'not base64' => [fn () => '%%%'],
        'not CBOR' => [fn () => base64_encode("\xFF\xFF")],
        'no signature' => [fn () => base64_encode(CborWriter::encode(['authenticatorData' => CborWriter::bytes(str_repeat("\0", 37))]))],
        'authenticator data cut short' => [fn () => base64_encode(CborWriter::encode([
            'signature' => CborWriter::bytes('sig'),
            'authenticatorData' => CborWriter::bytes(str_repeat("\0", 36)),
        ]))],
    ]);

    it('takes a challenge once', function () {
        $key = ($this->attested)();
        $challenge = ($this->challenge)();
        ($this->assert)($challenge, $this->apple->keyId($key), $this->apple->assertion($challenge, $key, 1))->assertJsonPath('verdict', 'pass');

        $this->assertApiError(($this->assert)($challenge, $this->apple->keyId($key), $this->apple->assertion($challenge, $key, 2)), 422, 'challenge_invalid');
        expect(AppAttestKey::query()->sole()->counter)->toBe(1);
    });

    it('is unavailable without a team to check the App ID against', function () {
        $key = ($this->attested)();
        config(['quezby.social.apple.team_id' => '']);
        $challenge = ($this->challenge)();

        ($this->assert)($challenge, $this->apple->keyId($key), $this->apple->assertion($challenge, $key, 1))
            ->assertJsonPath('verdict', 'unavailable');

        expect(AppAttestKey::query()->sole()->counter)->toBe(0);
    });

    it('validates the envelope', function (array $body, array $fields) {
        $this->assertApiError($this->postJson('/api/v1/device/ios/assert', $body), 422, 'validation_failed')
            ->assertJsonStructure(['error' => ['fields' => $fields]]);
    })->with([
        'nothing' => [[], ['challenge', 'keyId', 'assertion']],
        'numbers' => [['challenge' => 1, 'keyId' => 2, 'assertion' => 3], ['challenge', 'keyId', 'assertion']],
        'a long challenge' => [['challenge' => str_repeat('c', 129), 'keyId' => 'k', 'assertion' => 'a'], ['challenge']],
        'a huge assertion' => [['challenge' => 'c', 'keyId' => 'k', 'assertion' => str_repeat('a', 8193)], ['assertion']],
    ]);

    it('checks nothing with devices off, not even the key', function () {
        config(['quezby.integrity.mode' => 'off']);
        $key = $this->apple->newKey();
        $challenge = ($this->challenge)();

        ($this->assert)($challenge, $this->apple->keyId($key), $this->apple->assertion($challenge, $key, 1))
            ->assertJsonPath('verdict', 'unavailable');
    });
});

it('reads the nonce Apple puts in a credential certificate', function () {
    $key = $this->apple->newKey();
    $object = AppAttestVerifier::readAttestation($this->apple->attestation('challenge', $key));

    expect(AppAttestVerifier::nonceOf($object->certificates[0]))->toBe(hash('sha256', $object->authData.hash('sha256', 'challenge', true), true))
        ->and(AppAttestVerifier::nonceOf($object->certificates[1]))->toBeNull('the intermediate has none')
        ->and(AppAttestVerifier::nonceOf('not DER'))->toBeNull();
});

it('forgets the keys and verdicts with the account', function () {
    ($this->attested)();

    $this->player->delete();

    expect(AppAttestKey::query()->count())->toBe(0)
        ->and(DeviceCheck::query()->count())->toBe(0);
});
