<?php

use App\Enums\AdminRole;
use App\Models\User;
use App\Services\Analytics\Days;
use App\Services\Analytics\VisitIngest;
use App\Support\Timestamp;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/*
| `GET /admin/analytics`: how the game is used, from the layers analytics
| keeps and the device registry — every rate worked out by the API.
*/

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-26 12:00', 'Europe/Istanbul'));
});

/**
 * Four players: `ada` and `bora` joined a week ago, `can` today — all three
 * said yes — and `deniz` today, who did not. `ada` came back the next day
 * and today; `bora` never did.
 *
 * @return array<string, User>
 */
function analyticsPlayers(): array
{
    $weekAgo = Carbon::parse('2026-09-19 10:00', 'Europe/Istanbul')->utc();
    $players = [
        'ada' => User::factory()->withUsername('guest12345678')->consenting($weekAgo)->create(['created_at' => $weekAgo]),
        'bora' => User::factory()->withUsername('bora')->linked('bora@quezby.com')->consenting($weekAgo)->create(['created_at' => $weekAgo]),
        'can' => User::factory()->withUsername('can')->consenting()->create(),
        'deniz' => User::factory()->withUsername('deniz')->create(),
    ];

    $days = app(Days::class);
    foreach (['2026-09-19', '2026-09-20', '2026-09-26'] as $day) {
        $days->touch($players['ada'], $day, 'ios', '1.0.0');
    }
    $days->touch($players['bora'], '2026-09-19', 'ios', '1.0.0');
    app(VisitIngest::class)->store($players['can'], analyticsBatch(analyticsVisit([
        'journey' => [['tutorial', 0], ['tutorial_done', 80], ['home', 90], ['game', 100], ['share_result', 230]],
        'counts' => ['tutorial' => 1, 'tutorial_done' => 1, 'home' => 1, 'game' => 1, 'share_result' => 1],
    ])));
    test()->recordRanked($players['ada'], 4000);

    $seen = fn (int $daysAgo) => now()->subDays($daysAgo)->utc()->format('Y-m-d H:i:s');
    DB::table('player_devices')->insert([
        ['user_id' => $players['ada']->id, 'install_id' => 'install-ada', 'platform' => 'ios', 'os_version' => '18.2', 'model' => 'iPhone 15 Pro', 'app_version' => '1.0.0', 'app_build' => '42', 'first_seen_at' => $seen(7), 'last_seen_at' => $seen(0)],
        ['user_id' => $players['can']->id, 'install_id' => 'install-can', 'platform' => 'android', 'os_version' => '14', 'model' => 'Pixel 8', 'app_version' => '1.1.0', 'app_build' => '43', 'first_seen_at' => $seen(0), 'last_seen_at' => $seen(0)],
        ['user_id' => $players['deniz']->id, 'install_id' => 'install-deniz', 'platform' => 'ios', 'os_version' => '17.5.1', 'model' => 'iPhone 12', 'app_version' => '1.0.0', 'app_build' => '42', 'first_seen_at' => $seen(1), 'last_seen_at' => $seen(1)],
        ['user_id' => $players['bora']->id, 'install_id' => 'install-bora', 'platform' => 'ios', 'os_version' => '18.1', 'model' => 'iPhone 13', 'app_version' => '0.9.0', 'app_build' => '30', 'first_seen_at' => $seen(10), 'last_seen_at' => $seen(10)],
    ]);
    $players['ada']->createToken('ios')->accessToken->forceFill(['last_used_at' => now()->subMinutes(2)])->save();
    $players['deniz']->createToken('ios')->accessToken->forceFill(['last_used_at' => now()->subMinutes(1)])->save();
    $players['bora']->createToken('ios')->accessToken->forceFill(['last_used_at' => now()->subHour()])->save();

    return $players;
}

test('says how the game is used today and over thirty days', function () {
    analyticsPlayers();
    $this->signInAdmin(AdminRole::Viewer);

    $response = $this->getJson('/api/v1/admin/analytics')->assertOk()
        ->assertJsonPath('today', '2026-09-26')
        ->assertJsonPath('days', 30)
        ->assertJsonPath('collecting', ['enabled' => true, 'sample' => 1000])
        ->assertJsonPath('consent', ['players' => 4, 'granted' => 3, 'rate' => 750, 'newPlayers' => 4, 'newGranted' => 3, 'newRate' => 750])
        // `bora` was last active a week ago: in the month, not in the last 7 days. Online counts every player.
        ->assertJsonPath('now', ['online' => 2, 'active' => 2, 'weekly' => 2, 'monthly' => 3, 'stickiness' => 667]);

    $series = $response->json('series');
    expect($series['days'])->toHaveCount(30)
        ->and($series['days'][29])->toBe('2026-09-26')
        ->and(array_slice($series['active'], -1))->toBe([2])
        ->and(array_slice($series['newcomers'], -1))->toBe([1])
        ->and(array_slice($series['returning'], -1))->toBe([1])
        ->and(array_slice($series['visits'], -1))->toBe([1])
        ->and(array_slice($series['minutes'], -1))->toBe([4])
        ->and(array_slice($series['avgVisitSeconds'], -1))->toBe([240])
        ->and($series['avgVisitSeconds'][0])->toBeNull()
        // The 19th: `ada` and `bora` joined and played.
        ->and($series['active'][22])->toBe(2)
        ->and($series['newcomers'][22])->toBe(2);
});

test('follows each week\'s newcomers back, only over the days that are over', function () {
    analyticsPlayers();
    $this->signInAdmin(AdminRole::Viewer);

    $retention = $this->getJson('/api/v1/admin/analytics')->assertOk()->json('retention');

    expect($retention)->toHaveCount(8)
        ->and($retention[0])->toBe(['week' => '2026-W39', 'players' => 1, 'd1' => null, 'd3' => null, 'd7' => null, 'd14' => null, 'd30' => null])
        // The 19th's two: `ada` back on day 1, nobody on day 3; day 7 is today, not over yet.
        ->and($retention[1])->toBe(['week' => '2026-W38', 'players' => 2, 'd1' => 500, 'd3' => 0, 'd7' => null, 'd14' => null, 'd30' => null])
        ->and($retention[2]['players'])->toBe(0);
});

test('walks the window\'s newcomers through their first steps', function () {
    analyticsPlayers();
    $this->signInAdmin(AdminRole::Viewer);

    $this->getJson('/api/v1/admin/analytics')->assertOk()->assertJsonPath('funnel', [
        ['step' => 'joined', 'players' => 3, 'rate' => 1000],
        ['step' => 'tutorial', 'players' => 1, 'rate' => 333],
        // `ada` still plays as guest12345678.
        ['step' => 'named', 'players' => 2, 'rate' => 667],
        ['step' => 'protected', 'players' => 1, 'rate' => 333],
        ['step' => 'first_run', 'players' => 1, 'rate' => 333],
        ['step' => 'league', 'players' => 0, 'rate' => 0],
        // Only `ada` and `bora` could have come back yet.
        ['step' => 'returned', 'players' => 1, 'rate' => 500],
    ]);
});

test('ranks screens and moments, and every player\'s phones of the last week', function () {
    analyticsPlayers();
    $this->signInAdmin(AdminRole::Viewer);

    $response = $this->getJson('/api/v1/admin/analytics')->assertOk()
        ->assertJsonPath('screens', [
            ['screen' => 'game', 'views' => 1],
            ['screen' => 'home', 'views' => 1],
            ['screen' => 'tutorial', 'views' => 1],
        ])
        ->assertJsonPath('events', [
            ['event' => 'share_result', 'count' => 1],
            ['event' => 'tutorial_done', 'count' => 1],
        ]);

    // `bora`'s phone was last seen ten days ago.
    expect($response->json('devices.total'))->toBe(3)
        ->and($response->json('devices.versions'))->toBe([
            ['platform' => 'ios', 'value' => '1.0.0', 'devices' => 2, 'share' => 667],
            ['platform' => 'android', 'value' => '1.1.0', 'devices' => 1, 'share' => 333],
        ])
        ->and($response->json('devices.systems'))->toBe([
            ['platform' => 'android', 'value' => '14', 'devices' => 1, 'share' => 333],
            ['platform' => 'ios', 'value' => '17', 'devices' => 1, 'share' => 333],
            ['platform' => 'ios', 'value' => '18', 'devices' => 1, 'share' => 333],
        ])
        ->and(array_column($response->json('devices.models'), 'value'))->toBe(['Pixel 8', 'iPhone 12', 'iPhone 15 Pro']);
});

test('says what each layer holds, so its growth shows', function () {
    analyticsPlayers();
    $this->signInAdmin(AdminRole::Viewer);

    $this->getJson('/api/v1/admin/analytics')->assertOk()->assertJsonPath('storage', [
        'visits' => ['rows' => 1, 'oldest' => Timestamp::iso(now()->subMinutes(5)), 'keepDays' => 30],
        'days' => ['rows' => 5, 'oldest' => '2026-09-18T21:00:00.000Z', 'keepDays' => 90],
        'totals' => ['rows' => DB::table('analytics_totals')->count(), 'oldest' => '2026-09-18T21:00:00.000Z', 'keepDays' => null],
        'devices' => ['rows' => 4, 'oldest' => Timestamp::iso(now()->subDays(10)), 'keepDays' => 180],
        'milestones' => 1,
        'dropped' => 0,
    ]);
});

test('covers ninety days when asked, and nothing else', function () {
    $this->signInAdmin(AdminRole::Viewer);

    $response = $this->getJson('/api/v1/admin/analytics?days=90')->assertOk()->assertJsonPath('days', 90);
    expect($response->json('series.days'))->toHaveCount(90)
        ->and($response->json('retention'))->toHaveCount(12);

    $this->assertApiError($this->getJson('/api/v1/admin/analytics?days=7'), 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => ['days']]]);
});

test('answers from a minute-old copy', function () {
    $this->signInAdmin(AdminRole::Viewer);
    $player = User::factory()->withUsername()->consenting()->create();
    $this->getJson('/api/v1/admin/analytics')->assertJsonPath('now.active', 0);

    app(Days::class)->touch($player, '2026-09-26', 'ios', '1.0.0');
    $this->getJson('/api/v1/admin/analytics')->assertJsonPath('now.active', 0);

    $this->travel(61)->seconds();
    $this->getJson('/api/v1/admin/analytics')->assertJsonPath('now.active', 1);
});

test('says when analytics is switched off or kept for a share of players', function () {
    config(['quezby.analytics.enabled' => false, 'quezby.analytics.sample' => 250]);
    $this->signInAdmin(AdminRole::Viewer);

    $this->getJson('/api/v1/admin/analytics')->assertOk()->assertJsonPath('collecting', ['enabled' => false, 'sample' => 250]);
});
