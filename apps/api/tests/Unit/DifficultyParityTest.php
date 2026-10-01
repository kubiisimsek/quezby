<?php

use App\Game\BonusHit;
use App\Game\Difficulty;
use App\Game\EngineError;
use App\Game\Reel;
use App\Game\ReelKind;
use App\Game\Rules;
use App\Game\Run;

/*
| Dereceli's difficulties, PHP against the runs the TypeScript engine played
| at them (`pnpm engine:fixtures` → difficulty.json). A difference here would
| judge a rated run by another game than the one the player saw.
*/

test('the table is the TypeScript table, row for row', function () {
    expect(Difficulty::table())->toBe(engineFixture('difficulty.json')['table'])
        ->and(Difficulty::VERSION)->toBe(engineFixture('difficulty.json')['version'])
        ->and(Difficulty::MAX)->toBe(count(Difficulty::table()) - 1);
});

test('the gains and the losses match', function (array $curve) {
    $difficulty = $curve['difficulty'];

    expect(array_map(fn (int $gain) => Difficulty::gainAt($gain, $difficulty), Rules::GAIN))->toEqual($curve['gains']);
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

test('a rated log is a different game at difficulty 0: the same reels, another meter', function () {
    $fixture = collect(engineFixture('difficulty.json')['replays'])->firstWhere('name', 'pro-42-d16');

    try {
        $plain = Run::replay($fixture['seed'], $fixture['actions'])->summary->toArray();
        expect($plain)->not->toBe($fixture['summary']);
    } catch (EngineError) {
        // The meter lasts longer at 0: the log runs out before the easier game ends.
        expect(true)->toBeTrue();
    }
});

test('every difficulty plays the same feed: the same reels, windows and drain', function () {
    $clean = fn (Reel $reel): array => match ($reel->kind) {
        ReelKind::Skip => [1, 400, 0],
        ReelKind::Like => [2, 400, 0],
        ReelKind::Freeze => [0, 0, 0],
        ReelKind::Hold => [3, 300, (int) round($reel->zoneCenter * $reel->holdFill / 1000)],
    };
    $plain = new Run(7919);
    $hard = new Run(7919, Difficulty::MAX);
    $reels = 0;
    while (! $plain->isOver() && ! $hard->isOver() && $reels < 400) {
        expect($hard->current())->toEqual($plain->current());
        $action = $clean($plain->current());
        $plain->apply($action);
        $hard->apply($action);
        $reels++;
    }
    expect($reels)->toBeGreaterThan(100);
});

test('a difficulty that is not a row is refused', function (int $difficulty) {
    expect(fn () => new Run(42, $difficulty))->toThrow(InvalidArgumentException::class)
        ->and(fn () => Difficulty::rulesFor($difficulty))->toThrow(InvalidArgumentException::class);
})->with([-1, 17]);
