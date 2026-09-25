<?php

use App\Enums\RunFlag;

/*
| `RunFlag` is every code the API writes on a run, and the admin contract's
| `RunFlagCode` — three lists that are one.
*/

it('names every flag the API writes on a run', function () {
    $written = [];
    $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(dirname(__DIR__, 2).'/app'));
    foreach ($files as $file) {
        if ($file->isFile() && $file->getExtension() === 'php') {
            preg_match_all("/'code' => '([a-z_]+)'/", (string) file_get_contents($file->getPathname()), $matches);
            $written = [...$written, ...$matches[1]];
        }
    }

    expect(collect($written)->unique()->sort()->values()->all())
        ->toBe(collect(RunFlag::cases())->map->value->sort()->values()->all());
});

it('names the same codes as the admin contract', function () {
    $types = (string) file_get_contents(dirname(__DIR__, 4).'/packages/types/src/admin.ts');
    preg_match('/export type RunFlagCode =(.*?);/s', $types, $union);
    preg_match_all("/'([a-z_]+)'/", $union[1] ?? '', $codes);

    expect(collect($codes[1])->sort()->values()->all())->not->toBeEmpty()
        ->toBe(collect(RunFlag::cases())->map->value->sort()->values()->all());
});

it('writes the codes of a run once each, between commas', function (mixed $flags, ?string $codes) {
    expect(RunFlag::codesOf($flags))->toBe($codes);
})->with([
    'none' => [null, null],
    'an empty list' => [[], null],
    'one' => [[['code' => 'wall_clock', 'severity' => 'hard']], ',wall_clock,'],
    'twice and another' => [[['code' => 'reaction_cv'], ['code' => 'wall_clock'], ['code' => 'reaction_cv']], ',reaction_cv,wall_clock,'],
    'as JSON' => ['[{"code":"moderator","reason":"Bot"}]', ',moderator,'],
    'junk' => [[['severity' => 'hard'], 'x', ['code' => '']], null],
]);

it('weighs the surest signals heaviest, and a ban not at all', function () {
    expect(RunFlag::CheckpointForged->weight())->toBeGreaterThan(RunFlag::WallClock->weight())
        ->and(RunFlag::WallClock->weight())->toBeGreaterThan(RunFlag::ReactionCv->weight())
        ->and(RunFlag::Banned->weight())->toBe(0)
        ->and(RunFlag::SlowTiming->severity())->toBe('soft')
        ->and(RunFlag::DeviceIntegrity->severity())->toBe('hard');
});

it('matches a code exactly, underscores and all', function () {
    expect(RunFlag::SlowTiming->pattern())->toBe('%,slow!_timing,%');
});
