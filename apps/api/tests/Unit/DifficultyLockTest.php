<?php

use App\Game\Difficulty;
use App\Game\Rules;

/*
| Dereceli's difficulty table is sealed apart from the rules:
| `packages/engine/difficulty.lock.json` holds its version, the hash of every
| row and the hash of the fixtures both engines replay at it. A change is a
| new difficulty version and new Elo targets, never a new season — see
| docs/product/scoring.md, "Dereceli zorluğu".
*/

function difficultyLock(): array
{
    return sharedFixture('packages/engine/difficulty.lock.json');
}

it('runs the difficulty version the lock names, on the locked engine', function () {
    expect(Difficulty::VERSION)->toBe(difficultyLock()['difficultyVersion'])
        ->and(Rules::ENGINE_VERSION)->toBe(difficultyLock()['engineVersion']);
});

it('hashes its table to the locked hash', function () {
    expect(hash('sha256', Rules::canonicalJson(Difficulty::table())))->toBe(difficultyLock()['tableSha256']);
});

it('is tested against the locked fixtures', function () {
    expect(hash('sha256', Rules::canonicalJson(engineFixture('difficulty.json'))))->toBe(difficultyLock()['behaviourSha256']);
});

it('keeps a history that only moves forward', function () {
    $versions = array_column(difficultyLock()['history'], 'difficultyVersion');
    $sorted = $versions;
    sort($sorted);

    expect($versions)->toBe($sorted)
        ->and($versions)->toBe(array_values(array_unique($versions)))
        ->and(end($versions))->toBe(Difficulty::VERSION);
});
