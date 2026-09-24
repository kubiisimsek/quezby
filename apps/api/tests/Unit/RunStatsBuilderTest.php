<?php

use App\Content\ContentPicker;
use App\Game\Gesture;
use App\Game\ReelKind;
use App\Game\Run as Engine;
use App\Services\RunStatsBuilder;

/*
| Stats come from the server's replay alone. Seed 1 opens with the intro:
| skip, skip, like, skip, hold, skip, freeze, skip.
*/

it('counts every gesture and miss from the replay', function () {
    $hold = new Engine(1);
    foreach (range(1, 4) as $_) {
        $hold->apply([$hold->current()->kind === ReelKind::Like ? Gesture::Like->value : Gesture::Up->value, 400, 0]);
    }
    $centre = intdiv($hold->current()->zoneCenter * $hold->current()->holdFill, 1000);
    $actions = [
        [Gesture::Up->value, 400, 0],
        [Gesture::Up->value, 380, 0],
        [Gesture::Like->value, 500, 0],
        [Gesture::None->value, 0, 0],
        [Gesture::Hold->value, 300, $centre],
        [Gesture::Up->value, 420, 0],
        [Gesture::Touch->value, 200, 0],
    ];

    $stats = app(RunStatsBuilder::class)->build(Engine::replay(1, $actions), 1, 1);

    expect($stats->swipes)->toBe(3)
        ->and($stats->likes)->toBe(1)
        ->and($stats->holds)->toBe(1)
        ->and($stats->perfects)->toBe(1)
        ->and($stats->freezes)->toBe(0)
        ->and($stats->misses)->toBe(['timeout' => 1, 'wrong' => 0, 'holdEarly' => 0, 'holdLate' => 0, 'caught' => 1])
        ->and($stats->missCount())->toBe(2)
        ->and($stats->bestReactionMs)->toBe(380)
        ->and($stats->levelMisses)->toBe([2]);
});

it('credits the like to the post the seed showed, and every reel as shown', function () {
    $actions = [[Gesture::Up->value, 400, 0], [Gesture::Up->value, 400, 0], [Gesture::Like->value, 500, 0]];

    $stats = app(RunStatsBuilder::class)->build(Engine::replay(1, $actions), 1, 1);

    $liked = ContentPicker::postId(1, 1, 2, ReelKind::Like);
    expect($stats->content[$liked])->toBe(['shows' => 1, 'likes' => 1, 'misses' => 0])
        ->and(array_sum(array_column($stats->content, 'shows')))->toBe(3);
});

it('has nothing to count before the first reel', function () {
    $stats = app(RunStatsBuilder::class)->build(Engine::replay(1, []), 1, 1);

    expect($stats->toArray())->toMatchArray(['swipes' => 0, 'likes' => 0, 'bestReactionMs' => null, 'levelMisses' => []])
        ->and($stats->content)->toBe([]);
});
