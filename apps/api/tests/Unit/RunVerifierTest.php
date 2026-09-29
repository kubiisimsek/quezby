<?php

use App\Enums\DeviceVerdict;
use App\Game\Checkpoint;
use App\Game\Replay;
use App\Game\Run as Engine;
use App\Models\Run;
use App\Services\RunClock;
use App\Services\RunVerifier;
use Illuminate\Support\Carbon;

/*
| The plausibility checks against simulated players of every skill: none of
| them may be caught, or honest players would be.
*/

function verifier(): RunVerifier
{
    return app(RunVerifier::class);
}

it('never catches a simulated player', function (array $fixture) {
    $steps = Engine::replay($fixture['seed'], $fixture['actions'])->steps;

    expect(verifier()->decisionSpeed($steps))->toBeNull()
        ->and(verifier()->holdBounds($steps))->toBeNull()
        ->and(verifier()->reactionRhythm($steps))->toBeNull()
        ->and(verifier()->floorHugging($steps))->toBeNull()
        ->and(verifier()->perfectShare($steps))->toBeNull();
})->with('engine replays');

it('lets a run through that took just the least time the app needs', function () {
    $fixture = replayFixture('good-42');
    $replay = Engine::replay($fixture['seed'], $fixture['actions']);
    $pace = config('quezby.plausibility.pace');
    $needed = $pace['countdown_step_ms'] * $pace['countdown_steps'] + $replay->summary->activeMs;
    foreach ($replay->steps as $step) {
        $needed += $pace['slide_ms'] + match (true) {
            ! $step->verdict->isHit() => $pace['exit_ms']['miss'],
            $step->reel->kind->value === 'skip' => $pace['exit_ms']['skip_hit'],
            default => $pace['exit_ms']['hit'],
        };
    }
    $needed -= config('quezby.plausibility.clock_tolerance_ms');
    $started = Carbon::parse('2026-09-24 10:00:00.000');

    expect(verifier()->wallClock($started, $replay->summary, $replay->steps, $started->copy()->addMilliseconds($needed)))->toBeNull();
    $flag = verifier()->wallClock($started, $replay->summary, $replay->steps, $started->copy()->addMilliseconds($needed - 1));
    expect($flag)->toMatchArray(['code' => 'wall_clock', 'neededMs' => $needed, 'elapsedMs' => $needed - 1]);
});

it('counts decisions under the speed floor only among swipe and like hits', function () {
    $fast = Engine::replay(4242, playedLog(4242, 80, 200, 30))->steps;
    $human = Engine::replay(4242, playedLog(4242, 80, 420, 120))->steps;
    $short = Engine::replay(4242, playedLog(4242, 20, 150))->steps;

    expect(verifier()->decisionSpeed($fast))->toMatchArray(['code' => 'fast_decisions'])
        ->and(verifier()->decisionSpeed($human))->toBeNull()
        ->and(verifier()->decisionSpeed($short))->toBeNull('too few samples to judge');
});

it('lets a guesser through who is as fast on the reels it gets wrong', function (int $seed, bool $spareFreeze) {
    $steps = Engine::replay($seed, swipedLog($seed, 200, 190, 40, $spareFreeze))->steps;
    $skipHits = collect($steps)->filter(fn ($step) => $step->reel->kind->value === 'skip' && $step->verdict->isHit())->count();

    expect($skipHits)->toBeGreaterThanOrEqual(config('quezby.plausibility.fast_min_samples'), 'enough swipe hits that speed alone would flag it')
        ->and(verifier()->decisionSpeed($steps))->toBeNull();
})->with([
    'swipes everything' => [7919, false],
    'spares freeze reels' => [4242, true],
    'spares freeze reels, another feed' => [7919, true],
    'spares freeze reels, a third feed' => [31337, true],
]);

it('still catches a fast player who is right almost every time', function () {
    $fast = Engine::replay(4242, playedLog(4242, 80, 200, 30))->steps;
    $wrongs = collect($fast)->filter(fn ($step) => in_array($step->verdict->value, ['wrong', 'caught'], true))->count();

    expect($wrongs)->toBe(0)
        ->and(verifier()->decisionSpeed($fast))->toMatchArray(['code' => 'fast_decisions']);
});

it('hears a metronome, not a thumb', function () {
    $metronome = Engine::replay(4242, playedLog(4242, 90, 450))->steps;
    $thumb = Engine::replay(4242, playedLog(4242, 90, 450, 100))->steps;

    expect(verifier()->reactionRhythm($metronome))->toMatchArray(['code' => 'reaction_cv', 'cv' => 0.0])
        ->and(verifier()->reactionRhythm($thumb))->toBeNull();
});

it('notices decisions crowding just past the speed floor', function () {
    $hugging = Engine::replay(4242, playedLog(4242, 90, 265, 12))->steps;

    expect(verifier()->floorHugging($hugging))->toMatchArray(['code' => 'floor_hugging']);
});

it('notices gold reels let go dead centre nearly every time', function () {
    $centre = Engine::replay(4242, playedLog(4242, 400, 450, 100))->steps;
    $holds = collect($centre)->filter(fn ($step) => $step->reel->kind->value === 'hold' && $step->verdict->isHit())->count();

    expect($holds)->toBeGreaterThanOrEqual(15)
        ->and(verifier()->perfectShare($centre))->toMatchArray(['code' => 'perfect_share']);
});

it('matches the score and reel count the app showed', function () {
    $summary = Engine::replay(42, [[1, 400, 0]])->summary;

    expect(verifier()->clientMismatch($summary, $summary->score, $summary->reels))->toBeNull()
        ->and(verifier()->clientMismatch($summary, $summary->score + 1, $summary->reels))->toMatchArray(['code' => 'client_mismatch'])
        ->and(verifier()->clientMismatch($summary, $summary->score, $summary->reels + 1))->toMatchArray(['code' => 'client_mismatch']);
});

/**
 * A phone playing `$replay` at `$speed` of real time, its timers each
 * `$latenessMs` late, `$startMs` between the API starting the run and the
 * countdown, `$networkMs` for each request to reach the API, `$drawMs` to
 * draw each post before it goes live (the app starts a post's clock on its
 * first drawn frame, which the pace does not count): the receipts it
 * collects at the checkpoint marks, and when its finish arrives — ms after
 * the start.
 *
 * @return array{receipts: list<string>, finishMs: int}
 */
function phonePlaying(Run $run, array $actions, Replay $replay, float $speed = 1.0, int $latenessMs = 0, int $startMs = 250, int $networkMs = 120, int $drawMs = 0): array
{
    $clock = app(RunClock::class);
    $needed = $clock->needed($replay);
    $real = fn (int $ms) => (int) ceil($ms / $speed);
    $marks = config('quezby.plausibility.checkpoints.marks_ms');

    $at = $startMs + $real($clock->countdownMs()) + $latenessMs;
    $game = 0;
    $receipts = [];
    foreach ($replay->steps as $i => $step) {
        $after = $clock->afterMs($step);
        $onScreen = $needed[$i + 1] - $needed[$i] - $after;
        $at += $real($drawMs + $onScreen) + $latenessMs;
        $game += $drawMs + $onScreen + $latenessMs;
        // The app goes by its own game clock, which a speed hack slows down with everything else.
        if ($marks !== [] && $game >= $marks[0]) {
            $marks = array_values(array_filter($marks, fn (int $mark) => $mark > $game));
            $receipts[] = app(Checkpoint::class)->sign($run->id, $i + 1, Checkpoint::prefixHash($actions, $i + 1), $run->started_at->getTimestampMs() + $at + $networkMs);
        }
        $at += $real($after) + $latenessMs;
        $game += $after + $latenessMs;
    }

    return ['receipts' => $receipts, 'finishMs' => $at + $networkMs];
}

function unsavedRun(int $seed): Run
{
    return (new Run)->forceFill(['id' => '01JCHECKP0INTCA1BRAT10NRUN', 'seed' => $seed, 'started_at' => Carbon::parse('2026-09-24 10:00:00.000')]);
}

it('never catches a simulated player at its checkpoints, on any honest phone', function (array $fixture, array $phone) {
    $run = unsavedRun($fixture['seed']);
    $replay = Engine::replay($fixture['seed'], $fixture['actions']);
    ['receipts' => $receipts, 'finishMs' => $finishMs] = phonePlaying($run, $fixture['actions'], $replay, ...$phone);

    expect(verifier()->checkpoints($run, $fixture['actions'], $replay, $receipts))->toBe(['hard' => [], 'soft' => []])
        ->and(verifier()->wallClock($run->started_at, $replay->summary, $replay->steps, $run->started_at->copy()->addMilliseconds($finishMs)))->toBeNull();
})->with('engine replays')->with([
    'a quick phone' => [['latenessMs' => 0, 'startMs' => 150, 'networkMs' => 60]],
    'a slow phone' => [['latenessMs' => 25, 'startMs' => 1500, 'networkMs' => 1500]],
    'a poor connection' => [['latenessMs' => 8, 'startMs' => 4000, 'networkMs' => 5000]],
    'a phone slow to draw each post' => [['latenessMs' => 8, 'startMs' => 250, 'networkMs' => 120, 'drawMs' => 45]],
]);

it('catches a slowed-down game at its checkpoints', function (float $speed, array $flags) {
    $fixture = replayFixture('pro-7919');
    $run = unsavedRun($fixture['seed']);
    $replay = Engine::replay($fixture['seed'], $fixture['actions']);
    ['receipts' => $receipts, 'finishMs' => $finishMs] = phonePlaying($run, $fixture['actions'], $replay, $speed);

    $found = verifier()->checkpoints($run, $fixture['actions'], $replay, $receipts);
    expect(array_map(fn (array $flags) => array_column($flags, 'code'), $found))->toBe($flags)
        // A slowed-down game always takes longer than the least time: the finish alone never catches it.
        ->and(verifier()->wallClock($run->started_at, $replay->summary, $replay->steps, $run->started_at->copy()->addMilliseconds($finishMs)))->toBeNull();
})->with([
    'at 90 %: not told apart from a laggy phone' => [0.9, ['hard' => [], 'soft' => []]],
    'at 80 %: a top score waits for review' => [0.8, ['hard' => [], 'soft' => ['slow_timing']]],
    'at 70 %: never ranks' => [0.7, ['hard' => ['slow_motion'], 'soft' => ['slow_timing']]],
    'at half speed' => [0.5, ['hard' => ['slow_motion'], 'soft' => []]],
]);

it('flags a failed device, and holds an unverified one, only when enforced', function (string $mode, ?DeviceVerdict $verdict, array $expected) {
    config(['quezby.integrity.mode' => $mode]);
    $run = unsavedRun(1)->forceFill(['device_verdict' => $verdict]);

    expect(array_map(fn (array $flags) => array_column($flags, 'code'), verifier()->deviceIntegrity($run)))->toBe($expected);
})->with([
    'enforce, failed' => ['enforce', DeviceVerdict::Fail, ['hard' => ['device_integrity'], 'soft' => []]],
    'enforce, none' => ['enforce', null, ['hard' => [], 'soft' => ['device_unverified']]],
    'enforce, passed' => ['enforce', DeviceVerdict::Pass, ['hard' => [], 'soft' => []]],
    'log, failed' => ['log', DeviceVerdict::Fail, ['hard' => [], 'soft' => []]],
    'log, none' => ['log', null, ['hard' => [], 'soft' => []]],
    'off, failed' => ['off', DeviceVerdict::Fail, ['hard' => [], 'soft' => []]],
]);
