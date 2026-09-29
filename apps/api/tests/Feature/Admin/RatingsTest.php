<?php

use App\Enums\AdminRole;
use App\Enums\LeagueTier;
use App\Enums\RunStatus;
use App\Models\PlayerRating;
use App\Models\RatingChange;
use App\Models\Run;
use App\Models\User;
use App\Services\Rating\RatingService;
use Illuminate\Support\Carbon;

/*
| The ratings on the admin panel: players per league, the highest, a player's
| rating and its history, what a run did — and how the targets fit real
| players. Nothing here changes a rating.
*/

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-10-01 12:00', 'Europe/Istanbul'));
    pinRatingTargets();
    $this->signInAdmin(AdminRole::Viewer);
});

test('counts players per league, those who played lately apart, and lists the highest', function () {
    $players = User::factory()->withUsername()->count(5)->create();
    $this->rate($players[0], 5300);
    $this->rate($players[1], 2100);
    $this->rate($players[2], 2900, now()->subDays(30));
    $this->rate($players[3], 800);
    $this->rate($players[4], 6000);
    $players[4]->forceFill(['banned_at' => now()])->save();
    PlayerRating::query()->create(['user_id' => User::factory()->withUsername()->create()->id, 'placement_scores' => [1]]);

    $this->getJson('/api/v1/admin/ratings')->assertOk()
        ->assertJsonPath('tiers', ['bronze' => 1, 'silver' => 0, 'gold' => 2, 'platinum' => 0, 'diamond' => 0, 'master' => 1])
        ->assertJsonPath('active', ['bronze' => 1, 'silver' => 0, 'gold' => 1, 'platinum' => 0, 'diamond' => 0, 'master' => 1])
        ->assertJsonPath('placing', 1)
        ->assertJsonPath('top.*.rating', [5300, 2900, 2100, 800])
        ->assertJsonPath('top.0.player.username', $players[0]->username)
        ->assertJsonPath('top.0.tier', 'master')
        ->assertJsonPath('rules.maxDelta', 100)
        ->assertJsonPath('rules.activeDays', 14)
        ->assertJsonPath('rules.unlockRuns', 20)
        ->assertJsonPath('rules.targets.1', ['rating' => 1000, 'score' => 34000]);
});

test('a player\'s page shows their rating and every change, the runs that did not count too', function () {
    $player = User::factory()->withUsername()->create();
    $this->rate($player, 1990, attributes: ['peak' => 2200]);
    $ratings = app(RatingService::class);
    $counted = Run::factory()->for($player)->rated()->ranked(240000)->create();
    $ratings->forFinishedRun($counted);
    $ratings->forFinishedRun(Run::factory()->for($player)->rated()->ranked(5000)->create([
        'status' => RunStatus::Flagged, 'flags' => [['code' => 'device_integrity', 'severity' => 'hard']],
    ]));

    $this->getJson("/api/v1/admin/players/{$player->id}")->assertOk()
        ->assertJsonPath('rating.tier', 'gold')
        ->assertJsonPath('rating.peak', 2200)
        ->assertJsonPath('rating.shield', ['tier' => 'gold', 'runs' => 3])
        ->assertJsonPath('rating.placement', null)
        ->assertJsonPath('rating.history.*.kind', ['void', 'run'])
        ->assertJsonPath('rating.history.0.counted', false)
        ->assertJsonPath('rating.history.1.runId', $counted->id)
        ->assertJsonPath('rating.history.1.performance', 3000)
        ->assertJsonPath('rating.history.1.width', 800);

    $this->getJson('/api/v1/admin/players/'.User::factory()->withUsername()->create()->id)->assertOk()->assertJsonPath('rating', null);
});

test('a run\'s page says what it did to the rating, and whether a moderator took it back', function () {
    $player = User::factory()->withUsername()->create();
    $this->rate($player, 1500);
    $run = Run::factory()->for($player)->rated()->ranked(100000)->create();
    app(RatingService::class)->forFinishedRun($run);

    $this->getJson("/api/v1/admin/runs/{$run->id}")->assertOk()
        ->assertJsonPath('run.rating.kind', 'run')
        ->assertJsonPath('run.rating.delta', 55)
        ->assertJsonPath('run.rating.target', 58400)
        ->assertJsonPath('run.rating.reversedBy', null);

    app(RatingService::class)->rejected($run);
    $this->getJson("/api/v1/admin/runs/{$run->id}")->assertJsonPath('run.rating.reversedBy', -55);

    $open = Run::factory()->for($player)->create();
    $this->getJson("/api/v1/admin/runs/{$open->id}")->assertOk()->assertJsonPath('run.rating', null);
});

test('the calibration report places the players who played enough, and proposes anchors for the shares', function () {
    // Twenty players, each with ten runs around their own median, 10,000 to 200,000.
    foreach (range(1, 20) as $i) {
        $player = User::factory()->withUsername()->create();
        Run::factory()->for($player)->rated()->ranked($i * 10000)->count(10)->create(['finished_at' => now()->subDays(3)]);
    }
    // Too few runs, too long ago, banned, not rated: none of them count.
    Run::factory()->rated()->ranked(999999)->count(3)->create(['finished_at' => now()->subDay()]);
    Run::factory()->for(User::factory()->withUsername()->create())->rated()->ranked(999999)->count(10)->create(['finished_at' => now()->subDays(60)]);
    Run::factory()->for(User::factory()->withUsername()->create(['banned_at' => now()]))->rated()->ranked(999999)->count(10)->create(['finished_at' => now()->subDay()]);
    // Free runs are not what a rating settles on.
    Run::factory()->for(User::factory()->withUsername()->create())->ranked(999999)->count(10)->create(['finished_at' => now()->subDay()]);
    $ratingsBefore = PlayerRating::query()->count() + RatingChange::query()->count();

    $report = $this->getJson('/api/v1/admin/ratings/calibration?days=30')->assertOk();

    $report->assertJsonPath('players', 20)
        ->assertJsonPath('days', 30)
        ->assertJsonPath('minRuns', 10)
        ->assertJsonPath('shares.bronze', 20)
        ->assertJsonPath('anchors.1.rating', 1000)
        ->assertJsonPath('anchors.1.current', 34000)
        // A fifth of twenty medians below 1000: the fifth lowest, 50,000.
        ->assertJsonPath('anchors.1.proposed', 50000)
        ->assertJsonPath('anchors.2.proposed', 120000);
    $proposed = array_column($report->json('anchors'), 'proposed');
    expect($proposed)->toBe(array_values(array_unique($proposed)))
        ->and(array_sum($report->json('settled')))->toBe(20)
        ->and(PlayerRating::query()->count() + RatingChange::query()->count())->toBe($ratingsBefore);

    $this->assertApiError($this->getJson('/api/v1/admin/ratings/calibration?days=0'), 422, 'validation_failed');
});

test('the calibration report has nothing to propose without players', function () {
    $this->getJson('/api/v1/admin/ratings/calibration')->assertOk()
        ->assertJsonPath('players', 0)
        ->assertJsonPath('anchors.0.proposed', null);
});

test('the calibrate command prints the same report and writes nothing', function () {
    foreach (range(1, 6) as $i) {
        Run::factory()->for(User::factory()->withUsername()->create())->rated()->ranked($i * 30000)->count(10)->create(['finished_at' => now()->subDay()]);
    }

    $this->artisan('quezby:rating:calibrate', ['--days' => 7])
        ->expectsOutputToContain('6 players with 10+ counted runs in 7 days')
        ->assertSuccessful();

    expect(PlayerRating::query()->count())->toBe(0)
        ->and(LeagueTier::fromRating(0))->toBe(LeagueTier::Bronze);
});
