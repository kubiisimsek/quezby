<?php

use App\Support\AppKey;

it('reads APP_KEY the way Laravel does, only stricter about base64', function (mixed $key, ?string $problem) {
    expect(AppKey::check($key, 'aes-256-cbc'))->toBe($problem);
})->with([
    'what key:generate prints' => ['base64:'.base64_encode(str_repeat('k', 32)), null],
    'a raw 32-byte key' => [str_repeat('k', 32), null],
    'empty' => ['', 'missing'],
    'blank' => ['   ', 'missing'],
    'unset' => [null, 'missing'],
    'not base64' => ['base64:%%%', 'malformed'],
    'too short' => ['base64:'.base64_encode(str_repeat('k', 16)), 'malformed'],
    'too long' => [str_repeat('k', 33), 'malformed'],
]);

it('looks at the key the API runs with', function () {
    expect(AppKey::problem())->toBeNull();

    config(['app.key' => '']);

    expect(AppKey::problem())->toBe('missing');
});
