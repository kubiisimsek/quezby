<?php

use App\Enums\AdminRole;
use App\Enums\AuditAction;
use App\Enums\AuditVia;
use App\Enums\RunStatus;
use App\Game\Run as Engine;
use App\Models\AuditEntry;
use App\Models\LeaderboardEntry;
use App\Models\Run;
use App\Models\User;
use Illuminate\Support\Carbon;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-25 12:00', 'Europe/Istanbul'));
});

/** A top score held for review, with the log an approval replays. */
function adminRunHeld(User $player, int $seed = 4242): Run
{
    $actions = playedLog($seed, 100, 400);
    $summary = Engine::replay($seed, $actions)->summary;

    return Run::factory()->for($player)->ranked($summary->score, $summary->reels)->create([
        'seed' => $seed,
        'status' => RunStatus::Review,
        'actions' => $actions,
        'flags' => [['code' => 'reaction_cv', 'cv' => 0, 'samples' => 60, 'severity' => 'soft']],
    ]);
}

test('a moderator lets a held run rank, and it is on record', function () {
    $moderator = $this->signInAdmin(AdminRole::Moderator);
    $player = User::factory()->withUsername('kerem.35')->create();
    $run = adminRunHeld($player);

    $this->postJson("/api/v1/admin/runs/{$run->id}/approve")->assertOk()->assertExactJson(['changed' => true]);
    $this->postJson("/api/v1/admin/runs/{$run->id}/approve")->assertOk()->assertExactJson(['changed' => false]);

    expect($run->fresh()->status)->toBe(RunStatus::Ranked)
        ->and(LeaderboardEntry::query()->where('user_id', $player->id)->where('period', 'all')->value('score'))->toBe($run->score);

    $entry = AuditEntry::query()->sole();
    expect($entry->action)->toBe(AuditAction::RunApprove)
        ->and($entry->via)->toBe(AuditVia::Panel)
        ->and($entry->admin_id)->toBe($moderator->id)
        ->and($entry->subject_id)->toBe($run->id)
        ->and($entry->details)->toBe(['score' => $run->score]);
});

test('a moderator throws a run out and the player\'s boards are rebuilt', function () {
    $this->signInAdmin(AdminRole::Moderator);
    $player = User::factory()->withUsername('kerem.35')->create();
    $this->recordRanked($player, 3000);
    $cheated = $this->recordRanked($player, 9000);

    $this->postJson("/api/v1/admin/runs/{$cheated->id}/reject", ['reason' => 'Bot gibi'])->assertOk()->assertExactJson(['changed' => true]);

    expect($cheated->fresh()->status)->toBe(RunStatus::Rejected)
        ->and(LeaderboardEntry::query()->where('user_id', $player->id)->pluck('score')->unique()->values()->all())->toBe([3000])
        ->and(AuditEntry::query()->sole())
        ->action->toBe(AuditAction::RunReject)
        ->reason->toBe('Bot gibi');
});

test('a run that cannot be thrown out is left alone', function () {
    $this->signInAdmin(AdminRole::Moderator);
    $run = Run::factory()->create();

    $this->postJson("/api/v1/admin/runs/{$run->id}/reject", ['reason' => 'Bot gibi'])->assertOk()->assertExactJson(['changed' => false]);

    expect($run->fresh()->status)->toBe(RunStatus::Started)
        ->and(AuditEntry::query()->count())->toBe(0);
});

test('throwing a run out says why', function () {
    $this->signInAdmin(AdminRole::Moderator);
    $run = Run::factory()->ranked(100)->create();

    $this->assertApiError($this->postJson("/api/v1/admin/runs/{$run->id}/reject"), 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => ['reason']]]);
});

test('the queue\'s count is on the badge', function () {
    $this->signInAdmin(AdminRole::Viewer);
    adminRunHeld(User::factory()->withUsername('a1')->create());
    adminRunHeld(User::factory()->withUsername('a2')->create(), 99);
    Run::factory()->ranked(100)->create();

    $this->getJson('/api/v1/admin/counts')->assertOk()->assertExactJson(['review' => 2, 'reports' => 0]);
});
