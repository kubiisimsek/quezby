<?php

use App\Game\Checkpoint;

/*
| A checkpoint commits to the SHA-256 of the moves so far, written as one
| line — the app hashes with `@quezby/config`'s `prefixHash`, the API with
| `App\Game\Checkpoint::prefixHash`. `packages/config/fixtures/checkpoints.json`
| holds what the TypeScript side computes; the PHP side must agree, and both
| must check in at the same marks.
*/

dataset('checkpoint prefixes', function () {
    foreach (sharedFixture('packages/config/fixtures/checkpoints.json')['prefixes'] as $case) {
        yield count($case['actions']).' moves, first '.$case['count'] => [$case];
    }
});

dataset('checkpoint hashes', function () {
    foreach (sharedFixture('packages/config/fixtures/checkpoints.json')['sha256'] as $case) {
        yield mb_substr($case['text'], 0, 24).' ('.strlen($case['text']).' bytes)' => [$case];
    }
});

it('hashes the moves so far exactly like the app', function (array $case) {
    expect(Checkpoint::prefixHash($case['actions'], $case['count']))->toBe($case['hash']);
})->with('checkpoint prefixes');

it('hashes text exactly like the app\'s SHA-256', function (array $case) {
    expect(hash('sha256', $case['text']))->toBe($case['hex']);
})->with('checkpoint hashes');

it('writes the moves as the app does', function () {
    $actions = [[1, 412, 0], [2, 530, 0], [3, 380, 690], [0, 0, 0]];

    expect(Checkpoint::prefixText($actions, 3))->toBe('1,412,0;2,530,0;3,380,690')
        ->and(Checkpoint::prefixText($actions, 0))->toBe('')
        ->and(Checkpoint::prefixText($actions, -1))->toBe('')
        ->and(Checkpoint::prefixText($actions, 99))->toBe('1,412,0;2,530,0;3,380,690;0,0,0');
});

it('checks in at the marks the app does', function () {
    $app = sharedFixture('packages/config/fixtures/checkpoints.json');

    expect(config('quezby.plausibility.checkpoints.marks_ms'))->toBe($app['marksMs'])
        ->and(config('quezby.plausibility.checkpoints.max_receipts'))->toBe($app['maxReceipts']);
});
