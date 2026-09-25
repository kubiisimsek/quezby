<?php

use App\Enums\AdminRole;
use App\Enums\RunStatus;
use App\Models\LeaderboardEntry;
use App\Models\Run;
use App\Models\User;
use Illuminate\Support\Carbon;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-25 12:00', 'Europe/Istanbul'));
    $this->signInAdmin(AdminRole::Viewer);
});

test('says how the game is doing today and over thirty days', function () {
    $old = User::factory()->withUsername('eski')->create(['created_at' => now()->subDays(3)]);
    $new = User::factory()->withUsername('yeni')->create();
    User::factory()->withUsername('yasakli')->create(['created_at' => now()->subDays(40), 'banned_at' => now()]);
    $this->recordRanked($old, 5000);
    $this->recordRanked($new, 7000);
    Run::factory()->for($new)->ranked(100)->create(['status' => RunStatus::Flagged, 'flags' => [['code' => 'wall_clock', 'severity' => 'hard']]]);
    Run::factory()->for($old)->ranked(99000)->create(['status' => RunStatus::Review, 'flags' => [['code' => 'reaction_cv', 'severity' => 'soft'], ['code' => 'wall_clock', 'severity' => 'hard']]]);
    Run::factory()->for($old)->ranked(10)->create(['finished_at' => now()->subDays(2)]);
    LeaderboardEntry::query()->create(['season' => 2, 'period' => 'challenge', 'period_key' => '2026-09-25', 'user_id' => $new->id, 'score' => 10, 'reels' => 5, 'achieved_at' => now()]);

    $response = $this->getJson('/api/v1/admin/overview')->assertOk()
        ->assertJsonPath('today', '2026-09-25')
        ->assertJsonPath('dailyNumber', 2)
        ->assertJsonPath('season', 2)
        ->assertJsonPath('kpis', [
            'players' => 3,
            'newToday' => 1,
            'activeToday' => 2,
            'runsToday' => 4,
            'rankedToday' => 2,
            'flaggedToday' => 1,
            'review' => 1,
            'banned' => 1,
            'dailyPlayers' => 1,
        ])
        ->assertJsonPath('topFlags', [
            ['code' => 'wall_clock', 'severity' => 'hard', 'count' => 2],
            ['code' => 'reaction_cv', 'severity' => 'soft', 'count' => 1],
        ])
        ->assertJsonPath('queue.0.score', 99000);

    $series = $response->json('series');
    expect($series['days'])->toHaveCount(30)
        ->and($series['days'][29])->toBe('2026-09-25')
        ->and($series['newPlayers'])->toHaveCount(30)
        ->and($series['newPlayers'][26])->toBe(1)
        ->and($series['runs'][27])->toBe(1)
        ->and($series['runs'][29])->toBe(4)
        ->and($series['activePlayers'][29])->toBe(2)
        ->and($series['flagged'][29])->toBe(1);
});

test('says nothing is wrong on an empty game', function () {
    $this->getJson('/api/v1/admin/overview')->assertOk()
        ->assertJsonPath('kpis.players', 0)
        ->assertJsonPath('topFlags', [])
        ->assertJsonPath('queue', []);
});
