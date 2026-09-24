<?php

use App\Enums\LeagueTier;
use App\Models\LeagueGroup;
use App\Models\LeagueMember;
use App\Models\PlayerStat;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-24 12:00', 'Europe/Istanbul'));
});

test("a player's card", function () {
    $me = $this->signIn();
    Carbon::setTestNow(Carbon::parse('2026-09-01 10:00', 'Europe/Istanbul'));
    $player = User::factory()->withUsername('ayse.nur')->create();
    $rival = User::factory()->withUsername('rival')->create();

    // Last week: the season's best. This week: second behind the rival.
    Carbon::setTestNow(Carbon::parse('2026-09-17 20:00', 'Europe/Istanbul'));
    $this->recordRanked($player, 8000);
    Carbon::setTestNow(Carbon::parse('2026-09-24 12:00', 'Europe/Istanbul'));
    $this->recordRanked($rival, 6000);
    $this->recordRanked($player, 5000);

    PlayerStat::query()->create(['user_id' => $player->id, 'runs' => 12, 'reels' => 2400, 'likes' => 310, 'perfects' => 42, 'swipes' => 1500]);
    $group = LeagueGroup::query()->create(['season' => config('quezby.season'), 'week_key' => '2026-W39', 'tier' => LeagueTier::Gold, 'members' => 1]);
    LeagueMember::query()->create([
        'group_id' => $group->id, 'user_id' => $player->id, 'season' => $group->season,
        'week_key' => '2026-W39', 'tier' => LeagueTier::Gold, 'joined_at' => now(),
    ]);
    $banned = User::factory()->withUsername('banned')->create(['banned_at' => now()]);
    foreach ([[$me, $player], [$rival, $player], [$banned, $player], [$player, $me]] as [$follower, $followee]) {
        DB::table('follows')->insert(['follower_id' => $follower->id, 'followee_id' => $followee->id, 'created_at' => now()]);
    }

    $this->getJson('/api/v1/users/ayse.nur')
        ->assertOk()
        ->assertExactJson(['player' => [
            'username' => 'ayse.nur',
            'createdAt' => '2026-09-01T07:00:00.000Z',
            'best' => ['score' => 8000, 'reels' => 100, 'achievedAt' => '2026-09-17T17:00:00.000Z'],
            'league' => 'gold',
            'ranks' => ['weekly' => 2, 'all' => 1],
            'stats' => ['runs' => 12, 'reels' => 2400, 'likes' => 310, 'perfects' => 42],
            'followers' => 2,
            'following' => 1,
            'isFollowing' => true,
            'followsMe' => true,
            'isMe' => false,
        ]]);
});

test('a player who never ranked', function () {
    $this->signIn();
    User::factory()->withUsername('yeni.oyuncu')->create();

    $this->getJson('/api/v1/users/yeni.oyuncu')
        ->assertOk()
        ->assertJsonPath('player.best', null)
        ->assertJsonPath('player.league', null)
        ->assertJsonPath('player.ranks', ['weekly' => null, 'all' => null])
        ->assertJsonPath('player.stats', ['runs' => 0, 'reels' => 0, 'likes' => 0, 'perfects' => 0])
        ->assertJsonPath('player.followers', 0)
        ->assertJsonPath('player.following', 0)
        ->assertJsonPath('player.isFollowing', false)
        ->assertJsonPath('player.followsMe', false)
        ->assertJsonPath('player.isMe', false);
});

test('last week in a league is not this week', function () {
    $this->signIn();
    $player = User::factory()->withUsername('gecen.hafta')->create();
    $group = LeagueGroup::query()->create(['season' => config('quezby.season'), 'week_key' => '2026-W38', 'tier' => LeagueTier::Silver, 'members' => 1]);
    LeagueMember::query()->create([
        'group_id' => $group->id, 'user_id' => $player->id, 'season' => $group->season,
        'week_key' => '2026-W38', 'tier' => LeagueTier::Silver, 'joined_at' => now()->subWeek(),
    ]);

    $this->getJson('/api/v1/users/gecen.hafta')->assertOk()->assertJsonPath('player.league', null);
});

test('only one direction of following', function () {
    $me = $this->signIn();
    $fan = User::factory()->withUsername('fan')->create();
    $idol = User::factory()->withUsername('idol')->create();
    DB::table('follows')->insert([
        ['follower_id' => $fan->id, 'followee_id' => $me->id, 'created_at' => now()],
        ['follower_id' => $me->id, 'followee_id' => $idol->id, 'created_at' => now()],
    ]);

    $this->getJson('/api/v1/users/fan')
        ->assertJsonPath('player.isFollowing', false)
        ->assertJsonPath('player.followsMe', true);
    $this->getJson('/api/v1/users/idol')
        ->assertJsonPath('player.isFollowing', true)
        ->assertJsonPath('player.followsMe', false);
});

test('players can look at their own card', function () {
    $me = $this->signIn(User::factory()->withUsername('kendim')->create());
    $this->recordRanked($me, 4200);

    $this->getJson('/api/v1/users/kendim')
        ->assertOk()
        ->assertJsonPath('player.isMe', true)
        ->assertJsonPath('player.isFollowing', false)
        ->assertJsonPath('player.followsMe', false)
        ->assertJsonPath('player.best.score', 4200)
        ->assertJsonPath('player.ranks', ['weekly' => 1, 'all' => 1]);
});

test('the username is looked up trimmed and lower-cased', function () {
    $this->signIn();
    User::factory()->withUsername('ayse.nur')->create();

    $this->getJson('/api/v1/users/'.rawurlencode(' Ayse.NUR '))
        ->assertOk()
        ->assertJsonPath('player.username', 'ayse.nur');
});

test('an unknown player is not found', function () {
    $this->signIn();

    $this->assertApiError($this->getJson('/api/v1/users/kimse.yok'), 404, 'not_found');
});

test('a banned player is not found, except by themselves', function () {
    $banned = User::factory()->withUsername('yasakli')->create(['banned_at' => now()]);
    $this->signIn();

    $this->assertApiError($this->getJson('/api/v1/users/yasakli'), 404, 'not_found');

    $this->signIn($banned);
    $this->getJson('/api/v1/users/yasakli')->assertOk()->assertJsonPath('player.isMe', true);
});

test('cards need a player', function () {
    User::factory()->withUsername('ayse.nur')->create();

    $this->assertApiError($this->getJson('/api/v1/users/ayse.nur'), 401, 'unauthenticated');
});
