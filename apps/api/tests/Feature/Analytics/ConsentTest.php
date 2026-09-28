<?php

use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/*
| The player's yes or no to usage analytics, through `PUT /me/settings`
| (`analytics`), kept as its moment on the account. A no takes back every
| row kept about them; only anonymous daily totals stay.
*/

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-26 12:00', 'Europe/Istanbul'));
});

test('saying yes keeps usage from now on, today included', function () {
    $player = User::factory()->withUsername()->create();
    $token = $this->tokenFor($player);

    // The app asks who the player is first: no consent yet, so the day's first request marks nothing.
    $this->withToken($token)->getJson('/api/v1/me')->assertJsonPath('user.settings.analytics', false);
    expect(DB::table('analytics_player_days')->count())->toBe(0);

    app('auth')->forgetGuards();
    $this->withToken($token)->putJson('/api/v1/me/settings', ['analytics' => true])
        ->assertOk()
        ->assertExactJson(['settings' => ['haptics' => true, 'analytics' => true, 'pushFriends' => true, 'pushVs' => true, 'pushMessages' => true]]);

    expect($player->fresh()->analytics_at?->equalTo(now()))->toBeTrue()
        ->and($player->fresh()->settings)->toBe(['haptics' => true]);
    $this->assertDatabaseHas('analytics_player_days', ['user_id' => $player->id, 'day' => '2026-09-26', 'age' => 0]);
    expect(analyticsTotals('2026-09-26'))->toBe(['active' => 1, 'age:0' => 1]);

    app('auth')->forgetGuards();
    $this->withToken($token)->postJson('/api/v1/analytics/visits', analyticsBatch(analyticsVisit()))->assertExactJson(['record' => true]);
    expect(DB::table('analytics_visits')->count())->toBe(1);
});

test('saying yes twice keeps the first moment', function () {
    $player = $this->signIn(User::factory()->withUsername()->consenting(now()->subDay())->create());

    $this->putJson('/api/v1/me/settings', ['analytics' => true])->assertJsonPath('settings.analytics', true);

    expect($player->fresh()->analytics_at?->equalTo(now()->subDay()))->toBeTrue();
});

test('saying no takes back what was kept about the player, but not the totals', function () {
    $player = $this->signIn(User::factory()->withUsername()->consenting()->create());
    $other = User::factory()->withUsername()->consenting()->create();
    $this->postJson('/api/v1/analytics/visits', analyticsBatch(analyticsVisit([
        'journey' => [['tutorial', 0], ['tutorial_done', 60]],
        'counts' => ['tutorial' => 1, 'tutorial_done' => 1],
    ])))->assertOk();
    DB::table('analytics_player_days')->insert(['user_id' => $other->id, 'day' => '2026-09-26', 'age' => 0, 'visits' => 1, 'seconds' => 10]);
    $totals = analyticsTotals('2026-09-26');

    $this->putJson('/api/v1/me/settings', ['analytics' => false])
        ->assertOk()
        ->assertJsonPath('settings.analytics', false);

    expect($player->fresh()->analytics_at)->toBeNull()
        ->and(DB::table('analytics_visits')->where('user_id', $player->id)->count())->toBe(0)
        ->and(DB::table('analytics_player_days')->where('user_id', $player->id)->count())->toBe(0)
        ->and(DB::table('analytics_milestones')->where('user_id', $player->id)->count())->toBe(0)
        ->and(DB::table('analytics_player_days')->where('user_id', $other->id)->count())->toBe(1)
        ->and(analyticsTotals('2026-09-26'))->toBe($totals);

    $this->postJson('/api/v1/analytics/visits', analyticsBatch(analyticsVisit()))->assertExactJson(['record' => false]);
});

test('the phone stays in the registry whatever the answer', function () {
    $player = User::factory()->withUsername()->consenting()->create();
    $this->withToken($this->tokenFor($player))->withHeaders(['X-Device' => deviceHeaderOf()])->getJson('/api/v1/me')->assertOk();

    app('auth')->forgetGuards();
    $this->signIn($player);
    $this->putJson('/api/v1/me/settings', ['analytics' => false])->assertOk();

    expect(DB::table('player_devices')->where('user_id', $player->id)->count())->toBe(1);
});

test('the answer is a JSON boolean', function (mixed $value) {
    $this->signIn();

    $this->assertApiError($this->putJson('/api/v1/me/settings', ['analytics' => $value]), 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => ['analytics']]]);
})->with(['yes', 1, null]);
