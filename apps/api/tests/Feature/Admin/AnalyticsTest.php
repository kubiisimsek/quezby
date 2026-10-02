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
        ['user_id' => $players['ada']->id, 'install_id' => 'install-ada', 'platform' => 'ios', 'os_version' => '18.2', 'brand' => 'Apple', 'model' => 'iPhone 15 Pro', 'app_version' => '1.0.0', 'app_build' => '42', 'first_seen_at' => $seen(7), 'last_seen_at' => $seen(0)],
        ['user_id' => $players['can']->id, 'install_id' => 'install-can', 'platform' => 'android', 'os_version' => '14', 'brand' => 'Google', 'model' => 'Pixel 8', 'app_version' => '1.1.0', 'app_build' => '43', 'first_seen_at' => $seen(0), 'last_seen_at' => $seen(0)],
        ['user_id' => $players['deniz']->id, 'install_id' => 'install-deniz', 'platform' => 'ios', 'os_version' => '17.5.1', 'brand' => null, 'model' => 'iPhone 12', 'app_version' => '1.0.0', 'app_build' => '42', 'first_seen_at' => $seen(1), 'last_seen_at' => $seen(1)],
        ['user_id' => $players['bora']->id, 'install_id' => 'install-bora', 'platform' => 'ios', 'os_version' => '18.1', 'brand' => 'Apple', 'model' => 'iPhone 13', 'app_version' => '0.9.0', 'app_build' => '30', 'first_seen_at' => $seen(10), 'last_seen_at' => $seen(10)],
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

    // `bora`'s phone was last seen ten days ago; `deniz`'s app never named its maker, but an iPhone is Apple's.
    $phone = fn (string $value, string $version, int $share = 500) => ['value' => $value, 'devices' => 1, 'share' => $share, 'versions' => [['version' => $version, 'devices' => 1]], 'otherVersions' => 0];
    expect($response->json('devices'))->toBe([
        'total' => 3,
        'platforms' => [
            ['platform' => 'ios', 'devices' => 2, 'share' => 667, 'rows' => [$phone('17', '1.0.0'), $phone('18', '1.0.0')], 'rest' => 0],
            ['platform' => 'android', 'devices' => 1, 'share' => 333, 'rows' => [$phone('14', '1.1.0', 1000)], 'rest' => 0],
        ],
        'brands' => [
            ['brand' => 'Apple', 'devices' => 2, 'share' => 667, 'rows' => [$phone('iPhone 12', '1.0.0'), $phone('iPhone 15 Pro', '1.0.0')], 'rest' => 0],
            ['brand' => 'Google', 'devices' => 1, 'share' => 333, 'rows' => [$phone('Pixel 8', '1.1.0', 1000)], 'rest' => 0],
        ],
        'otherBrands' => ['devices' => 0, 'share' => 0, 'rows' => [], 'rest' => 0],
    ]);
});

test('splits the phones by system and by maker, the app versions under every row', function () {
    $player = User::factory()->withUsername()->create();
    $phones = [
        // platform, system, maker as stored, model, app version
        ['android', '14', 'Samsung', 'SM-S918B', '1.0.2'],
        ['android', '14', 'Samsung', 'SM-S918B', '1.0.1'],
        ['android', '10', 'Samsung', 'SM-S918B', '1.0.0'],
        ['android', '9', 'Samsung', 'SM-S918B', '0.9.0'],
        ['ios', '18.6', 'Apple', 'iPhone 15', '1.0.2'],
        ['ios', '18.5', null, 'iPhone 15', '1.0.2'],
        ['android', '14', 'Xiaomi', 'Redmi Note 12', '1.0.2'],
        ['android', '13', 'Xiaomi', 'Redmi Note 12', '1.0.2'],
        ['android', '13', null, 'SM-A546E', '1.0.0'],
        ['android', '14', 'Google', 'Pixel 8', '1.0.2'],
        ['android', '14', 'OnePlus', 'CPH2581', null],
    ];
    DB::table('player_devices')->insert(array_map(fn (array $phone, int $index) => [
        'user_id' => $player->id,
        'install_id' => "install-{$index}",
        'platform' => $phone[0],
        'os_version' => $phone[1],
        'brand' => $phone[2],
        'model' => $phone[3],
        'app_version' => $phone[4],
        'first_seen_at' => now()->utc()->format('Y-m-d H:i:s'),
        'last_seen_at' => now()->utc()->format('Y-m-d H:i:s'),
    ], $phones, array_keys($phones)));
    $this->signInAdmin(AdminRole::Viewer);

    $devices = $this->getJson('/api/v1/admin/analytics')->assertOk()->json('devices');

    $row = fn (?string $value, int $devices, int $share, array $versions, int $otherVersions = 0) => [
        'value' => $value,
        'devices' => $devices,
        'share' => $share,
        // `''` stands for phones whose app never said its version.
        'versions' => array_map(fn (string $version, int $count) => ['version' => $version === '' ? null : $version, 'devices' => $count], array_keys($versions), $versions),
        'otherVersions' => $otherVersions,
    ];
    expect($devices['total'])->toBe(11)
        // Most phones first; a tie by name, naturally (9 before 10); a tied version newest first, the nameless last.
        ->and($devices['platforms'])->toBe([
            ['platform' => 'android', 'devices' => 9, 'share' => 818, 'rows' => [
                $row('14', 5, 556, ['1.0.2' => 3, '1.0.1' => 1, '' => 1]),
                $row('13', 2, 222, ['1.0.2' => 1, '1.0.0' => 1]),
                $row('9', 1, 111, ['0.9.0' => 1]),
                $row('10', 1, 111, ['1.0.0' => 1]),
            ], 'rest' => 0],
            ['platform' => 'ios', 'devices' => 2, 'share' => 182, 'rows' => [$row('18', 2, 1000, ['1.0.2' => 2])], 'rest' => 0],
        ])
        // Three makers get a table; a row names three app versions and counts the phones on the rest.
        ->and($devices['brands'])->toBe([
            ['brand' => 'Samsung', 'devices' => 4, 'share' => 364, 'rows' => [$row('SM-S918B', 4, 1000, ['1.0.2' => 1, '1.0.1' => 1, '1.0.0' => 1], 1)], 'rest' => 0],
            ['brand' => 'Apple', 'devices' => 2, 'share' => 182, 'rows' => [$row('iPhone 15', 2, 1000, ['1.0.2' => 2])], 'rest' => 0],
            ['brand' => 'Xiaomi', 'devices' => 2, 'share' => 182, 'rows' => [$row('Redmi Note 12', 2, 1000, ['1.0.2' => 2])], 'rest' => 0],
        ])
        // The others share one table; a phone whose app is too old to name its maker comes last.
        ->and($devices['otherBrands'])->toBe(['devices' => 3, 'share' => 273, 'rows' => [
            $row('Google', 1, 333, ['1.0.2' => 1]),
            $row('OnePlus', 1, 333, ['' => 1]),
            $row(null, 1, 333, ['1.0.0' => 1]),
        ], 'rest' => 0]);
});

test('lists a table\'s ten biggest rows and counts the phones of the rest', function () {
    $player = User::factory()->withUsername()->create();
    $models = ['A0', 'A0', ...array_map(fn (int $index) => "A{$index}", range(1, 12))];
    DB::table('player_devices')->insert(array_map(fn (string $model, int $index) => [
        'user_id' => $player->id,
        'install_id' => "install-{$index}",
        'platform' => 'android',
        'os_version' => '14',
        'brand' => 'Samsung',
        'model' => $model,
        'app_version' => '1.0.2',
        'first_seen_at' => now()->utc()->format('Y-m-d H:i:s'),
        'last_seen_at' => now()->utc()->format('Y-m-d H:i:s'),
    ], $models, array_keys($models)));
    $this->signInAdmin(AdminRole::Viewer);

    $samsung = $this->getJson('/api/v1/admin/analytics')->assertOk()->json('devices.brands.0');

    expect($samsung['devices'])->toBe(14)
        ->and(array_column($samsung['rows'], 'value'))->toBe(['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9'])
        ->and($samsung['rest'])->toBe(3);
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
