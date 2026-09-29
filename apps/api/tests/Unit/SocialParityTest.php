<?php

use App\Enums\Phrase;

/*
| The phrases friends send and a profile photo's size are one list and one
| number on both sides: `App\Enums\Phrase` and `config/quezby.php` › `avatars`
| against `packages/config/fixtures/social.json`.
*/

it('knows exactly the phrases the app sends', function () {
    $fixture = sharedFixture('packages/config/fixtures/social.json');

    expect(array_map(fn (Phrase $phrase) => $phrase->value, Phrase::cases()))->toBe($fixture['phrases']);
});

it('keeps a photo to the size and weight the app squeezes it to', function () {
    $fixture = sharedFixture('packages/config/fixtures/social.json');

    expect(config('quezby.avatars.size'))->toBe($fixture['avatar']['size'])
        ->and(config('quezby.avatars.max_bytes'))->toBe($fixture['avatar']['maxBytes'])
        ->and(config('quezby.avatars.min_side'))->toBe($fixture['avatar']['minSide']);
});

it('opens the tray with greetings, then the game\'s banter', function () {
    expect(array_slice(array_map(fn (Phrase $phrase) => $phrase->value, Phrase::cases()), 0, 4))
        ->toBe(['hi', 'whats_up', 'gg', 'gg_wp'])
        ->and(Phrase::cases())->toHaveCount(24);
});

it('says every phrase in every language', function (string $locale) {
    app()->setLocale($locale);

    foreach (Phrase::cases() as $phrase) {
        expect($phrase->text())->not->toBe('phrases.'.$phrase->value)->not->toBe('');
    }
})->with(['tr', 'en', 'de', 'ar', 'fr', 'es']);
