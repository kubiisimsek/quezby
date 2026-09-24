<?php

/*
| The fixtures the TypeScript engine wrote (`pnpm engine:fixtures`), one case
| per fixture. Each case passes the whole fixture as a single argument.
*/

dataset('engine replays', function () {
    foreach (engineFixture('replays.json') as $fixture) {
        yield $fixture['name'] => [$fixture];
    }
});

dataset('engine rejects', function () {
    foreach (engineFixture('rejects.json') as $fixture) {
        yield $fixture['name'] => [$fixture];
    }
});

dataset('engine bonuses', function () {
    foreach (engineFixture('bonuses.json') as $fixture) {
        yield $fixture['name'] => [$fixture];
    }
});

dataset('curve reels', function () {
    foreach (engineFixture('curves.json')['reels'] as $reel) {
        yield 'reel '.$reel['n'] => [$reel];
    }
});

dataset('rng sequences', function () {
    foreach (engineFixture('curves.json')['rng'] as $sequence) {
        yield 'seed '.$sequence['seed'] => [$sequence];
    }
});

/*
| Times a log may not carry: anything but a whole millisecond the clock allows.
*/

dataset('not whole numbers', [
    'numeric string' => ['400'],
    'boolean' => [true],
    'null' => [null],
    'fraction' => [399.999],
    'too long' => [60001],
    'array' => [[400]],
]);
