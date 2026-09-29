<?php

use App\Game\Rules;
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

test('a season without a table has none — its runs cannot be rated', function () {
    expect(TargetTable::forEngine(Rules::ENGINE_VERSION + 1))->toBeNull();
});

test('the target is each anchor\'s score, geometric in between and past the ends', function () {
    $table = targets();

    expect($table->target(1000))->toEqualWithDelta(34000, 0.01)
        ->and($table->target(2000))->toEqualWithDelta(100000, 0.01)
        ->and($table->target(1500))->toEqualWithDelta(sqrt(34000 * 100000), 0.01)
        ->and($table->target(6500))->toBeGreaterThan(1100000.0)
        ->and($table->shown(1500))->toBe(58400)
        ->and($table->shown(2000))->toBe(100000)
        ->and($table->shown(0))->toBe(8000);
});

test('performance is the rating whose typical score a score is', function () {
    $table = targets();

    expect($table->performance(34000))->toBe(1000)
        ->and($table->performance(100000))->toBe(2000)
        ->and($table->performance(1100000))->toBe(6000)
        ->and($table->performance(4000))->toBeLessThan(0)
        ->and($table->performance(2000000))->toBeGreaterThan(6000)
        ->and($table->performance(0))->toBeNull();
    foreach ([900, 1500, 2750, 4321, 5555] as $rating) {
        expect($table->performance((int) round($table->target($rating))))->toBe($rating);
    }
});

test('reaching the shown target never loses', function () {
    $table = targets();

    foreach (range(0, 6000, 137) as $rating) {
        $performance = $table->performance($table->shown($rating));

        expect(TargetTable::delta($rating, $performance, 800, 100))->toBeGreaterThanOrEqual(0)
            ->and(TargetTable::delta($rating, $table->performance($table->shown($rating) - 1000), 800, 100))->toBeLessThanOrEqual(0);
    }
});

test('a run moves the rating by tanh of how far past or short of the target it played, never more than the cap', function () {
    expect(TargetTable::delta(1500, 2000, 800, 100))->toBe(55)
        ->and(TargetTable::delta(1500, 2000, 400, 100))->toBe(85)
        ->and(TargetTable::delta(1500, 1000, 800, 100))->toBe(-55)
        ->and(TargetTable::delta(1500, 1500, 800, 100))->toBe(0)
        ->and(TargetTable::delta(1500, 9000, 800, 100))->toBe(100)
        ->and(TargetTable::delta(1500, -9000, 800, 100))->toBe(-100)
        ->and(TargetTable::delta(1500, null, 800, 100))->toBe(-100);

    foreach (range(-4000, 9000, 250) as $performance) {
        expect(abs(TargetTable::delta(2000, $performance, 400, 100)))->toBeLessThanOrEqual(100);
    }
});

test('the median of placement is the middle score, the lower one of an even count', function () {
    expect(TargetTable::median([50000, 10000, 30000, 20000, 40000]))->toBe(30000)
        ->and(TargetTable::median([4, 1, 3, 2]))->toBe(2)
        ->and(TargetTable::median([7]))->toBe(7);
});
