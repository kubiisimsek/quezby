<?php

use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Schema;
use Illuminate\Testing\TestResponse;

/*
| A token's first request of the Istanbul day puts the phone into the device
| registry — every player's — and marks a consenting player's day. Later
| requests that day write nothing: the gate is the token's previous
| `last_used_at`, which Sanctum moves on every request anyway. Real tokens,
| so Sanctum really does.
*/

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-26 12:00', 'Europe/Istanbul'));
});

function presenceRequest(string $token, ?string $device = null, string $version = '1.0.0'): TestResponse
{
    app('auth')->forgetGuards();
    $headers = ['X-App-Version' => $version] + ($device === null ? [] : ['X-Device' => $device]);

    return test()->withToken($token)->withHeaders($headers)->getJson('/api/v1/me')->assertOk();
}

test('the day\'s first request records the phone, and a consenting player\'s day', function () {
    $player = User::factory()->withUsername()->consenting()->create();

    presenceRequest($this->tokenFor($player), deviceHeaderOf());

    $device = DB::table('player_devices')->where('user_id', $player->id)->first();
    expect($device->install_id)->toBe('c0ffee00c0ffee00')
        ->and($device->platform)->toBe('ios')
        ->and($device->os_version)->toBe('18.2')
        ->and($device->model)->toBe('iPhone 15 Pro')
        ->and($device->app_build)->toBe('42')
        ->and($device->app_version)->toBe('1.0.0')
        ->and($device->first_seen_at)->toBe(now()->utc()->format('Y-m-d H:i:s'))
        ->and($device->last_seen_at)->toBe(now()->utc()->format('Y-m-d H:i:s'));
    $this->assertDatabaseHas('analytics_player_days', ['user_id' => $player->id, 'day' => '2026-09-26', 'age' => 0, 'visits' => 0, 'platform' => 'ios', 'app_version' => '1.0.0']);
    expect(analyticsTotals('2026-09-26'))->toBe(['active' => 1, 'age:0' => 1]);
});

test('later requests that day write nothing', function () {
    $player = User::factory()->withUsername()->consenting()->create();
    $token = $this->tokenFor($player);
    presenceRequest($token, deviceHeaderOf());

    $this->travel(3)->hours();
    presenceRequest($token, deviceHeaderOf(model: 'iPhone 16'), '1.0.1');

    $device = DB::table('player_devices')->where('user_id', $player->id)->first();
    expect($device->model)->toBe('iPhone 15 Pro')
        ->and($device->app_version)->toBe('1.0.0')
        ->and(analyticsTotals('2026-09-26'))->toBe(['active' => 1, 'age:0' => 1]);
});

test('the next day counts again: the day, the cohort\'s day 1, the newest labels', function () {
    $player = User::factory()->withUsername()->consenting()->create();
    $token = $this->tokenFor($player);
    presenceRequest($token, deviceHeaderOf());

    Carbon::setTestNow(Carbon::parse('2026-09-27 09:00', 'Europe/Istanbul'));
    presenceRequest($token, deviceHeaderOf(os: '18.3'), '1.1.0');

    $device = DB::table('player_devices')->where('user_id', $player->id)->first();
    expect($device->os_version)->toBe('18.3')
        ->and($device->app_version)->toBe('1.1.0')
        ->and($device->first_seen_at)->toBe(Carbon::parse('2026-09-26 12:00', 'Europe/Istanbul')->utc()->format('Y-m-d H:i:s'))
        ->and($device->last_seen_at)->toBe(now()->utc()->format('Y-m-d H:i:s'));
    $this->assertDatabaseHas('analytics_player_days', ['user_id' => $player->id, 'day' => '2026-09-27', 'age' => 1]);
    expect(analyticsTotals('2026-09-26'))->toBe(['active' => 1, 'age:0' => 1, 'age:1' => 1])
        ->and(analyticsTotals('2026-09-27'))->toBe(['active' => 1]);
});

test('a player who has not said yes is in the registry, and nowhere else', function () {
    $player = User::factory()->withUsername()->create();

    presenceRequest($this->tokenFor($player), deviceHeaderOf(platform: 'android', os: '14', model: 'Pixel 8'));

    $this->assertDatabaseHas('player_devices', ['user_id' => $player->id, 'platform' => 'android', 'model' => 'Pixel 8']);
    expect(DB::table('analytics_player_days')->count())->toBe(0)
        ->and(DB::table('analytics_totals')->count())->toBe(0);
});

test('a player who said yes only later does not skew the cohorts', function () {
    $player = User::factory()->withUsername()->consenting()->create(['created_at' => now()->subDays(3)]);

    presenceRequest($this->tokenFor($player), deviceHeaderOf());

    $this->assertDatabaseHas('analytics_player_days', ['user_id' => $player->id, 'day' => '2026-09-26', 'age' => 3]);
    expect(analyticsTotals('2026-09-26'))->toBe(['active' => 1])
        ->and(analyticsTotals('2026-09-23'))->toBe([]);
});

test('a request without a sound device header still marks the day', function (?string $header) {
    $player = User::factory()->withUsername()->consenting()->create();

    presenceRequest($this->tokenFor($player), $header);

    expect(DB::table('player_devices')->count())->toBe(0);
    $this->assertDatabaseHas('analytics_player_days', ['user_id' => $player->id, 'day' => '2026-09-26']);
})->with([
    'none' => [null],
    'no install' => ['platform=ios; os=18.2'],
    'a short install' => ['install=abc; platform=ios'],
    'an install with a space' => ['install=c0ffee00%20c0ffee00; platform=ios'],
]);

test('a player signed in another way than a token writes nothing', function () {
    $this->signIn(User::factory()->withUsername()->consenting()->create());

    $this->withHeaders(['X-Device' => deviceHeaderOf()])->getJson('/api/v1/me')->assertOk();

    expect(DB::table('player_devices')->count())->toBe(0)
        ->and(DB::table('analytics_player_days')->count())->toBe(0);
});

test('a failure never breaks the player\'s request', function () {
    Exceptions::fake();
    Schema::drop('player_devices');
    $player = User::factory()->withUsername()->consenting()->create();

    presenceRequest($this->tokenFor($player), deviceHeaderOf());

    Exceptions::assertReported(QueryException::class);
});

test('keeps the newest phones of a player, a few at most', function () {
    config(['quezby.devices.per_player' => 2]);
    $player = User::factory()->withUsername()->create();

    foreach (['aaaaaaaa1', 'bbbbbbbb2', 'cccccccc3'] as $day => $install) {
        Carbon::setTestNow(Carbon::parse('2026-09-26 12:00', 'Europe/Istanbul')->addDays($day));
        presenceRequest($this->tokenFor($player), deviceHeaderOf(install: $install));
    }

    expect(DB::table('player_devices')->where('user_id', $player->id)->orderBy('install_id')->pluck('install_id')->all())
        ->toBe(['bbbbbbbb2', 'cccccccc3']);
});
