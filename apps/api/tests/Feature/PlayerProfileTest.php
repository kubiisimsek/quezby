<?php

use App\Models\PlayerRating;
use App\Models\PlayerStat;
use App\Models\User;
use Illuminate\Support\Carbon;

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
    $this->rate($player, 2450);
    $banned = User::factory()->withUsername('banned')->create(['banned_at' => now()]);
    foreach ([$me, $rival, $banned] as $friend) {
        $this->befriend($player, $friend);
    }

    $this->getJson('/api/v1/users/ayse.nur')
        ->assertOk()
        ->assertExactJson(['player' => [
            'username' => 'ayse.nur',
            'avatarUrl' => null,
            'createdAt' => '2026-09-01T07:00:00.000Z',
            'best' => ['score' => 8000, 'reels' => 100, 'achievedAt' => '2026-09-17T17:00:00.000Z'],
            'league' => 'gold',
            'rating' => 2450,
            'ranks' => ['weekly' => 2, 'all' => 1],
            'stats' => ['runs' => 12, 'reels' => 2400, 'likes' => 310, 'perfects' => 42],
            'friends' => 2,
            'relation' => 'friend',
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
        ->assertJsonPath('player.friends', 0)
        ->assertJsonPath('player.relation', 'none')
        ->assertJsonPath('player.isMe', false);
});

test('a player still in their placement runs has no league yet', function () {
    $this->signIn();
    $player = User::factory()->withUsername('yerlesiyor')->create();
    PlayerRating::query()->create(['user_id' => $player->id, 'placement_scores' => [40000, 52000]]);

    $this->getJson('/api/v1/users/yerlesiyor')->assertOk()
        ->assertJsonPath('player.league', null)
        ->assertJsonPath('player.rating', null);
});

test("a MasterClass player's card says so", function () {
    $this->signIn();
    $player = User::factory()->withUsername('usta')->create();
    $this->rate($player, 5320);

    $this->getJson('/api/v1/users/usta')->assertOk()
        ->assertJsonPath('player.league', 'master')
        ->assertJsonPath('player.rating', 5320);
});

test('a request shows which way it waits', function () {
    $me = $this->signIn();
    $asker = User::factory()->withUsername('soran')->create();
    $asked = User::factory()->withUsername('sorulan')->create();
    $this->requestFriend($asker, $me);
    $this->requestFriend($me, $asked);

    $this->getJson('/api/v1/users/soran')->assertJsonPath('player.relation', 'incoming');
    $this->getJson('/api/v1/users/sorulan')->assertJsonPath('player.relation', 'requested');
});

test('players can look at their own card', function () {
    $me = $this->signIn(User::factory()->withUsername('kendim')->create());
    $this->recordRanked($me, 4200);

    $this->getJson('/api/v1/users/kendim')
        ->assertOk()
        ->assertJsonPath('player.isMe', true)
        ->assertJsonPath('player.relation', 'none')
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
