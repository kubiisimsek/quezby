<?php

use App\Models\Admin;
use App\Models\User;
use App\Support\Timestamp;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/*
| `POST /analytics/visits`: the visits a consenting player's phone summed up.
| One row per visit, straight into the day's totals — and nothing at all
| for a player who has not said yes.
*/

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-26 12:00', 'Europe/Istanbul'));
});

test('keeps a consenting player\'s visit: the row, the day, the totals and a first', function () {
    $player = $this->signIn(User::factory()->withUsername('ekin')->consenting()->create());
    $visit = analyticsVisit([
        'journey' => [['home', 0], ['tutorial', 3], ['tutorial_done', 95], ['username', 97]],
        'counts' => ['home' => 1, 'tutorial' => 1, 'tutorial_done' => 1, 'username' => 1],
    ]);

    $this->postJson('/api/v1/analytics/visits', analyticsBatch($visit))
        ->assertOk()
        ->assertExactJson(['record' => true]);

    $row = DB::table('analytics_visits')->where('user_id', $player->id)->first();
    expect($row->client_id)->toBe($visit['id'])
        ->and($row->day)->toBe('2026-09-26')
        ->and($row->seconds)->toBe(240)
        ->and($row->platform)->toBe('ios')
        ->and($row->app_version)->toBe('1.0.0')
        ->and(json_decode($row->journey, true))->toBe([['home', 0], ['tutorial', 3], ['tutorial_done', 95], ['username', 97]]);

    $this->assertDatabaseHas('analytics_player_days', ['user_id' => $player->id, 'day' => '2026-09-26', 'age' => 0, 'visits' => 1, 'seconds' => 240]);
    expect(analyticsTotals('2026-09-26'))->toBe([
        'active' => 1,
        'age:0' => 1,
        'event:tutorial_done' => 1,
        'screen:home' => 1,
        'screen:tutorial' => 1,
        'screen:username' => 1,
        'seconds' => 240,
        'visits' => 1,
    ]);
    // The first happened 95 s into a visit that began five minutes ago.
    $this->assertDatabaseHas('analytics_milestones', [
        'user_id' => $player->id,
        'milestone' => 'tutorial_done',
        'at' => now()->subMinutes(5)->addSeconds(95)->utc()->format('Y-m-d H:i:s'),
    ]);
});

test('counts a visit sent twice once', function () {
    $this->signIn(User::factory()->withUsername()->consenting()->create());
    $batch = analyticsBatch(analyticsVisit());

    $this->postJson('/api/v1/analytics/visits', $batch)->assertOk();
    $this->postJson('/api/v1/analytics/visits', $batch)->assertOk()->assertExactJson(['record' => true]);

    expect(DB::table('analytics_visits')->count())->toBe(1)
        ->and(analyticsTotals('2026-09-26')['visits'])->toBe(1)
        ->and(analyticsTotals('2026-09-26')['seconds'])->toBe(240);
});

test('adds up several visits of one day in one row per day', function () {
    $player = $this->signIn(User::factory()->withUsername()->consenting()->create());

    $this->postJson('/api/v1/analytics/visits', analyticsBatch(
        analyticsVisit(['seconds' => 100]),
        analyticsVisit(['seconds' => 50, 'startedAt' => Timestamp::iso(now()->subMinutes(2))]),
    ))->assertOk();

    $this->assertDatabaseHas('analytics_player_days', ['user_id' => $player->id, 'day' => '2026-09-26', 'visits' => 2, 'seconds' => 150]);
    expect(analyticsTotals('2026-09-26'))->toMatchArray(['active' => 1, 'visits' => 2, 'seconds' => 150, 'screen:home' => 2]);
});

test('drops the codes it does not know, and counts them', function () {
    $this->signIn(User::factory()->withUsername()->consenting()->create());

    $this->postJson('/api/v1/analytics/visits', analyticsBatch(analyticsVisit([
        'journey' => [['home', 0], ['warp_zone', 4]],
        'counts' => ['home' => 1, 'warp_zone' => 3],
    ])))->assertOk();

    expect(json_decode(DB::table('analytics_visits')->value('journey'), true))->toBe([['home', 0]])
        ->and(analyticsTotals('2026-09-26'))->toMatchArray(['dropped' => 2, 'screen:home' => 1])
        ->and(analyticsTotals('2026-09-26'))->not->toHaveKey('screen:warp_zone');
});

test('turns away a visit older than a week, or from the future', function () {
    $this->signIn(User::factory()->withUsername()->consenting()->create(['created_at' => now()->subDays(30)]));

    $this->postJson('/api/v1/analytics/visits', analyticsBatch(
        analyticsVisit(['startedAt' => Timestamp::iso(now()->subDays(9))]),
        analyticsVisit(['startedAt' => Timestamp::iso(now()->addHour())]),
    ))->assertOk();

    expect(DB::table('analytics_visits')->count())->toBe(0)
        ->and(DB::table('analytics_player_days')->count())->toBe(0)
        ->and(analyticsTotals('2026-09-26'))->toBe(['dropped' => 2]);
});

test('moves every visit by how far the phone\'s clock is off', function () {
    Carbon::setTestNow(Carbon::parse('2026-09-26 00:30', 'Europe/Istanbul'));
    $this->signIn(User::factory()->withUsername()->consenting()->create(['created_at' => now()->subDays(3)]));
    $phone = now()->subHours(2);

    // The phone thinks it is 22:30 the day before; its visit began at its 22:25.
    $this->postJson('/api/v1/analytics/visits', [
        'sentAt' => Timestamp::iso($phone),
        'platform' => 'android',
        'visits' => [analyticsVisit(['startedAt' => Timestamp::iso($phone->copy()->subMinutes(5))])],
    ])->assertOk();

    $row = DB::table('analytics_visits')->first();
    expect($row->day)->toBe('2026-09-26')
        ->and($row->started_at)->toBe(now()->subMinutes(5)->utc()->format('Y-m-d H:i:s'))
        ->and($row->platform)->toBe('android');
});

test('holds a visit to its length, and a day to its share of visits', function () {
    config(['quezby.analytics.visits_per_day' => 2]);
    $this->signIn(User::factory()->withUsername()->consenting()->create());

    $this->postJson('/api/v1/analytics/visits', analyticsBatch(
        analyticsVisit(['seconds' => 86_400]),
        analyticsVisit(),
        analyticsVisit(),
    ))->assertOk();

    $seconds = DB::table('analytics_visits')->orderBy('id')->pluck('seconds')->all();
    // Five minutes and a minute's grace: no visit is longer than the time since it began.
    expect($seconds)->toBe([360, 240])
        ->and(analyticsTotals('2026-09-26'))->toMatchArray(['visits' => 2, 'dropped' => 1]);
});

test('counts a visit that began before the account on the account\'s first day', function () {
    Carbon::setTestNow(Carbon::parse('2026-09-26 00:10', 'Europe/Istanbul'));
    $player = $this->signIn(User::factory()->withUsername()->consenting()->create());

    $this->postJson('/api/v1/analytics/visits', analyticsBatch(
        analyticsVisit(['startedAt' => Timestamp::iso(now()->subMinutes(15))]),
    ))->assertOk();

    $this->assertDatabaseHas('analytics_player_days', ['user_id' => $player->id, 'day' => '2026-09-26', 'age' => 0]);
    expect(analyticsTotals('2026-09-25'))->toBe([]);
});

test('keeps nothing of a player who has not said yes, and tells the app so', function () {
    $this->signIn(User::factory()->withUsername()->create());

    $this->postJson('/api/v1/analytics/visits', analyticsBatch(analyticsVisit()))
        ->assertOk()
        ->assertExactJson(['record' => false]);

    expect(DB::table('analytics_visits')->count())->toBe(0)
        ->and(DB::table('analytics_totals')->count())->toBe(0);
});

test('keeps nothing while analytics is switched off', function () {
    config(['quezby.analytics.enabled' => false]);
    $this->signIn(User::factory()->withUsername()->consenting()->create());

    $this->postJson('/api/v1/analytics/visits', analyticsBatch(analyticsVisit()))->assertExactJson(['record' => false]);

    expect(DB::table('analytics_visits')->count())->toBe(0);
});

test('keeps only the sampled players, the same ones every time', function () {
    config(['quezby.analytics.sample' => 0]);
    $this->signIn(User::factory()->withUsername()->consenting()->create());

    $this->postJson('/api/v1/analytics/visits', analyticsBatch(analyticsVisit()))->assertExactJson(['record' => false]);

    expect(DB::table('analytics_visits')->count())->toBe(0);
});

test('refuses a batch past its limits', function (array $batch, string $field) {
    $this->signIn(User::factory()->withUsername()->consenting()->create());

    $this->assertApiError($this->postJson('/api/v1/analytics/visits', $batch), 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => [$field]]]);
    expect(DB::table('analytics_visits')->count())->toBe(0);
})->with([
    'no visits' => fn () => [analyticsBatch(), 'visits'],
    'eleven visits' => fn () => [analyticsBatch(...array_map(fn () => analyticsVisit(), range(1, 11))), 'visits'],
    'a made-up id' => fn () => [analyticsBatch(analyticsVisit(['id' => 'not-a-visit'])), 'visits.0.id'],
    'a journey of 41 steps' => fn () => [analyticsBatch(analyticsVisit(['journey' => array_map(fn (int $i) => ['home', $i], range(0, 40))])), 'visits.0.journey'],
    'a step that is not a pair' => fn () => [analyticsBatch(analyticsVisit(['journey' => [['home']]])), 'visits.0.journey.0'],
    'a count over 999' => fn () => [analyticsBatch(analyticsVisit(['counts' => ['home' => 1000]])), 'visits.0.counts.home'],
    'a platform it does not know' => fn () => [['platform' => 'web'] + analyticsBatch(analyticsVisit()), 'platform'],
]);

test('asks for a player\'s token, and only a player\'s', function () {
    $this->assertApiError($this->postJson('/api/v1/analytics/visits', analyticsBatch(analyticsVisit())), 401, 'unauthenticated');

    $admin = Admin::factory()->owner()->create()->createToken('admin-panel', ['admin'], now()->addHour())->plainTextToken;
    $this->assertApiError(
        $this->postJson('/api/v1/analytics/visits', analyticsBatch(analyticsVisit()), ['Authorization' => 'Bearer '.$admin]),
        401,
        'unauthenticated',
    );
});

test('lets a phone send a dozen times a minute', function () {
    $this->signIn(User::factory()->withUsername()->consenting()->create());

    foreach (range(1, 12) as $ignored) {
        $this->postJson('/api/v1/analytics/visits', analyticsBatch(analyticsVisit()))->assertOk();
    }

    $this->assertApiError($this->postJson('/api/v1/analytics/visits', analyticsBatch(analyticsVisit())), 429, 'too_many_requests');
});
