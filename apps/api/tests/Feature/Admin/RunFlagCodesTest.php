<?php

use App\Enums\RunFlag;
use App\Enums\RunStatus;
use App\Game\Run as Engine;
use App\Models\Run;
use App\Models\User;
use App\Services\ModerationService;
use App\Support\Actor;
use Illuminate\Support\Carbon;

/*
| `runs.flag_codes` follows `runs.flags` whichever way a run is closed or
| changed, so the admin panel can find runs by a flag.
*/

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-25 12:00', 'Europe/Istanbul'));
});

test('a run the verifier flags carries its codes', function () {
    $this->signIn();
    $start = $this->startRun()->assertCreated();
    $actions = playedLog($start->json('seed'), 60, 430, 110);
    $summary = Engine::replay($start->json('seed'), $actions)->summary;
    Run::query()->whereKey($start->json('runId'))->update(['started_at' => now()->subMinutes(10)]);

    $this->finishRun($start->json('runId'), $actions, $summary->score + 500, $summary->reels)->assertOk();

    $run = Run::query()->findOrFail($start->json('runId'));
    expect($run->status)->toBe(RunStatus::Flagged)
        ->and($run->flag_codes)->toContain(',client_mismatch,');
});

test('a clean run carries none', function () {
    $this->signIn();

    $this->playFeed()->assertOk();

    expect(Run::query()->sole()->flag_codes)->toBeNull();
});

test('a log the engine refuses carries engine_error', function () {
    $this->signIn();
    $runId = $this->startRun()->assertCreated()->json('runId');

    $this->finishRun($runId, [[9, 100, 0]], 0, 1, []);

    expect(Run::query()->findOrFail($runId)->flag_codes)->toBe(',engine_error,');
});

test('a run made with flags carries their codes', function () {
    $run = Run::factory()->ranked(100)->create(['flags' => [['code' => 'reaction_cv', 'severity' => 'soft']]]);

    expect($run->fresh()->flag_codes)->toBe(',reaction_cv,');
});

test('rejecting a run adds moderator to its codes', function () {
    $player = User::factory()->withUsername('hileci')->create();
    $run = Run::factory()->for($player)->ranked(100)->create(['flags' => [['code' => 'reaction_cv', 'severity' => 'soft']]]);

    app(ModerationService::class)->reject($run->load('user'), 'Bot gibi', Actor::cli());

    expect($run->fresh()->flag_codes)->toBe(',reaction_cv,moderator,');
});

test('a run is found by its flag and no other', function () {
    Run::factory()->ranked(100)->create(['flags' => [['code' => 'slow_timing', 'severity' => 'soft']]]);
    Run::factory()->ranked(100)->create(['flags' => [['code' => 'slow_motion', 'severity' => 'hard']]]);

    expect(Run::query()->withFlag(RunFlag::SlowTiming)->count())->toBe(1)
        ->and(Run::query()->withFlag(RunFlag::WallClock)->count())->toBe(0);
});
