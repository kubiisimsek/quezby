<?php

use App\Enums\AdminRole;
use App\Enums\RatingKind;
use App\Enums\RunMode;
use App\Enums\RunStatus;
use App\Models\PlayerRating;
use App\Models\RatingChange;
use App\Models\Run;
use App\Models\User;
use Illuminate\Support\Carbon;

/*
| A rated run that never gets its finish — left for a new one, past its
| time, or a log the engine throws out — is a forfeit: the full loss.
| Otherwise the way out of a bad run would be to cut the connection and
| start another. A free, daily or VS run left open costs no Elo.
*/

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-10-01 12:00', 'Europe/Istanbul'));
});

function forfeitOf(Run $run): ?RatingChange
{
    return RatingChange::query()->where('run_id', $run->id)->first();
}

test('starting a new run forfeits the rated one left open', function () {
    $player = $this->signIn();
    $this->rate($player, 2500);
    $left = Run::factory()->for($player)->rated()->create(['open_user_id' => $player->id, 'started_at' => now()->subMinutes(3)]);

    $this->startRun()->assertCreated();

    expect($left->refresh()->status)->toBe(RunStatus::Abandoned)
        ->and(forfeitOf($left))->kind->toBe(RatingKind::Forfeit)->delta->toBe(-100)
        ->and(PlayerRating::query()->findOrFail($player->id)->rating)->toBe(2400);
});

test('a free, daily or VS run left open costs no Elo', function (RunMode $mode) {
    $player = $this->signIn();
    $this->rate($player, 2500);
    $left = Run::factory()->for($player)->create(['mode' => $mode, 'open_user_id' => $player->id, 'started_at' => now()->subMinutes(3)]);

    $this->startRun()->assertCreated();

    expect($left->refresh()->status)->toBe(RunStatus::Abandoned)
        ->and(forfeitOf($left))->toBeNull()
        ->and(PlayerRating::query()->findOrFail($player->id)->rating)->toBe(2500);
})->with([RunMode::Free, RunMode::Daily, RunMode::Vs]);

test('a run past its time is forfeited when the player starts the next one', function () {
    $player = $this->signIn();
    $this->rate($player, 2500);
    $stale = Run::factory()->for($player)->rated()->create(['open_user_id' => $player->id, 'started_at' => now()->subHours(3)]);

    $this->startRun()->assertCreated();

    expect($stale->refresh()->status)->toBe(RunStatus::Expired)
        ->and(forfeitOf($stale)?->kind)->toBe(RatingKind::Forfeit);
});

test('a finish that comes too late is refused, and forfeited', function () {
    $player = $this->signIn();
    $this->rate($player, 2500);
    $start = $this->startRun(['mode' => 'rated'])->assertCreated();
    $run = Run::query()->findOrFail($start->json('runId'));
    $run->forceFill(['started_at' => now()->subHours(3)])->save();

    $this->assertApiError($this->finishRun($run->id, playedLog($run->seed, 10, 430), 0, 10), 410, 'run_expired');

    expect(forfeitOf($run)?->delta)->toBe(-100);
});

test('a log the engine throws out is forfeited', function () {
    $player = $this->signIn();
    $this->rate($player, 2500);
    $start = $this->startRun(['mode' => 'rated'])->assertCreated();

    // A hold on a swipe reel's move that the app could never send.
    $this->assertApiError($this->finishRun($start->json('runId'), [[9, 400, 0]], 0, 1), 422, 'run_rejected');

    expect(forfeitOf(Run::query()->findOrFail($start->json('runId'))))->kind->toBe(RatingKind::Forfeit)->delta->toBe(-100);
});

test('a run of a past season left open is only noted', function () {
    $player = $this->signIn();
    $this->rate($player, 2500);
    $old = Run::factory()->for($player)->rated()->create(['engine_version' => 1, 'open_user_id' => $player->id, 'started_at' => now()->subMinutes(3)]);

    $this->startRun()->assertCreated();

    expect(forfeitOf($old))->kind->toBe(RatingKind::Void)->delta->toBe(0)
        ->and(PlayerRating::query()->findOrFail($player->id)->rating)->toBe(2500);
});

test('the hourly sweep forfeits every run past its time, once', function () {
    $players = User::factory()->withUsername()->count(3)->create();
    foreach ($players as $player) {
        $this->rate($player, 3000);
    }
    $stale = Run::factory()->for($players[0])->rated()->create(['started_at' => now()->subHours(3)]);
    $staleVs = Run::factory()->for($players[1])->create(['mode' => RunMode::Vs, 'started_at' => now()->subHours(3)]);
    $fresh = Run::factory()->for($players[2])->rated()->create(['started_at' => now()->subMinutes(5)]);

    $this->artisan('quezby:runs:expire')->expectsOutputToContain('Expired 2 runs')->assertSuccessful();
    $this->artisan('quezby:runs:expire')->expectsOutputToContain('Expired 0 runs')->assertSuccessful();

    expect($stale->refresh()->status)->toBe(RunStatus::Expired)
        ->and($staleVs->refresh()->status)->toBe(RunStatus::Expired)
        ->and($fresh->refresh()->status)->toBe(RunStatus::Started)
        ->and(RatingChange::query()->count())->toBe(1)
        ->and(PlayerRating::query()->findOrFail($players[0]->id)->rating)->toBe(2900);
});

test('the owner\'s expire-runs button is the same sweep', function () {
    $player = User::factory()->withUsername()->create();
    $this->rate($player, 3000);
    Run::factory()->for($player)->rated()->create(['started_at' => now()->subHours(3)]);
    $this->signInAdmin(AdminRole::Owner);

    $this->postJson('/api/v1/admin/system/expire-runs')->assertOk();

    expect(PlayerRating::query()->findOrFail($player->id)->rating)->toBe(2900);
});

test('a forfeit during placement counts as a zero', function () {
    $player = $this->signIn();
    Run::factory()->for($player)->rated()->create(['open_user_id' => $player->id, 'started_at' => now()->subMinutes(3)]);

    $this->startRun()->assertCreated();

    expect(PlayerRating::query()->findOrFail($player->id))
        ->rating->toBeNull()
        ->placement_scores->toBe([0]);
});

test('a rated run given up in its countdown is cancelled for nothing', function () {
    $player = $this->signIn();
    $this->rate($player, 2500);
    $runId = $this->startRun(['mode' => 'rated'])->assertCreated()->json('runId');

    $this->postJson("/api/v1/runs/{$runId}/cancel")->assertNoContent();
    $this->postJson("/api/v1/runs/{$runId}/cancel")->assertNoContent();

    $run = Run::query()->findOrFail($runId);
    expect($run->status)->toBe(RunStatus::Abandoned)
        ->and(forfeitOf($run))->kind->toBe(RatingKind::Void)
        ->and(PlayerRating::query()->findOrFail($player->id)->rating)->toBe(2500);
});

test('a rated run already under way is not cancelled for nothing', function () {
    $player = $this->signIn();
    $this->rate($player, 2500);
    $runId = $this->startRun(['mode' => 'rated'])->assertCreated()->json('runId');
    Run::query()->whereKey($runId)->update(['started_at' => now()->subSeconds(40)]);

    $this->postJson("/api/v1/runs/{$runId}/cancel")->assertNoContent();

    expect(forfeitOf(Run::query()->findOrFail($runId)))->kind->toBe(RatingKind::Forfeit)->delta->toBe(-100);
});

test('only the player\'s own run can be cancelled', function () {
    $other = Run::factory()->create();
    $this->signIn();

    $this->assertApiError($this->postJson("/api/v1/runs/{$other->id}/cancel"), 404, 'not_found');
    expect($other->refresh()->status)->toBe(RunStatus::Started);
});
