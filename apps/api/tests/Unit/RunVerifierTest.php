<?php

use App\Game\Run as Engine;
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
