<?php

use App\Game\BonusHit;
use App\Game\BonusKind;
use App\Game\EngineError;
use App\Game\Gesture;
use App\Game\ReelKind;
use App\Game\Rng;
use App\Game\Rules;
use App\Game\Run;
use App\Game\Verdict;

/*
| The PHP engine against the fixtures the TypeScript engine wrote
| (`pnpm engine:fixtures`). Any difference here means the API would rank a
| different game than the one the player saw.
*/

it('replays to the TypeScript summary', function (array $fixture) {
    $replay = Run::replay($fixture['seed'], $fixture['actions']);

    $this->assertSame($fixture['summary'], $replay->summary->toArray());
    $this->assertCount(count($fixture['actions']), $replay->steps);
})->with('engine replays');

it('refuses what the TypeScript engine refuses', function (array $fixture) {
    try {
        Run::replay($fixture['seed'], $fixture['actions']);
    } catch (EngineError $error) {
        $this->assertSame($fixture['error'], $error->error);
        $this->assertSame($fixture['reelIndex'], $error->reelIndex);

        return;
    }

    $this->fail("{$fixture['name']} was accepted.");
})->with('engine rejects');

test('curves match', function (array $expected) {
    $n = $expected['n'];
    $windows = [];
    foreach (ReelKind::cases() as $kind) {
        $windows[$kind->value] = Rules::windowFor($kind, $n);
    }

    $this->assertSame($expected, [
        'n' => $n,
        'baseWindow' => Rules::baseWindow($n),
        'windows' => $windows,
        'holdFill' => Rules::holdFillFor($n),
        'zoneWidth' => Rules::zoneWidthFor($n),
        'specialShare' => Rules::specialShareFor($n),
        'drain' => Rules::drainFor($n),
        'level' => Rules::levelFor($n),
        'levelBoost' => Rules::levelBoostFor($n),
        'bonuses' => array_combine(
            array_map(fn (BonusKind $kind) => $kind->value, BonusKind::cases()),
            array_map(fn (BonusKind $kind) => Rules::bonusFor($kind, $n), BonusKind::cases()),
        ),
    ]);
})->with('curve reels');

test('combo steps match', function () {
    foreach (engineFixture('curves.json')['combo'] as ['combo' => $combo, 'afterHit' => $afterHit, 'afterMiss' => $afterMiss]) {
        $this->assertSame($afterHit, Rules::comboAfterHit($combo), "hit at {$combo}");
        $this->assertSame($afterMiss, Rules::comboAfterMiss($combo), "miss at {$combo}");
    }
});

it('scores every reel of the step logs like the TypeScript engine', function (array $fixture) {
    $run = new Run($fixture['seed']);
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
})->with('engine bonuses');

test('the bonus logs set off every named combo', function () {
    $seen = [];
    foreach (engineFixture('bonuses.json') as $fixture) {
        foreach ($fixture['steps'] as $step) {
            foreach ($step['bonuses'] as $bonus) {
                $seen[$bonus['kind']] = true;
            }
        }
    }

    expect(array_keys($seen))->toEqualCanonicalizing(array_map(fn (BonusKind $kind) => $kind->value, BonusKind::cases()));
});

test('the rules are the TypeScript rules, key for key', function () {
    expect(Rules::toArray())->toBe(engineFixture('rules.json'));
});

test('RNG matches', function (array $sequence) {
    $rng = new Rng($sequence['seed']);
    $values = [];
    foreach ($sequence['next'] as $_) {
        $values[] = $rng->next();
    }

    $this->assertSame($sequence['next'], $values);
})->with('rng sequences');

test('the configured engine is the PHP engine', function () {
    $this->assertSame(Rules::ENGINE_VERSION, config('quezby.engine_version'));
});

test('steps carry the judged action for anti-cheat', function () {
    $fixture = replayFixture('pro-42');

    $steps = Run::replay($fixture['seed'], $fixture['actions'])->steps;

    foreach ($fixture['actions'] as $index => [$gesture, $t, $d]) {
        $this->assertSame($index, $steps[$index]->reel->index);
        $this->assertSame($gesture, $steps[$index]->gesture->value);
        $this->assertSame([$t, $d], [$steps[$index]->t, $steps[$index]->d]);
    }
    $this->assertSame(Verdict::Hit, $steps[0]->verdict);
    $this->assertSame(ReelKind::Skip, $steps[0]->reel->kind);
});

test('a whole number written with a fraction is still whole, as in JavaScript', function () {
    $this->assertSame(
        Run::replay(42, [[1, 400, 0]])->summary->toArray(),
        Run::replay(42, [[1.0, 400.0, 0.0]])->summary->toArray(),
    );
});

// The same expectation as `new EngineError(EngineError::MALFORMED_ACTION, 0)`: its class, message and code.
test('a time that is not a whole millisecond is malformed', function (mixed $t) {
    Run::replay(42, [[Gesture::Up->value, $t, 0]]);
})->with('not whole numbers')->throws(EngineError::class, 'malformed_action at reel 0', 0);
