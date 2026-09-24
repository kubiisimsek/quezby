<?php

use App\Game\Rules;

/*
| The scoring system is locked: `packages/engine/rules.lock.json` holds the
| engine version, the hash of every rule and the hash of the fixtures both
| engines replay. The TypeScript suite checks the same file; this proves the
| PHP twin is the locked game. A change means a new season — see
| docs/product/scoring.md, "Kuralı değiştirmek".
*/

function engineLock(): array
{
    return sharedFixture('packages/engine/rules.lock.json');
}

it('runs the engine version the lock names', function () {
    expect(Rules::ENGINE_VERSION)->toBe(engineLock()['engineVersion'])
        ->and(config('quezby.engine_version'))->toBe(engineLock()['engineVersion']);
});

it('hashes its rules to the locked hash', function () {
    expect(hash('sha256', Rules::canonicalJson(Rules::toArray())))->toBe(engineLock()['rulesSha256']);
});

it('is tested against the locked fixtures', function () {
    $behaviour = Rules::canonicalJson([
        'bonuses' => engineFixture('bonuses.json'),
        'curves' => engineFixture('curves.json'),
        'rejects' => engineFixture('rejects.json'),
        'replays' => engineFixture('replays.json'),
    ]);

    expect(hash('sha256', $behaviour))->toBe(engineLock()['behaviourSha256']);
});

it('writes canonical JSON the way the TypeScript lock does', function () {
    expect(Rules::canonicalJson(['b' => 1, 'a' => [3, ['d' => 'x', 'c' => true]]]))
        ->toBe('{"a":[3,{"c":true,"d":"x"}],"b":1}')
        ->and(Rules::canonicalJson([400.5, -1, 'a/b', 'ş']))->toBe('[400.5,-1,"a/b","ş"]');
});

it('keeps a history that only moves forward', function () {
    $versions = array_column(engineLock()['history'], 'engineVersion');

    expect($versions)->toBe(array_values(array_unique($versions)))
        ->and(end($versions))->toBe(Rules::ENGINE_VERSION);
    $sorted = $versions;
    sort($sorted);
    expect($versions)->toBe($sorted);
});
