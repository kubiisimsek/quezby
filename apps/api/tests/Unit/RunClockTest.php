<?php

use App\Game\Run as Engine;
use App\Services\RunClock;
use App\Services\RunVerifier;
use Illuminate\Support\Carbon;

/*
| The app's pace, reel by reel: what the wall-clock check and the checkpoints
| hold the server's clock against.
*/

function runClock(): RunClock
{
    return app(RunClock::class);
}

it('adds up to the least time the wall-clock check allows', function (array $fixture) {
    $replay = Engine::replay($fixture['seed'], $fixture['actions']);
    $needed = runClock()->needed($replay);
    $tolerance = config('quezby.plausibility.clock_tolerance_ms');
    $started = Carbon::parse('2026-09-24 10:00:00.000');
    $verifier = app(RunVerifier::class);

    expect($needed)->toHaveCount(count($fixture['actions']) + 1)
        ->and($needed[0])->toBe(1800)
        ->and($verifier->wallClock($started, $replay->summary, $replay->steps, $started->copy()->addMilliseconds(end($needed) - $tolerance)))->toBeNull()
        ->and($verifier->wallClock($started, $replay->summary, $replay->steps, $started->copy()->addMilliseconds(end($needed) - $tolerance - 1)))->not->toBeNull();

    // Each reel adds its time on screen and what follows its verdict; the time on screen adds up to the engine's.
    $onScreen = 0;
    foreach ($replay->steps as $i => $step) {
        $onScreen += $needed[$i + 1] - $needed[$i] - runClock()->afterMs($step);
    }
    expect($onScreen)->toBe($fixture['summary']['activeMs']);
})->with('engine replays');

it('comes to each verdict before the pause and slide that follow it', function (array $fixture) {
    $replay = Engine::replay($fixture['seed'], $fixture['actions']);
    $needed = runClock()->needed($replay);
    $verdicts = runClock()->verdicts($replay);

    expect($verdicts)->toHaveCount(count($fixture['actions']));
    foreach ($replay->steps as $i => $step) {
        expect($verdicts[$i] + runClock()->afterMs($step))->toBe($needed[$i + 1])
            ->and($verdicts[$i])->toBeGreaterThanOrEqual($needed[$i]);
    }
})->with('engine replays');

it('checks in at the first verdict past each mark', function (array $fixture) {
    $replay = Engine::replay($fixture['seed'], $fixture['actions']);
    $needed = runClock()->needed($replay);
    $marks = config('quezby.plausibility.checkpoints.marks_ms');
    $checkIns = runClock()->checkIns($replay, $marks);

    // When each verdict came, ms after the countdown.
    $verdicts = [];
    foreach ($replay->steps as $i => $step) {
        $verdicts[] = $needed[$i + 1] - runClock()->afterMs($step) - runClock()->countdownMs();
    }
    $passed = array_values(array_filter($marks, fn (int $mark) => $verdicts !== [] && end($verdicts) >= $mark));

    expect($checkIns)->toHaveCount(count($passed));
    foreach ($checkIns as $i => ['reel' => $reel, 'atMs' => $atMs]) {
        expect($atMs)->toBe($verdicts[$reel - 1])
            ->and($atMs)->toBeGreaterThanOrEqual($passed[$i])
            ->and($reel === 1 || $verdicts[$reel - 2] < $passed[$i])->toBeTrue();
    }
})->with('engine replays');

it('checks in once for a verdict that passes two marks', function () {
    $replay = Engine::replay(42, [[1, 400, 0], [1, 400, 0]]);

    expect(runClock()->checkIns($replay, [100, 200, 5000]))->toBe([['reel' => 1, 'atMs' => 400]])
        ->and(runClock()->checkIns($replay, []))->toBe([]);
});
