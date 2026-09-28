<?php

use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-24 12:00', 'Europe/Istanbul'));
});

/** @return list<string> Who `$user` is friends with, by username. */
function friendsOfUser(User $user): array
{
    return DB::table('friendships')->join('users', 'users.id', '=', 'friendships.friend_id')
        ->where('friendships.user_id', $user->id)->orderBy('users.username')->pluck('users.username')->all();
}

test('a request waits, and answering it makes two friends', function () {
    $me = $this->signIn(User::factory()->withUsername('ben')->create());
    $ayse = User::factory()->withUsername('ayse.nur')->create();

    $this->putJson('/api/v1/users/ayse.nur/friend')->assertOk()->assertExactJson(['relation' => 'requested']);
    expect(DB::table('friend_requests')->get(['sender_id', 'recipient_id', 'created_at'])->map(fn ($row) => (array) $row)->all())
        ->toBe([['sender_id' => $me->id, 'recipient_id' => $ayse->id, 'created_at' => '2026-09-24 09:00:00.000']])
        ->and(friendsOfUser($me))->toBe([]);
    $this->getJson('/api/v1/users/ayse.nur')->assertJsonPath('player.relation', 'requested');

    $this->signIn($ayse);
    $this->getJson('/api/v1/users/ben')->assertJsonPath('player.relation', 'incoming');
    Carbon::setTestNow(now()->addHour());
    $this->putJson('/api/v1/users/ben/friend')->assertOk()->assertExactJson(['relation' => 'friend']);

    expect(DB::table('friend_requests')->count())->toBe(0)
        ->and(friendsOfUser($me))->toBe(['ayse.nur'])
        ->and(friendsOfUser($ayse))->toBe(['ben'])
        ->and(DB::table('friendships')->pluck('created_at')->unique()->all())->toBe(['2026-09-24 10:00:00.000']);
    $this->getJson('/api/v1/users/ben')->assertJsonPath('player.relation', 'friend')->assertJsonPath('player.friends', 1);
});

test('asking again changes nothing', function () {
    $this->signIn();
    $ayse = User::factory()->withUsername('ayse.nur')->create();

    $this->putJson('/api/v1/users/ayse.nur/friend')->assertJsonPath('relation', 'requested');
    $this->putJson('/api/v1/users/Ayse.Nur/friend')->assertJsonPath('relation', 'requested');
    expect(DB::table('friend_requests')->count())->toBe(1);

    $this->befriend(User::query()->whereKeyNot($ayse->id)->sole(), User::factory()->withUsername('kanka')->create());
    $this->putJson('/api/v1/users/kanka/friend')->assertJsonPath('relation', 'friend');
    expect(DB::table('friendships')->count())->toBe(2);
});

test('letting go takes a request back, turns one down or ends a friendship', function () {
    $me = $this->signIn();
    $sent = User::factory()->withUsername('gonderdim')->create();
    $received = User::factory()->withUsername('geldi')->create();
    $friend = User::factory()->withUsername('kanka')->create();
    $stranger = User::factory()->withUsername('yabanci')->create();
    $this->requestFriend($me, $sent);
    $this->requestFriend($received, $me);
    $this->befriend($me, $friend);

    foreach (['gonderdim', 'geldi', 'kanka', 'yabanci', 'kanka'] as $username) {
        $this->deleteJson("/api/v1/users/{$username}/friend")->assertOk()->assertExactJson(['relation' => 'none']);
    }

    expect(DB::table('friend_requests')->count())->toBe(0)
        ->and(DB::table('friendships')->count())->toBe(0)
        ->and($stranger->exists)->toBeTrue();
});

test('players cannot befriend themselves', function () {
    $this->signIn(User::factory()->withUsername('kendim')->create());

    $this->assertApiError($this->putJson('/api/v1/users/kendim/friend'), 422, 'cannot_befriend_self');
    expect(DB::table('friend_requests')->count())->toBe(0);
});

test('an unknown player cannot be added or let go of', function () {
    $this->signIn();

    $this->assertApiError($this->putJson('/api/v1/users/kimse.yok/friend'), 404, 'not_found');
    $this->assertApiError($this->deleteJson('/api/v1/users/kimse.yok/friend'), 404, 'not_found');
});

test('a banned player cannot be added, but can be let go of', function () {
    $me = $this->signIn();
    $banned = User::factory()->withUsername('yasakli')->create(['banned_at' => now()]);
    $this->befriend($me, $banned);

    $this->assertApiError($this->putJson('/api/v1/users/yasakli/friend'), 404, 'not_found');
    $this->deleteJson('/api/v1/users/yasakli/friend')->assertOk();

    expect(DB::table('friendships')->count())->toBe(0);
});

test('friends stop at the limit, for a request and for an answer', function () {
    config(['quezby.friends.limit' => 2]);
    $me = $this->signIn();
    $this->befriend($me, User::factory()->withUsername('bir')->create());
    $this->befriend($me, User::factory()->withUsername('iki')->create());
    $asker = User::factory()->withUsername('soran')->create();
    $this->requestFriend($asker, $me);
    User::factory()->withUsername('uc')->create();

    $this->assertApiError($this->putJson('/api/v1/users/uc/friend'), 422, 'friend_limit')
        ->assertJsonPath('error.message', 'En fazla 2 arkadaşın olabilir.');
    $this->assertApiError($this->putJson('/api/v1/users/soran/friend'), 422, 'friend_limit');
    // Asking again for someone who is already a friend is still fine at the limit.
    $this->putJson('/api/v1/users/iki/friend')->assertJsonPath('relation', 'friend');

    $this->deleteJson('/api/v1/users/bir/friend')->assertOk();
    $this->putJson('/api/v1/users/soran/friend')->assertJsonPath('relation', 'friend');
});

test('a banned friend does not use up a place under the limit', function () {
    config(['quezby.friends.limit' => 1]);
    $me = $this->signIn();
    $this->befriend($me, User::factory()->withUsername('yasakli')->create(['banned_at' => now()]));
    User::factory()->withUsername('temiz')->create();

    $this->putJson('/api/v1/users/temiz/friend')->assertJsonPath('relation', 'requested');
});

test('requests waiting for an answer stop at their own limit', function () {
    config(['quezby.friends.pending_limit' => 2]);
    $me = $this->signIn();
    foreach (['bir', 'iki', 'uc'] as $username) {
        User::factory()->withUsername($username)->create();
    }
    $this->putJson('/api/v1/users/bir/friend')->assertJsonPath('relation', 'requested');
    $this->putJson('/api/v1/users/iki/friend')->assertJsonPath('relation', 'requested');

    $this->assertApiError($this->putJson('/api/v1/users/uc/friend'), 422, 'request_limit');

    $this->deleteJson('/api/v1/users/bir/friend')->assertOk();
    $this->putJson('/api/v1/users/uc/friend')->assertJsonPath('relation', 'requested');
    expect(DB::table('friend_requests')->where('sender_id', $me->id)->count())->toBe(2);
});

test('adding friends needs a username of your own', function () {
    $this->signIn(User::factory()->create());
    User::factory()->withUsername('ayse.nur')->create();

    $this->assertApiError($this->putJson('/api/v1/users/ayse.nur/friend'), 422, 'validation_failed')
        ->assertJsonPath('error.fields.username', ['Arkadaş eklemek için önce bir kullanıcı adı seç.']);
});

test('requests are listed both ways, newest first, without banned players', function () {
    $me = $this->signIn();
    $early = User::factory()->withUsername('erken')->create();
    $late = User::factory()->withUsername('gec')->create();
    $banned = User::factory()->withUsername('yasakli')->create(['banned_at' => now()]);
    $mine = User::factory()->withUsername('benimki')->create();
    $this->recordRanked($late, 3000);
    DB::table('friend_requests')->insert([
        ['sender_id' => $early->id, 'recipient_id' => $me->id, 'created_at' => '2026-09-20 10:00:00.000'],
        ['sender_id' => $late->id, 'recipient_id' => $me->id, 'created_at' => '2026-09-23 10:00:00.000'],
        ['sender_id' => $banned->id, 'recipient_id' => $me->id, 'created_at' => '2026-09-23 11:00:00.000'],
        ['sender_id' => $me->id, 'recipient_id' => $mine->id, 'created_at' => '2026-09-22 10:00:00.000'],
    ]);

    $this->getJson('/api/v1/me/friend-requests')
        ->assertOk()
        ->assertExactJson([
            'incoming' => [
                ['player' => ['username' => 'gec', 'avatarUrl' => null, 'best' => 3000, 'league' => null, 'relation' => 'incoming'], 'requestedAt' => '2026-09-23T10:00:00.000Z'],
                ['player' => ['username' => 'erken', 'avatarUrl' => null, 'best' => null, 'league' => null, 'relation' => 'incoming'], 'requestedAt' => '2026-09-20T10:00:00.000Z'],
            ],
            'outgoing' => [
                ['player' => ['username' => 'benimki', 'avatarUrl' => null, 'best' => null, 'league' => null, 'relation' => 'requested'], 'requestedAt' => '2026-09-22T10:00:00.000Z'],
            ],
        ]);
});

test('the friends list: the one last heard from first, never a banned player', function () {
    $me = $this->signIn();
    $quiet = User::factory()->withUsername('sessiz')->create();
    $recent = User::factory()->withUsername('yeni')->create();
    $banned = User::factory()->withUsername('yasakli')->create(['banned_at' => now()]);
    $this->recordRanked($quiet, 3000);
    foreach ([[$quiet, '2026-09-20 10:00:00.000'], [$recent, '2026-09-23 10:00:00.000'], [$banned, '2026-09-24 08:00:00.000']] as [$friend, $at]) {
        DB::table('friendships')->insert([
            ['user_id' => $me->id, 'friend_id' => $friend->id, 'created_at' => '2026-09-19 10:00:00.000', 'last_activity_at' => $at],
            ['user_id' => $friend->id, 'friend_id' => $me->id, 'created_at' => '2026-09-19 10:00:00.000', 'last_activity_at' => $at],
        ]);
    }

    $this->getJson('/api/v1/me/friends')
        ->assertOk()
        ->assertJsonPath('friends.*.player.username', ['yeni', 'sessiz'])
        ->assertJsonPath('friends.1.player', ['username' => 'sessiz', 'avatarUrl' => null, 'best' => 3000, 'league' => null, 'relation' => 'friend'])
        ->assertJsonPath('friends.1.friendsSince', '2026-09-19T10:00:00.000Z')
        ->assertJsonPath('friends.1.lastActivityAt', '2026-09-20T10:00:00.000Z')
        ->assertJsonPath('nextCursor', null);
});

test('the friends list pages fifty at a time, in one order even within a moment', function () {
    $me = $this->signIn();
    $players = User::factory()->withUsername()->count(55)->create();
    foreach ($players as $i => $player) {
        $this->befriend($me, $player);
        if ($i < 10) {
            DB::table('friendships')->where('user_id', $me->id)->where('friend_id', $player->id)->update(['last_activity_at' => '2026-09-24 11:00:00.000']);
        }
    }

    $first = $this->getJson('/api/v1/me/friends')->assertOk();
    $cursor = $first->json('nextCursor');
    expect($first->json('friends'))->toHaveCount(50)->and($cursor)->toBeString();
    $second = $this->getJson("/api/v1/me/friends?cursor={$cursor}")->assertOk()->assertJsonPath('nextCursor', null);

    $seen = [...$first->json('friends.*.player.username'), ...$second->json('friends.*.player.username')];
    expect($seen)->toHaveCount(55)->and(array_unique($seen))->toHaveCount(55);
});

test('a cursor the API did not write is refused', function (string $cursor) {
    $this->signIn();

    $this->assertApiError($this->getJson('/api/v1/me/friends?cursor='.urlencode($cursor)), 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => ['cursor']]]);
})->with([
    'not base64' => ['!!!'],
    'base64 of something else' => [base64_encode('hello')],
    'a date without a player' => [rtrim(base64_encode('2026-09-24 10:00:00|'), '=')],
    'too long' => [str_repeat('a', 201)],
]);

test('the number of queries does not grow with the friends list', function () {
    $me = $this->signIn();
    $count = function (): int {
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/me/friends')->assertOk();

        return count(DB::getQueryLog());
    };
    $this->befriend($me, User::factory()->withUsername()->create());
    $count(); // The first read also prunes the inbox, once an hour.
    $one = $count();

    foreach (User::factory()->withUsername()->count(30)->create() as $player) {
        $this->recordRanked($player, 1000);
        $this->befriend($me, $player);
    }

    expect($count())->toBe($one);
});

test('friends need a player', function () {
    User::factory()->withUsername('ayse.nur')->create();

    $this->assertApiError($this->putJson('/api/v1/users/ayse.nur/friend'), 401, 'unauthenticated');
    $this->assertApiError($this->deleteJson('/api/v1/users/ayse.nur/friend'), 401, 'unauthenticated');
    $this->assertApiError($this->getJson('/api/v1/me/friends'), 401, 'unauthenticated');
    $this->assertApiError($this->getJson('/api/v1/me/friend-requests'), 401, 'unauthenticated');
});

test('adding friends is throttled', function () {
    $this->signIn();
    User::factory()->withUsername('ayse.nur')->create();
    foreach (range(1, 60) as $i) {
        $this->putJson('/api/v1/users/ayse.nur/friend')->assertOk();
    }

    $this->assertApiError($this->putJson('/api/v1/users/ayse.nur/friend'), 429, 'too_many_requests');
});
