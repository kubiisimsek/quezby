<?php

use App\Enums\LeagueTier;
use App\Models\LeaderboardEntry;
use App\Models\LeagueGroup;
use App\Models\LeagueMember;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-24 12:00', 'Europe/Istanbul'));
});

test('search finds players whose username starts with the query, by username', function () {
    $this->signIn(User::factory()->withUsername('aysel')->create());
    foreach (['ayse.nur', 'kayra', 'aydin', 'baris', 'ayla*07'] as $username) {
        User::factory()->withUsername($username)->create();
    }

    $this->getJson('/api/v1/users?search=ay')
        ->assertOk()
        ->assertJsonPath('users.*.username', ['aydin', 'ayla*07', 'ayse.nur']);
});

test('the query is lower-cased and trimmed', function () {
    $this->signIn();
    User::factory()->withUsername('ayse.nur')->create();

    $this->getJson('/api/v1/users?search='.urlencode(' AYSE.N '))
        ->assertOk()
        ->assertJsonPath('users.*.username', ['ayse.nur']);
});

test('search answers at most twenty players', function () {
    $this->signIn();
    foreach (range(1, 25) as $i) {
        User::factory()->withUsername(sprintf('oyuncu%02d', $i))->create();
    }

    $response = $this->getJson('/api/v1/users?search=oyuncu')->assertOk();

    expect($response->json('users'))->toHaveCount(20)
        ->and($response->json('users.0.username'))->toBe('oyuncu01')
        ->and($response->json('users.19.username'))->toBe('oyuncu20');
});

test('search leaves out the caller, banned players and players with no username', function () {
    $this->signIn(User::factory()->withUsername('deniz.me')->create());
    User::factory()->withUsername('deniz.ege')->create();
    User::factory()->withUsername('deniz*01')->create(['banned_at' => now()]);
    User::factory()->create();

    $this->getJson('/api/v1/users?search=deniz')
        ->assertOk()
        ->assertJsonPath('users.*.username', ['deniz.ege']);
});

test("each result carries the season's best, this week's league and whether the caller follows them", function () {
    $me = $this->signIn();
    $ranked = User::factory()->withUsername('kerem.35')->create();
    $newcomer = User::factory()->withUsername('kerem.new')->create();
    $this->recordRanked($ranked, 5000);
    // Last season's rows are another game; they never count.
    LeaderboardEntry::query()->create([
        'season' => config('quezby.season') - 1, 'period' => 'all', 'period_key' => 'all', 'user_id' => $newcomer->id,
        'score' => 99000, 'reels' => 300, 'achieved_at' => now(),
    ]);
    $thisWeek = LeagueGroup::query()->create(['season' => config('quezby.season'), 'week_key' => '2026-W39', 'tier' => LeagueTier::Gold, 'members' => 1]);
    $lastWeek = LeagueGroup::query()->create(['season' => config('quezby.season'), 'week_key' => '2026-W38', 'tier' => LeagueTier::Silver, 'members' => 1]);
    foreach ([[$thisWeek, $ranked], [$lastWeek, $newcomer]] as [$group, $player]) {
        LeagueMember::query()->create([
            'group_id' => $group->id, 'user_id' => $player->id, 'season' => $group->season,
            'week_key' => $group->week_key, 'tier' => $group->tier, 'joined_at' => now(),
        ]);
    }
    DB::table('follows')->insert(['follower_id' => $me->id, 'followee_id' => $ranked->id, 'created_at' => now()]);

    $this->getJson('/api/v1/users?search=kerem')
        ->assertOk()
        ->assertExactJson(['users' => [
            ['username' => 'kerem.35', 'best' => 5000, 'league' => 'gold', 'isFollowing' => true],
            ['username' => 'kerem.new', 'best' => null, 'league' => null, 'isFollowing' => false],
        ]]);
});

test('nothing found is an empty list', function () {
    $this->signIn();

    $this->getJson('/api/v1/users?search=zz')->assertOk()->assertExactJson(['users' => []]);
});

test('a query that could not start a username is refused', function (mixed $search) {
    $this->signIn();

    $this->assertApiError($this->getJson('/api/v1/users?'.http_build_query(['search' => $search])), 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => ['search']]]);
})->with([
    'one character' => ['a'],
    'twenty-one characters' => [str_repeat('a', 21)],
    'an underscore' => ['ay_'],
    'a LIKE wildcard' => ['a%'],
    'a Turkish letter' => ['şu'],
    'only spaces' => ['   '],
    'an array' => [['ay']],
]);

test('a query is required', function () {
    $this->signIn();

    $this->assertApiError($this->getJson('/api/v1/users'), 422, 'validation_failed');
});

test('the number of queries does not grow with the number of results', function () {
    $me = $this->signIn();
    $count = function (string $search): int {
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/users?search='.$search)->assertOk();

        return count(DB::getQueryLog());
    };
    foreach (range(1, 20) as $i) {
        $player = User::factory()->withUsername(sprintf('many%02d', $i))->create();
        $this->recordRanked($player, 1000 * $i);
        DB::table('follows')->insert(['follower_id' => $me->id, 'followee_id' => $player->id, 'created_at' => now()]);
    }
    $this->recordRanked(User::factory()->withUsername('solo01')->create(), 1000);

    expect($count('many'))->toBe($count('solo'));
});

test('search needs a player', function () {
    $this->assertApiError($this->getJson('/api/v1/users?search=ay'), 401, 'unauthenticated');
});

test('search is throttled', function () {
    $this->signIn();
    foreach (range(1, 30) as $i) {
        $this->getJson('/api/v1/users?search=ay')->assertOk();
    }

    $this->assertApiError($this->getJson('/api/v1/users?search=ay'), 429, 'too_many_requests');
});
