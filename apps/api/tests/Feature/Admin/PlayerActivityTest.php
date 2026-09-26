<?php

use App\Enums\AdminRole;
use App\Models\User;
use App\Services\Analytics\VisitIngest;
use App\Support\Timestamp;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/*
| `GET /admin/players/{id}/activity`: one player's last 30 days, their
| latest visits with the screens in order, and their firsts.
*/

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-26 12:00', 'Europe/Istanbul'));
    $this->signInAdmin(AdminRole::Viewer);
});

test('shows a consenting player\'s days, visits and firsts', function () {
    // In UTC, as the app stores it: Eloquent writes a date as it is, whatever its zone.
    $joined = Carbon::parse('2026-09-24 20:00', 'Europe/Istanbul')->utc();
    $player = User::factory()->withUsername('ekin')->consenting($joined)->create(['created_at' => $joined]);
    $visits = app(VisitIngest::class);

    Carbon::setTestNow($joined->copy()->addMinutes(10));
    $visits->store($player, analyticsBatch(analyticsVisit([
        'seconds' => 300,
        'journey' => [['tutorial', 0], ['tutorial_done', 120], ['username', 125], ['nickname_skip', 140], ['home', 150]],
        'counts' => ['tutorial' => 1, 'tutorial_done' => 1, 'username' => 1, 'nickname_skip' => 1, 'home' => 1],
    ])));
    Carbon::setTestNow(Carbon::parse('2026-09-26 11:00', 'Europe/Istanbul'));
    $visits->store($player, analyticsBatch(analyticsVisit(['seconds' => 120, 'journey' => [['home', 0], ['leaderboard', 30]], 'counts' => ['home' => 1, 'leaderboard' => 1]])));
    $this->recordRanked($player, 3000);
    Carbon::setTestNow(Carbon::parse('2026-09-26 12:00', 'Europe/Istanbul'));

    $response = $this->getJson("/api/v1/admin/players/{$player->id}/activity")->assertOk()
        ->assertJsonPath('status', 'tracked')
        ->assertJsonPath('consentAt', Timestamp::iso($joined))
        ->assertJsonPath('summary', ['activeDays' => 2, 'visits' => 2, 'seconds' => 420, 'avgVisitSeconds' => 210, 'firstDay' => '2026-09-24', 'lastDay' => '2026-09-26']);

    $days = collect($response->json('days'))->keyBy('day');
    expect($response->json('days'))->toHaveCount(30)
        ->and($days['2026-09-24'])->toBe(['day' => '2026-09-24', 'visits' => 1, 'seconds' => 300])
        ->and($days['2026-09-25'])->toBe(['day' => '2026-09-25', 'visits' => 0, 'seconds' => 0])
        ->and($response->json('visits.0.journey'))->toBe([['code' => 'home', 'at' => 0], ['code' => 'leaderboard', 'at' => 30]])
        ->and($response->json('visits.0.startedAt'))->toBe(Timestamp::iso(Carbon::parse('2026-09-26 10:55', 'Europe/Istanbul')))
        ->and($response->json('visits.1.seconds'))->toBe(300)
        ->and($response->json('visits.1.platform'))->toBe('ios')
        ->and($response->json('visits.1.appVersion'))->toBe('1.0.0');

    expect(array_column($response->json('milestones'), 'milestone'))->toBe(['joined', 'tutorial_done', 'nickname_skip', 'first_run'])
        ->and($response->json('milestones.1.at'))->toBe(Timestamp::iso($joined->copy()->addMinutes(5)->addSeconds(120)));
});

test('shows only the firsts the API knows by itself for a player who has not said yes', function () {
    $player = User::factory()->withUsername('deniz')->create();
    $player->identities()->create(['provider' => 'google', 'subject' => 'g-1', 'email' => 'd@gmail.com', 'email_verified' => true]);
    DB::table('analytics_player_days')->insert(['user_id' => $player->id, 'day' => '2026-09-26', 'age' => 0]);

    $response = $this->getJson("/api/v1/admin/players/{$player->id}/activity")->assertOk()
        ->assertJsonPath('status', 'no_consent')
        ->assertJsonPath('consentAt', null)
        ->assertJsonPath('visits', []);

    expect(array_column($response->json('milestones'), 'milestone'))->toBe(['joined', 'protected']);
});

test('says when a player is outside the sample, or analytics is off', function () {
    $player = User::factory()->withUsername()->consenting()->create();

    config(['quezby.analytics.sample' => 0]);
    $this->getJson("/api/v1/admin/players/{$player->id}/activity")->assertJsonPath('status', 'not_sampled');

    config(['quezby.analytics.enabled' => false]);
    $this->getJson("/api/v1/admin/players/{$player->id}/activity")->assertJsonPath('status', 'disabled');
});

test('an unknown player is not found', function () {
    $this->assertApiError($this->getJson('/api/v1/admin/players/01jzzzzzzzzzzzzzzzzzzzzzzz/activity'), 404, 'not_found');
});
