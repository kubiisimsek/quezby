<?php

use App\Game\Checkpoint;

/*
| A checkpoint receipt: readable by anyone, made or changed only by the API.
*/

function receipts(string $appKey = 'base64:c2VjcmV0LWtleS1mb3ItdGhlLXRlc3RzLTEyMzQ1Njc4OTA='): Checkpoint
{
    return new Checkpoint($appKey);
}

it('opens what it signed', function () {
    $hash = hash('sha256', '1,412,0');
    $receipt = receipts()->sign('01JABCDEFGHJKMNPQRSTVWXYZ0', 1, $hash, 1790251247125);

    $opened = receipts()->open($receipt);

    expect($receipt)->toMatch('/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/')
        ->and($opened?->runId)->toBe('01JABCDEFGHJKMNPQRSTVWXYZ0')
        ->and($opened?->reel)->toBe(1)
        ->and($opened?->prefixHash)->toBe($hash)
        ->and($opened?->timeMs)->toBe(1790251247125);
    // Its payload is plain to read: nothing in it is secret.
    expect(json_decode((string) base64_decode(strtr(explode('.', $receipt)[0], '-_', '+/')), true))
        ->toBe(['r' => '01JABCDEFGHJKMNPQRSTVWXYZ0', 'n' => 1, 'h' => $hash, 't' => 1790251247125]);
});

it('refuses a receipt it did not sign, or that was changed', function (Closure $forge) {
    $receipt = receipts()->sign('01JABCDEFGHJKMNPQRSTVWXYZ0', 120, str_repeat('a', 64), 1790251247125);

    expect(receipts()->open($forge($receipt)))->toBeNull();
})->with([
    'signed with another app key' => [fn () => receipts('base64:b3RoZXIta2V5')->sign('01JABCDEFGHJKMNPQRSTVWXYZ0', 120, str_repeat('a', 64), 1790251247125)],
    'a later time' => [fn (string $receipt) => str_replace(
        explode('.', $receipt)[0],
        rtrim(strtr(base64_encode('{"r":"01JABCDEFGHJKMNPQRSTVWXYZ0","n":120,"h":"'.str_repeat('a', 64).'","t":1790251247126}'), '+/', '-_'), '='),
        $receipt,
    )],
    'no signature' => [fn (string $receipt) => explode('.', $receipt)[0]],
    'an empty signature' => [fn (string $receipt) => explode('.', $receipt)[0].'.'],
    'padded' => [fn (string $receipt) => $receipt.'='],
    'a third part' => [fn (string $receipt) => $receipt.'.x'],
    'nothing' => [fn () => ''],
]);

it('refuses a signed payload that is not a receipt', function (string $json) {
    $payload = rtrim(strtr(base64_encode($json), '+/', '-_'), '=');
    $key = hash_hmac('sha256', 'quezby-checkpoint', 'base64:c2VjcmV0LWtleS1mb3ItdGhlLXRlc3RzLTEyMzQ1Njc4OTA=', true);
    $signature = rtrim(strtr(base64_encode(hash_hmac('sha256', $payload, $key, true)), '+/', '-_'), '=');

    expect(receipts()->open("{$payload}.{$signature}"))->toBeNull();
})->with([
    'not JSON' => ['hello'],
    'a list' => ['[1,2,3]'],
    'a text reel' => ['{"r":"01J","n":"1","h":"x","t":1}'],
    'no time' => ['{"r":"01J","n":1,"h":"x"}'],
    'a fractional time' => ['{"r":"01J","n":1,"h":"x","t":1.5}'],
]);

it('will not sign without an app key', function () {
    expect(fn () => receipts('')->sign('01J', 1, str_repeat('a', 64), 1))->toThrow(RuntimeException::class, 'APP_KEY')
        ->and(fn () => (new Checkpoint(null))->open('a.b'))->toThrow(RuntimeException::class, 'APP_KEY');
});

it('is keyed by the app key the API runs with', function () {
    $receipt = app(Checkpoint::class)->sign('01JABCDEFGHJKMNPQRSTVWXYZ0', 1, str_repeat('a', 64), 1);

    expect(receipts((string) config('app.key'))->open($receipt))->not->toBeNull()
        ->and(receipts()->open($receipt))->toBeNull();
});
