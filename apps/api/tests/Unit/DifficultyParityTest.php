<?php

use App\Game\BonusHit;
use App\Game\Difficulty;
use App\Game\EngineError;
use App\Game\ReelStream;
use App\Game\Rules;
use App\Game\Run;

/*
| Dereceli's difficulties, PHP against the runs the TypeScript engine played
| at them (`pnpm engine:fixtures` → difficulty.json). A difference here would
| judge a rated run by another game than the one the player saw.
*/

test('the table is the TypeScript table, row for row', function () {
    expect(Difficulty::TABLE)->toBe(engineFixture('difficulty.json')['table'])
        ->and(Difficulty::VERSION)->toBe(engineFixture('difficulty.json')['version'])
        ->and(Difficulty::MAX)->toBe(count(Difficulty::TABLE) - 1);
});

test('the curves and the losses match', function (array $curve) {
    $difficulty = $curve['difficulty'];

    expect(Difficulty::likeWeightAt($difficulty))->toBe($curve['likeWeight']);
    foreach ($curve['reels'] as $reel) {
        expect(Difficulty::specialShareAt($reel['n'], $difficulty))->toBe($reel['specialShare'])
            ->and(Difficulty::drainAt($reel['n'], $difficulty))->toBe($reel['drain']);
    }
    expect([
        'timeout' => Difficulty::lossAt(Rules::LOSS_TIMEOUT, $difficulty),
        'wrong' => Difficulty::lossAt(Rules::LOSS_WRONG, $difficulty),
        'holdMiss' => Difficulty::lossAt(Rules::LOSS_HOLD_MISS, $difficulty),
        'caught' => Difficulty::lossAt(Rules::LOSS_CAUGHT, $difficulty),
    ])->toEqual($curve['losses']);
})->with('difficulty curves');

it('replays a run at its difficulty to the TypeScript summary', function (array $fixture) {
    $replay = Run::replay($fixture['seed'], $fixture['actions'], $fixture['difficulty']);

    $this->assertSame($fixture['summary'], $replay->summary->toArray());
})->with('difficulty replays');

it('scores and drains every reel of the step logs like the TypeScript engine', function (array $fixture) {
    $run = new Run($fixture['seed'], $fixture['difficulty']);
    foreach ($fixture['actions'] as $index => $action) {
        $step = $run->apply($action);
        $this->assertSame($fixture['steps'][$index], [
            'index' => $step->reel->index,
            'kind' => $step->reel->kind->value,
            'verdict' => $step->verdict->value,
            'points' => $step->points,
            'combo' => $step->combo,
            'bonuses' => array_map(fn (BonusHit $bonus) => $bonus->toArray(), $step->bonuses),
            'blind' => $step->blind,
            'meter' => $step->meter,
        ], "{$fixture['name']} reel {$index}");
    }
    $run->quit();
    $this->assertSame($fixture['summary'], $run->summary()->toArray());
})->with('difficulty steps');

it('replays every engine fixture the same at difficulty 0', function (array $fixture) {
    $this->assertSame($fixture['summary'], Run::replay($fixture['seed'], $fixture['actions'], 0)->summary->toArray());
})->with('engine replays');

test('a rated log is a different game at difficulty 0', function () {
    $fixture = collect(engineFixture('difficulty.json')['replays'])->firstWhere('name', 'pro-42-d16');

    try {
        $plain = Run::replay($fixture['seed'], $fixture['actions'])->summary->toArray();
        expect($plain)->not->toBe($fixture['summary']);
    } catch (EngineError) {
        // The feed differs: the log does not even fit the easier game.
        expect(true)->toBeTrue();
    }
});

test('a difficulty that is not a row is refused', function (int $difficulty) {
    expect(fn () => new Run(42, $difficulty))->toThrow(InvalidArgumentException::class)
        ->and(fn () => new ReelStream(42, $difficulty))->toThrow(InvalidArgumentException::class);
})->with([-1, 17]);
