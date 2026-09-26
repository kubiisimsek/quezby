<?php

use App\Models\User;
use App\Services\Analytics\Upkeep;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

/*
| Analytics stops growing: what outlived its keep goes, a few hundred rows a
| statement — by itself at most once an hour after a response, or all at
| once from the command and the admin panel.
*/

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-26 12:00', 'Europe/Istanbul'));
    config(['quezby.analytics.upkeep_chunk' => 2]);
});

/** Old and fresh rows in every layer: 3 visits past 30 days, 3 player days past 90, 3 phones past 180. */
function staleAnalytics(User $player): void
{
    $at = fn (int $daysAgo) => now()->subDays($daysAgo)->utc()->format('Y-m-d H:i:s');
    foreach ([31, 40, 50, 2] as $index => $daysAgo) {
        DB::table('analytics_visits')->insert([
            'user_id' => $player->id, 'client_id' => str_repeat((string) $index, 32), 'day' => now()->subDays($daysAgo)->format('Y-m-d'),
            'started_at' => $at($daysAgo), 'seconds' => 60, 'journey' => '[]', 'created_at' => $at($daysAgo),
        ]);
    }
    foreach ([91, 100, 120, 1] as $daysAgo) {
        DB::table('analytics_player_days')->insert(['user_id' => $player->id, 'day' => now()->subDays($daysAgo)->format('Y-m-d'), 'age' => 0]);
    }
    foreach ([181, 200, 300, 3] as $index => $daysAgo) {
        DB::table('player_devices')->insert(['user_id' => $player->id, 'install_id' => "install-{$index}", 'first_seen_at' => $at($daysAgo), 'last_seen_at' => $at($daysAgo)]);
    }
}

test('prunes what outlived its keep, a chunk at a time', function () {
    $player = User::factory()->withUsername()->create(['created_at' => now()->subYear()]);
    staleAnalytics($player);
    $upkeep = app(Upkeep::class);

    expect($upkeep->prune(1))->toBe(['visits' => 2, 'days' => 2, 'devices' => 2])
        ->and($upkeep->prune())->toBe(['visits' => 1, 'days' => 1, 'devices' => 1])
        ->and($upkeep->prune())->toBe(['visits' => 0, 'days' => 0, 'devices' => 0]);

    expect(DB::table('analytics_visits')->count())->toBe(1)
        ->and(DB::table('analytics_player_days')->count())->toBe(1)
        ->and(DB::table('player_devices')->pluck('install_id')->all())->toBe(['install-3']);
});

test('the API prunes by itself at most once an hour, after a response', function () {
    $player = $this->signIn(User::factory()->withUsername()->consenting()->create(['created_at' => now()->subYear()]));
    staleAnalytics($player);

    $this->postJson('/api/v1/analytics/visits', analyticsBatch(analyticsVisit()))->assertOk();
    // One round: a chunk from each layer.
    expect(DB::table('analytics_visits')->count())->toBe(3)
        ->and(DB::table('player_devices')->count())->toBe(2);

    $this->postJson('/api/v1/analytics/visits', analyticsBatch(analyticsVisit()))->assertOk();
    expect(DB::table('player_devices')->count())->toBe(2);

    $this->travel(61)->minutes();
    $this->postJson('/api/v1/analytics/visits', analyticsBatch(analyticsVisit()))->assertOk();
    expect(DB::table('player_devices')->count())->toBe(1);
});

test('the command prunes everything and says so', function () {
    staleAnalytics(User::factory()->withUsername()->create(['created_at' => now()->subYear()]));

    expect(Artisan::call('quezby:analytics:prune'))->toBe(0)
        ->and(Artisan::output())->toContain('Pruned 3 visits, 3 player days and 3 phones');
    expect(DB::table('analytics_visits')->count())->toBe(1);
});
