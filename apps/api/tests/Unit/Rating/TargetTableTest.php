<?php

use App\Game\Difficulty;
use App\Game\Rules;
use App\Models\Run;
use App\Services\Rating\TargetTable;

/*
| The target a run plays against: the score a player of a rating typically
| makes, geometric between the anchors of `quezby.rating.targets`.
*/

function targets(): TargetTable
{
    return TargetTable::forEngine(Rules::ENGINE_VERSION) ?? throw new RuntimeException('No target table for this season.');
}

test('this season has a target table, rising with the rating', function () {
    $anchors = config('quezby.rating.targets.'.Rules::ENGINE_VERSION);

    expect($anchors)->toBeArray()->toHaveKey(0)->toHaveKey(5000);
    $ratings = array_keys($anchors);
    $scores = array_values($anchors);
    foreach (range(1, count($anchors) - 1) as $i) {
        expect($ratings[$i])->toBeGreaterThan($ratings[$i - 1])
            ->and($scores[$i])->toBeGreaterThan($scores[$i - 1]);
    }
});

test('an older season keeps its table, for runs approved late', function () {
    expect(TargetTable::forEngine(2)?->target(1000))->toEqualWithDelta(34000, 0.01);
});

test('a season without a table has none — its runs cannot be rated', function () {
    expect(TargetTable::forEngine(Rules::ENGINE_VERSION + 1))->toBeNull();
});

test('the target is each anchor\'s score, geometric in between and past the ends', function () {
    $table = targets();

    expect($table->target(1000))->toEqualWithDelta(33100, 0.01)
        ->and($table->target(2000))->toEqualWithDelta(109000, 0.01)
        ->and($table->target(1500))->toEqualWithDelta(sqrt(33100 * 109000), 0.01)
        ->and($table->target(6500))->toBeGreaterThan(1156200.0)
        ->and($table->shown(1500))->toBe(60100)
        ->and($table->shown(2000))->toBe(109000)
        ->and($table->shown(0))->toBe(8000);
});

test('performance is the rating whose typical score a score is', function () {
    $table = targets();

    expect($table->performance(33100))->toBe(1000)
        ->and($table->performance(109000))->toBe(2000)
        ->and($table->performance(1156200))->toBe(6000)
        ->and($table->performance(4000))->toBeLessThan(0)
        ->and($table->performance(2000000))->toBeGreaterThan(6000)
        ->and($table->performance(0))->toBeNull();
    foreach ([900, 1500, 2750, 4321, 5555] as $rating) {
        expect($table->performance((int) round($table->target($rating))))->toBe($rating);
    }
});

test('the median of placement is the middle score, the lower one of an even count', function () {
    expect(TargetTable::median([50000, 10000, 30000, 20000, 40000]))->toBe(30000)
        ->and(TargetTable::median([4, 1, 3, 2]))->toBe(2)
        ->and(TargetTable::median([7]))->toBe(7);
});

test('this difficulty table has its targets, rising with the rating and below difficulty 0\'s from 1000 up', function () {
    $anchors = config('quezby.rating.difficulty.targets.'.Rules::ENGINE_VERSION.'.'.Difficulty::VERSION);
    $plain = targets();
    $hard = TargetTable::forDifficulty(Rules::ENGINE_VERSION, Difficulty::VERSION);

    expect($anchors)->toBeArray()->toHaveKey(0)->toHaveKey(5000)
        ->and($hard)->not->toBeNull()
        ->and($hard->target(0))->toEqualWithDelta($plain->target(0), 0.01);
    $scores = array_values($anchors);
    foreach (range(1, count($scores) - 1) as $i) {
        expect($scores[$i])->toBeGreaterThan($scores[$i - 1]);
    }
    foreach ([1000, 2000, 3000, 4000, 5000] as $rating) {
        expect($hard->target($rating))->toBeLessThan($plain->target($rating));
    }
});

test('a difficulty table without targets has none', function () {
    expect(TargetTable::forDifficulty(Rules::ENGINE_VERSION, Difficulty::VERSION + 1))->toBeNull()
        ->and(TargetTable::forDifficulty(2, Difficulty::VERSION))->toBeNull();
});

test('a rated run is measured with its difficulty table, one from before it with its engine\'s', function () {
    $played = new Run(['engine_version' => Rules::ENGINE_VERSION, 'difficulty_version' => Difficulty::VERSION]);
    $before = new Run(['engine_version' => Rules::ENGINE_VERSION, 'difficulty_version' => null]);

    expect(TargetTable::forRun($played)?->target(3000))
        ->toEqualWithDelta(TargetTable::forDifficulty(Rules::ENGINE_VERSION, Difficulty::VERSION)->target(3000), 0.01)
        ->and(TargetTable::forRun($before)?->target(3000))->toEqualWithDelta(targets()->target(3000), 0.01);
});
