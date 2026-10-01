<?php

use App\Game\Gesture;
use App\Game\Rules;
use App\Game\Run;
use App\Game\Verdict;

/*
| Blind moves (engine v3): a swipe or a double tap on the wrong post, made
| sooner than `Rules::BLIND_MS`. The first costs the plain loss; each blind
| move after it doubles, until a considered hit. The step logs in
| `EngineParityTest` check the same against the TypeScript engine reel by reel;
| these say the rule in PHP's own words.
*/

/** Seed 1 opens skip, skip, like. */
function atTheFirstLike(): Run
{
    $run = new Run(1);
    $run->apply([Gesture::Up->value, 400, 0]);
    $run->apply([Gesture::Up->value, 400, 0]);

    return $run;
}

it('calls a swipe on the wrong post made too soon to have looked blind, at the plain loss the first time', function () {
    $run = atTheFirstLike();
    $before = $run->meter();

    $step = $run->apply([Gesture::Up->value, Rules::BLIND_MS - 1, 0]);

    expect($step->verdict)->toBe(Verdict::Wrong)
        ->and($step->blind)->toBe(1)
        ->and($step->meter)->toBe($before - intdiv($step->reel->drain * (Rules::BLIND_MS - 1), 1000) - Rules::LOSS_WRONG);
});

it('keeps the plain penalty for a wrong move made after a look', function () {
    $step = atTheFirstLike()->apply([Gesture::Up->value, Rules::BLIND_MS, 0]);

    expect($step->verdict)->toBe(Verdict::Wrong)->and($step->blind)->toBe(0);
});

it('never calls a timeout, a press or a touched freeze reel blind', function () {
    expect((new Run(1))->apply([Gesture::None->value, 0, 0])->blind)->toBe(0)
        ->and((new Run(1))->apply([Gesture::Hold->value, 100, 400])->blind)->toBe(0);

    $freeze = new Run(9);
    foreach ([[1, 300, 0], [1, 300, 0], [2, 300, 0], [1, 300, 0]] as $action) {
        $freeze->apply($action);
    }
    $hold = $freeze->current();
    $freeze->apply([Gesture::Hold->value, 300, intdiv($hold->zoneCenter * $hold->holdFill, 1000)]);
    $freeze->apply([Gesture::Up->value, 300, 0]);
    $caught = $freeze->apply([Gesture::Touch->value, 100, 0]);

    expect($caught->verdict)->toBe(Verdict::Caught)->and($caught->blind)->toBe(0);
});

it('doubles from the second blind move while fast hits never forgive', function () {
    $run = new Run(1);

    expect($run->apply([Gesture::Like->value, 250, 0])->blind)->toBe(1);
    $run->apply([Gesture::Up->value, 200, 0]);
    $before = $run->meter();
    $second = $run->apply([Gesture::Up->value, 200, 0]);

    expect($second->blind)->toBe(2)
        ->and($second->meter)->toBe($before - intdiv($second->reel->drain * 200, 1000) - 2 * Rules::LOSS_WRONG)
        ->and($second->over)->toBeFalse();
});

it('always ends the run on the third blind move in a row', function () {
    expect(Rules::penaltyFor(Rules::LOSS_WRONG, 3))->toBeGreaterThanOrEqual(Rules::METER_MAX)
        ->and(Rules::penaltyFor(Rules::LOSS_TIMEOUT, 3))->toBeGreaterThanOrEqual(Rules::METER_MAX);
});

it('starts over after a considered hit', function () {
    $run = new Run(1);

    expect($run->apply([Gesture::Like->value, 250, 0])->blind)->toBe(1)
        ->and($run->apply([Gesture::Up->value, Rules::BLIND_MS, 0])->verdict)->toBe(Verdict::Hit)
        ->and($run->apply([Gesture::Up->value, 200, 0])->blind)->toBe(1);
});

it('costs the plain loss for the first blind move, then doubles it for each one after', function () {
    expect(array_map(fn (int $blind) => Rules::penaltyFor(Rules::LOSS_WRONG, $blind), [0, 1, 2, 3]))
        ->toBe([250, 250, 500, 1000])
        ->and(array_map(Rules::blindFactor(...), [0, 1, 2, 3, 4]))->toBe([1, 1, 2, 4, 8]);
});
