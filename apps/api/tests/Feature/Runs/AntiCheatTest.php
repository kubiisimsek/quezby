<?php

use App\Enums\RunStatus;
use App\Game\Gesture;
use App\Game\ReelKind;
use App\Game\Run as Engine;
use App\Models\LeaderboardEntry;
use App\Models\Run;
use App\Models\User;

/*
| What the API refuses to rank. Hard flags keep a run off every board; soft
| signals hold back only a score that would reach the top.
*/

test('a log played faster than the clock allows is flagged', function () {
    $this->signIn();
    $fixture = replayFixture('pro-7919');
    $runId = $this->startRunFor($fixture, startedSecondsAgo: 10);

    $this->finishRun($runId, $fixture['actions'], $fixture['summary']['score'], $fixture['summary']['reels'])
        ->assertOk()
        ->assertJsonPath('run.status', 'flagged')
        ->assertJsonPath('run.score', $fixture['summary']['score'])
        ->assertJsonPath('best', null)
        ->assertJsonPath('isNewBest', false)
        ->assertJsonPath('league', null)
        ->assertJsonPath('ranks', ['weekly' => null, 'monthly' => null, 'all' => null]);

    $flag = Run::query()->findOrFail($runId)->flags[0];
    expect($flag['code'])->toBe('wall_clock')->and($flag['severity'])->toBe('hard')
        ->and(LeaderboardEntry::query()->count())->toBe(0);
});

test('inhumanly fast decisions are flagged', function () {
    $this->signIn();
    $actions = playedLog(seed: 4242, reels: 80, decisionMs: 180, jitterMs: 40);
    $runId = $this->startRunFor(['seed' => 4242, 'summary' => ['activeMs' => 80000, 'reels' => 80]]);

    $this->finishRun($runId, $actions, Engine::replay(4242, $actions)->summary->score, 80)
        ->assertOk()
        ->assertJsonPath('run.status', 'flagged');

    $flag = collect(Run::query()->findOrFail($runId)->flags)->firstWhere('code', 'fast_decisions');
    expect($flag['samples'])->toBeGreaterThanOrEqual(30)
        ->and(LeaderboardEntry::query()->count())->toBe(0);
});

test('quick but human decisions rank', function () {
    $this->signIn();
    $actions = playedLog(seed: 4242, reels: 80, decisionMs: 420, jitterMs: 120);
    $runId = $this->startRunFor(['seed' => 4242, 'summary' => ['activeMs' => 80000, 'reels' => 80]]);

    $this->finishRun($runId, $actions, Engine::replay(4242, $actions)->summary->score, 80)
        ->assertOk()
        ->assertJsonPath('run.status', 'ranked')
        ->assertJsonPath('ranks.all', 1);
    expect(Run::query()->findOrFail($runId)->flags)->toBeNull();
});

test('a hold the app would already have ended is flagged', function () {
    $this->signIn();
    $run = new Engine(7);
    $actions = [];
    while ($run->current()->kind !== ReelKind::Hold) {
        $reel = $run->current();
        $action = match ($reel->kind) {
            ReelKind::Skip => [Gesture::Up->value, 450, 0],
            ReelKind::Like => [Gesture::Like->value, 450, 0],
            default => [Gesture::None->value, 0, 0],
        };
        $run->apply($action);
        $actions[] = $action;
    }
    $actions[] = [Gesture::Hold->value, 300, $run->holdFailAfter() + 600];
    $replay = Engine::replay(7, $actions);
    $runId = $this->startRunFor(['seed' => 7, 'summary' => ['activeMs' => 20000, 'reels' => 20]]);

    $this->finishRun($runId, $actions, $replay->summary->score, $replay->summary->reels)
        ->assertOk()
        ->assertJsonPath('run.status', 'flagged');
    expect(collect(Run::query()->findOrFail($runId)->flags)->pluck('code')->all())->toContain('hold_bounds');
});

test("an app that shows another score than the server's is flagged", function () {
    $this->signIn();
    $fixture = replayFixture('good-42');

    $runId = $this->startRunFor($fixture);
    $this->finishRun($runId, $fixture['actions'], 99999999, 1)
        ->assertOk()
        ->assertJsonPath('run.status', 'flagged')
        ->assertJsonPath('run.score', $fixture['summary']['score']);

    $flag = Run::query()->findOrFail($runId)->flags[0];
    expect($flag)->toMatchArray([
        'code' => 'client_mismatch',
        'serverScore' => $fixture['summary']['score'],
        'clientScore' => 99999999,
        'severity' => 'hard',
    ]);
});

test("a banned player's runs are kept but never ranked", function () {
    $this->signIn(User::factory()->withUsername()->create(['banned_at' => now()]));
    $fixture = replayFixture('pro-7919');

    $this->finishRun($this->startRunFor($fixture), $fixture['actions'], $fixture['summary']['score'], $fixture['summary']['reels'])
        ->assertOk()
        ->assertJsonPath('run.status', 'flagged');

    expect(Run::query()->firstOrFail()->flags[0]['code'])->toBe('banned')
        ->and(LeaderboardEntry::query()->count())->toBe(0);
});

test('a robotic rhythm holds a top score for review', function () {
    $this->signIn();
    $actions = playedLog(seed: 4242, reels: 80, decisionMs: 420);
    $runId = $this->startRunFor(['seed' => 4242, 'summary' => ['activeMs' => 80000, 'reels' => 80]]);

    $this->finishRun($runId, $actions, Engine::replay(4242, $actions)->summary->score, 80)
        ->assertOk()
        ->assertJsonPath('run.status', 'review')
        ->assertJsonPath('best', null)
        ->assertJsonPath('league', null);

    $flags = Run::query()->findOrFail($runId)->flags;
    expect(collect($flags)->firstWhere('code', 'reaction_cv')['severity'])->toBe('soft')
        ->and(LeaderboardEntry::query()->count())->toBe(0);
});

test('a soft signal on a score far from the top ranks, with the signal kept', function () {
    foreach (range(1, 10) as $i) {
        $this->recordRanked(User::factory()->withUsername("usta{$i}")->create(), 50_000_000 + $i);
    }
    $this->signIn();
    $actions = playedLog(seed: 4242, reels: 80, decisionMs: 420);
    $runId = $this->startRunFor(['seed' => 4242, 'summary' => ['activeMs' => 80000, 'reels' => 80]]);

    $this->finishRun($runId, $actions, Engine::replay(4242, $actions)->summary->score, 80)
        ->assertOk()
        ->assertJsonPath('run.status', 'ranked');

    expect(collect(Run::query()->findOrFail($runId)->flags)->pluck('severity')->unique()->all())->toBe(['soft']);
});

test('a score three times the player\'s best, after enough runs, is a soft signal', function () {
    $user = $this->signIn();
    Run::factory()->count(5)->for($user)->ranked(1000)->create();
    $this->recordRanked($user, 1000);
    foreach (range(1, 10) as $i) {
        $this->recordRanked(User::factory()->withUsername("usta{$i}")->create(), 50_000_000 + $i);
    }
    $fixture = replayFixture('good-42');

    $runId = $this->startRunFor($fixture);
    $this->finishRun($runId, $fixture['actions'], $fixture['summary']['score'], $fixture['summary']['reels'])
        ->assertJsonPath('run.status', 'ranked');

    expect(collect(Run::query()->findOrFail($runId)->flags)->pluck('code')->all())->toContain('score_jump');
});

test('statuses the app is told are only the ones it can act on', function () {
    expect(collect(RunStatus::cases())->filter->isVisible()->map->value->values()->all())
        ->toBe(['ranked', 'flagged', 'review', 'played']);
});
