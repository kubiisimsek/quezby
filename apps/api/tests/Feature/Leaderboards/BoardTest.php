<?php

use App\Enums\LeaderboardPeriod;
use App\Models\LeaderboardEntry;
use App\Models\User;
use App\Services\LeaderboardService;
use Illuminate\Support\Carbon;

test('periods follow Istanbul time', function (string $localTime, string $day, string $week, string $month) {
    $at = Carbon::parse($localTime, 'Europe/Istanbul')->utc();
    $leaderboards = app(LeaderboardService::class);

    expect($leaderboards->keyAt(LeaderboardPeriod::Daily, $at))->toBe($day)
        ->and($leaderboards->keyAt(LeaderboardPeriod::Challenge, $at))->toBe($day)
        ->and($leaderboards->keyAt(LeaderboardPeriod::Weekly, $at))->toBe($week)
        ->and($leaderboards->keyAt(LeaderboardPeriod::Monthly, $at))->toBe($month)
        ->and($leaderboards->keyAt(LeaderboardPeriod::All, $at))->toBe('all');
})->with('istanbul moments');

test('every period says when it began and when it turns over, in UTC', function () {
    $at = Carbon::parse('2026-09-30 23:30', 'Europe/Istanbul');
    $leaderboards = app(LeaderboardService::class);
    $iso = fn (LeaderboardPeriod $period) => array_map(fn ($moment) => $moment->toIso8601ZuluString(), $leaderboards->boundsAt($period, $at));

    expect($iso(LeaderboardPeriod::Daily))->toBe(['2026-09-29T21:00:00Z', '2026-09-30T21:00:00Z'])
        ->and($iso(LeaderboardPeriod::Weekly))->toBe(['2026-09-27T21:00:00Z', '2026-10-04T21:00:00Z'])
        ->and($iso(LeaderboardPeriod::Monthly))->toBe(['2026-08-31T21:00:00Z', '2026-09-30T21:00:00Z'])
        ->and($leaderboards->boundsAt(LeaderboardPeriod::All, $at))->toBeNull();
});

test('runs either side of Istanbul midnight share the week, and each keeps its day for the league', function () {
    $evening = User::factory()->withUsername('evening')->create();
    $night = User::factory()->withUsername('night')->create();

    Carbon::setTestNow(Carbon::parse('2026-09-24 23:30', 'Europe/Istanbul'));
    $this->recordRanked($evening, 3000);
    Carbon::setTestNow(Carbon::parse('2026-09-25 00:30', 'Europe/Istanbul'));
    $this->recordRanked($night, 2000);
    $this->signIn($night);

    $evenRow = ['rank' => 1, 'username' => 'evening', 'avatarUrl' => null, 'score' => 3000, 'reels' => 100, 'isMe' => false, 'isFriend' => false, 'gap' => null];
    $nightRow = ['rank' => 2, 'username' => 'night', 'avatarUrl' => null, 'score' => 2000, 'reels' => 100, 'isMe' => true, 'isFriend' => false, 'gap' => 1001];
    $this->getJson('/api/v1/leaderboards/weekly')
        ->assertOk()
        ->assertExactJson([
            'board' => 'weekly',
            'periodKey' => '2026-W39',
            'season' => 2,
            'scope' => 'everyone',
            'startsAt' => '2026-09-20T21:00:00.000Z',
            'endsAt' => '2026-09-27T21:00:00.000Z',
            'serverTime' => '2026-09-24T21:30:00.000Z',
            'entries' => [$evenRow, $nightRow],
            'me' => $nightRow,
            'neighbors' => [$evenRow, $nightRow],
            'rival' => ['entry' => $evenRow, 'gap' => 1001],
            'nextRankProgress' => intdiv(2000 * 1000, 3001),
            'players' => 2,
        ]);

    $this->getJson('/api/v1/leaderboards/monthly')->assertJsonPath('periodKey', '2026-09')->assertJsonPath('players', 2);
    $this->getJson('/api/v1/leaderboards/all')
        ->assertJsonPath('periodKey', 'all')
        ->assertJsonPath('endsAt', null)
        ->assertJsonPath('players', 2);

    // No player sees a day board, but each day's best stays: league points add them up.
    expect(LeaderboardEntry::query()->where('period', 'daily')->pluck('period_key', 'user_id')->all())
        ->toBe([$evening->id => '2026-09-24', $night->id => '2026-09-25']);
});

test('there is no day board', function () {
    $this->signIn();

    $this->assertApiError($this->getJson('/api/v1/leaderboards/daily'), 404, 'not_found');
});

test('ties go to whoever got there first, and a gap is what it takes to pass', function () {
    $first = User::factory()->withUsername('first')->create();
    $twin = User::factory()->withUsername('twin')->create();
    $second = User::factory()->withUsername('second')->create();
    $top = User::factory()->withUsername('top')->create();

    Carbon::setTestNow(Carbon::parse('2026-09-24 10:00:00.100'));
    $this->recordRanked($first, 5000);
    $this->recordRanked($twin, 5000);
    Carbon::setTestNow(Carbon::parse('2026-09-24 10:00:00.200'));
    $this->recordRanked($second, 5000);
    Carbon::setTestNow(Carbon::parse('2026-09-24 10:00:05'));
    $this->recordRanked($top, 7000);
    $this->signIn($second);

    $this->getJson('/api/v1/leaderboards/weekly')
        ->assertJsonPath('entries.*.username', ['top', 'first', 'twin', 'second'])
        ->assertJsonPath('entries.*.rank', [1, 2, 2, 4])
        ->assertJsonPath('entries.*.gap', [null, 2001, 1, 1])
        ->assertJsonPath('me.rank', 4);

    $this->getJson('/api/v1/leaderboards/weekly?limit=2')
        ->assertJsonPath('entries.*.username', ['top', 'first'])
        ->assertJsonPath('me', ['rank' => 4, 'username' => 'second', 'avatarUrl' => null, 'score' => 5000, 'reels' => 100, 'isMe' => true, 'isFriend' => false, 'gap' => 1])
        ->assertJsonPath('players', 4);

    $this->getJson('/api/v1/me')->assertJsonPath('ranks', ['weekly' => 4, 'monthly' => 4, 'all' => 4]);
});

test('the rival is the player right above, with the gap and the way there', function () {
    $players = collect(['a' => 9000, 'b' => 8000, 'c' => 7000, 'd' => 6000, 'e' => 5000, 'f' => 4000, 'g' => 3000])
        ->map(fn (int $score, string $name) => [$this->recordRanked(User::factory()->withUsername("oyuncu.{$name}")->create(), $score), $score]);
    $this->signIn(User::query()->where('username', 'oyuncu.d')->sole());

    $board = $this->getJson('/api/v1/leaderboards/weekly?limit=2')->assertOk();

    $board->assertJsonPath('entries.*.username', ['oyuncu.a', 'oyuncu.b'])
        ->assertJsonPath('me.rank', 4)
        ->assertJsonPath('neighbors.*.username', ['oyuncu.b', 'oyuncu.c', 'oyuncu.d', 'oyuncu.e', 'oyuncu.f'])
        ->assertJsonPath('neighbors.*.rank', [2, 3, 4, 5, 6])
        ->assertJsonPath('neighbors.*.gap', [1001, 1001, 1001, 1001, 1001])
        ->assertJsonPath('rival.entry.username', 'oyuncu.c')
        ->assertJsonPath('rival.entry.rank', 3)
        ->assertJsonPath('rival.gap', 1001)
        ->assertJsonPath('nextRankProgress', intdiv(6000 * 1000, 7001));
    expect($players)->toHaveCount(7);
});

test('the friends board is your friends, and you', function () {
    $me = User::factory()->withUsername('ben')->create();
    $friend = User::factory()->withUsername('kanka')->create();
    $stranger = User::factory()->withUsername('yabanci')->create();
    $this->recordRanked($stranger, 9000);
    $this->recordRanked($friend, 8000);
    $this->recordRanked($me, 7000);
    $this->befriend($me, $friend);
    // A request is not a friendship yet.
    $this->requestFriend($me, $stranger);
    $this->signIn($me);

    $this->getJson('/api/v1/leaderboards/weekly?scope=friends')
        ->assertOk()
        ->assertJsonPath('scope', 'friends')
        ->assertJsonPath('entries.*.username', ['kanka', 'ben'])
        ->assertJsonPath('entries.*.isFriend', [true, false])
        ->assertJsonPath('me.rank', 2)
        ->assertJsonPath('rival.entry.username', 'kanka')
        ->assertJsonPath('players', 2);

    $this->getJson('/api/v1/leaderboards/weekly')
        ->assertJsonPath('entries.*.username', ['yabanci', 'kanka', 'ben'])
        ->assertJsonPath('me.rank', 3);
    $this->assertApiError($this->getJson('/api/v1/leaderboards/weekly?scope=world'), 422, 'validation_failed');
});

test('a board only ranks this season', function () {
    $old = User::factory()->withUsername('eski')->create();
    $now = User::factory()->withUsername('yeni')->create();
    $this->recordRanked($now, 1000);
    LeaderboardEntry::query()->create([
        'season' => 1, 'period' => 'all', 'period_key' => 'all', 'user_id' => $old->id,
        'score' => 999999, 'reels' => 400, 'achieved_at' => now(),
    ]);
    $this->signIn($now);

    $this->getJson('/api/v1/leaderboards/all')
        ->assertJsonPath('season', 2)
        ->assertJsonPath('entries.*.username', ['yeni'])
        ->assertJsonPath('players', 1);
    $this->getJson('/api/v1/me')->assertJsonPath('user.best.score', 1000)->assertJsonPath('ranks.all', 1);
});

test('a row keeps the higher score and the earlier tie', function () {
    $player = User::factory()->withUsername()->create();

    Carbon::setTestNow(Carbon::parse('2026-09-24 10:00:00'));
    $best = $this->recordRanked($player, 5000);
    Carbon::setTestNow(Carbon::parse('2026-09-24 11:00:00'));
    $this->recordRanked($player, 4000);
    $this->recordRanked($player, 5000);

    $row = LeaderboardEntry::query()->where('period', 'daily')->sole();
    expect($row->score)->toBe(5000)
        ->and($row->run_id)->toBe($best->id)
        ->and($row->season)->toBe(2)
        ->and($row->achieved_at->format('Y-m-d H:i:s.v'))->toBe('2026-09-24 10:00:00.000');

    $higher = $this->recordRanked($player, 6000);
    expect(LeaderboardEntry::query()->pluck('score')->unique()->values()->all())->toBe([6000])
        ->and(LeaderboardEntry::query()->where('period', 'all')->sole()->run_id)->toBe($higher->id);
});

test('the challenge board holds only daily runs', function () {
    $player = User::factory()->withUsername()->create();
    $this->recordRanked($player, 3000);
    $this->signIn($player);

    $this->getJson('/api/v1/leaderboards/challenge')->assertOk()->assertJsonPath('board', 'challenge')->assertJsonPath('players', 0);
    $this->getJson('/api/v1/leaderboards/weekly')->assertJsonPath('players', 1);
});

test('an empty board', function () {
    $this->signIn();

    $this->getJson('/api/v1/leaderboards/weekly')
        ->assertOk()
        ->assertJsonPath('entries', [])
        ->assertJsonPath('me', null)
        ->assertJsonPath('neighbors', [])
        ->assertJsonPath('rival', null)
        ->assertJsonPath('players', 0);
});

test('the limit is between one and a hundred', function () {
    $this->signIn();

    $this->getJson('/api/v1/leaderboards/all?limit=100')->assertOk();
    $this->assertApiError($this->getJson('/api/v1/leaderboards/all?limit=0'), 422, 'validation_failed');
    $this->assertApiError($this->getJson('/api/v1/leaderboards/all?limit=101'), 422, 'validation_failed');
    $this->assertApiError($this->getJson('/api/v1/leaderboards/all?limit=ten'), 422, 'validation_failed');
});

test('an unknown board is not found', function () {
    $this->signIn();

    $this->assertApiError($this->getJson('/api/v1/leaderboards/yearly'), 404, 'not_found');
});

test('leaderboards need a player', function () {
    $this->assertApiError($this->getJson('/api/v1/leaderboards/weekly'), 401, 'unauthenticated');
});

test('leaderboards are throttled', function () {
    $this->signIn();
    for ($i = 0; $i < 60; $i++) {
        $this->getJson('/api/v1/leaderboards/weekly')->assertOk();
    }

    $this->assertApiError($this->getJson('/api/v1/leaderboards/weekly'), 429, 'too_many_requests');
});
