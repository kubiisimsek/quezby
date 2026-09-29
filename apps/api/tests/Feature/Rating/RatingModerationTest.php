<?php

use App\Enums\AdminRole;
use App\Enums\RatingKind;
use App\Enums\RunStatus;
use App\Game\Run as Engine;
use App\Models\AuditEntry;
use App\Models\PlayerRating;
use App\Models\RatingChange;
use App\Models\Run;
use App\Models\User;
use App\Services\Rating\RatingService;
use Illuminate\Support\Carbon;

/*
| What moderation does to a rating: a held run counts the moment it is let
| through, from the rating the player has then; a run thrown out gives back
| what it won — never what it lost.
*/

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-10-01 12:00', 'Europe/Istanbul'));
    pinRatingTargets();
    $this->signInAdmin(AdminRole::Moderator);
});

/** A score held for review, with the log an approval replays. */
function heldRun(User $player, int $seed = 4242, int $engineVersion = 2): Run
{
    $actions = playedLog($seed, 100, 400);
    $summary = Engine::replay($seed, $actions)->summary;

    return Run::factory()->for($player)->rated()->ranked($summary->score, $summary->reels)->create([
        'seed' => $seed,
        'engine_version' => $engineVersion,
        'status' => RunStatus::Review,
        'actions' => $actions,
        'flags' => [['code' => 'reaction_cv', 'cv' => 0, 'samples' => 60, 'severity' => 'soft']],
    ]);
}

function ratingNow(User $player): ?int
{
    return PlayerRating::query()->find($player->id)?->rating;
}

test('a held run counts when it is let through, from the rating the player has then', function () {
    $player = User::factory()->withUsername()->create();
    $this->rate($player, 1500);
    $run = heldRun($player);
    // The player played on while the run waited.
    $this->rate($player, 1700);

    $this->postJson("/api/v1/admin/runs/{$run->id}/approve")->assertOk()->assertExactJson(['changed' => true]);

    $change = RatingChange::query()->where('run_id', $run->id)->sole();
    expect($change)->kind->toBe(RatingKind::Run)->before->toBe(1700)
        ->and(ratingNow($player))->toBe(1700 + $change->delta)
        ->and(AuditEntry::query()->sole()->details)->toBe(['score' => $run->score, 'ratingDelta' => $change->delta]);
});

test('a banned player\'s held run is let through without moving their rating', function () {
    $player = User::factory()->withUsername()->create(['banned_at' => now()]);
    $this->rate($player, 1500);
    $run = heldRun($player);

    $this->postJson("/api/v1/admin/runs/{$run->id}/approve")->assertOk();

    expect(ratingNow($player))->toBe(1500)
        ->and(RatingChange::query()->where('run_id', $run->id)->sole()->kind)->toBe(RatingKind::Void)
        ->and(AuditEntry::query()->sole()->details)->toBe(['score' => $run->score]);
});

test('a run of a season whose targets are gone is let through without a rating', function () {
    $player = User::factory()->withUsername()->create();
    $this->rate($player, 1500);
    $run = heldRun($player, engineVersion: 1);

    $this->postJson("/api/v1/admin/runs/{$run->id}/approve")->assertOk();

    expect(ratingNow($player))->toBe(1500)
        ->and(RatingChange::query()->where('run_id', $run->id)->sole()->kind)->toBe(RatingKind::Void);
});

test('a run thrown out gives back what it won, once', function () {
    $player = User::factory()->withUsername()->create();
    $this->rate($player, 1500);
    $run = Run::factory()->for($player)->rated()->ranked(240000)->create();
    $won = app(RatingService::class)->forFinishedRun($run)['delta'];

    $this->postJson("/api/v1/admin/runs/{$run->id}/reject", ['reason' => 'Bot gibi'])->assertOk();

    expect($won)->toBeGreaterThan(0)
        ->and(ratingNow($player))->toBe(1500)
        ->and(RatingChange::query()->where('kind', RatingKind::Reversal->value)->sole())
        ->reversal_of->toBe(RatingChange::query()->where('run_id', $run->id)->value('id'))
        ->delta->toBe(-$won)
        ->and(AuditEntry::query()->sole()->details)->toMatchArray(['ratingDelta' => -$won]);

    expect(app(RatingService::class)->rejected($run))->toBeNull()
        ->and(ratingNow($player))->toBe(1500);
});

test('a run thrown out that lost keeps its loss', function () {
    $player = User::factory()->withUsername()->create();
    $this->rate($player, 2500);
    $run = Run::factory()->for($player)->rated()->ranked(900000)->create([
        'status' => RunStatus::Flagged,
        'flags' => [['code' => 'fast_decisions', 'severity' => 'hard']],
    ]);
    app(RatingService::class)->forFinishedRun($run);

    $this->postJson("/api/v1/admin/runs/{$run->id}/reject", ['reason' => 'Bot'])->assertOk();

    expect(ratingNow($player))->toBe(2400)
        ->and(RatingChange::query()->where('kind', RatingKind::Reversal->value)->count())->toBe(0);
});

test('a reversal never takes a rating below zero', function () {
    $player = User::factory()->withUsername()->create();
    $this->rate($player, 900);
    $run = Run::factory()->for($player)->rated()->ranked(240000)->create();
    app(RatingService::class)->forFinishedRun($run);
    $this->rate($player, 10);

    app(RatingService::class)->rejected($run);

    expect(ratingNow($player))->toBe(0);
});
