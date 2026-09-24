<?php

use App\Services\DailySeed;

/*
| "Günün akışı" seeds: the same for everyone on a day, different every day
| and every season, unguessable without the server's secret.
*/

it('gives one day one seed', function () {
    config(['quezby.daily.secret' => 'test-secret']);
    $seeds = app(DailySeed::class);

    expect($seeds->for('2026-09-24', 2))->toBe($seeds->for('2026-09-24', 2))
        ->and($seeds->for('2026-09-24', 2))->toBeInt()->toBeGreaterThanOrEqual(1)->toBeLessThanOrEqual(4294967295);
});

it('changes with the day, the season and the secret', function () {
    config(['quezby.daily.secret' => 'test-secret']);
    $today = app(DailySeed::class)->for('2026-09-24', 2);

    expect(app(DailySeed::class)->for('2026-09-25', 2))->not->toBe($today)
        ->and(app(DailySeed::class)->for('2026-09-24', 3))->not->toBe($today);

    config(['quezby.daily.secret' => 'another-secret']);
    expect(app(DailySeed::class)->for('2026-09-24', 2))->not->toBe($today);
});

it('falls back to the app key when no secret is set', function () {
    config(['quezby.daily.secret' => null, 'app.key' => 'base64:'.base64_encode(str_repeat('k', 32))]);
    $withKey = app(DailySeed::class)->for('2026-09-24', 2);

    config(['quezby.daily.secret' => '']);
    expect(app(DailySeed::class)->for('2026-09-24', 2))->toBe($withKey);
});
