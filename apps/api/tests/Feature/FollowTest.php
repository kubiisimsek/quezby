<?php

use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-24 12:00', 'Europe/Istanbul'));
});

test('following is idempotent', function () {
    $me = $this->signIn();
    $player = User::factory()->withUsername('ayse.nur')->create();

    $this->putJson('/api/v1/users/ayse.nur/follow')->assertNoContent();
    Carbon::setTestNow(now()->addHour());
    $this->putJson('/api/v1/users/Ayse.Nur/follow')->assertNoContent();

    $rows = DB::table('follows')->get();
    expect($rows)->toHaveCount(1)
        ->and($rows[0]->follower_id)->toBe($me->id)
        ->and($rows[0]->followee_id)->toBe($player->id)
        ->and($rows[0]->created_at)->toBe('2026-09-24 09:00:00');
});

test('unfollowing is idempotent', function () {
    $me = $this->signIn();
    $player = User::factory()->withUsername('ayse.nur')->create();
    $other = User::factory()->withUsername('other')->create();
    DB::table('follows')->insert([
        ['follower_id' => $me->id, 'followee_id' => $player->id, 'created_at' => now()],
        ['follower_id' => $other->id, 'followee_id' => $player->id, 'created_at' => now()],
    ]);

    $this->deleteJson('/api/v1/users/ayse.nur/follow')->assertNoContent();
    $this->deleteJson('/api/v1/users/ayse.nur/follow')->assertNoContent();

    expect(DB::table('follows')->pluck('follower_id')->all())->toBe([$other->id]);
});

test('players cannot follow themselves', function () {
    $this->signIn(User::factory()->withUsername('kendim')->create());

    $this->assertApiError($this->putJson('/api/v1/users/kendim/follow'), 422, 'cannot_follow_self');
    expect(DB::table('follows')->count())->toBe(0);
});

test('an unknown player cannot be followed or unfollowed', function () {
    $this->signIn();

    $this->assertApiError($this->putJson('/api/v1/users/kimse.yok/follow'), 404, 'not_found');
    $this->assertApiError($this->deleteJson('/api/v1/users/kimse.yok/follow'), 404, 'not_found');
});

test('a banned player cannot be followed, but can be unfollowed', function () {
    $me = $this->signIn();
    $banned = User::factory()->withUsername('yasakli')->create(['banned_at' => now()]);
    DB::table('follows')->insert(['follower_id' => $me->id, 'followee_id' => $banned->id, 'created_at' => now()]);

    $this->assertApiError($this->putJson('/api/v1/users/yasakli/follow'), 404, 'not_found');
    $this->deleteJson('/api/v1/users/yasakli/follow')->assertNoContent();

    expect(DB::table('follows')->count())->toBe(0);
});

test('following stops at the limit', function () {
    config(['quezby.follows.limit' => 2]);
    $this->signIn();
    foreach (['bir', 'iki', 'uc'] as $username) {
        User::factory()->withUsername($username)->create();
    }
    $this->putJson('/api/v1/users/bir/follow')->assertNoContent();
    $this->putJson('/api/v1/users/iki/follow')->assertNoContent();

    $this->assertApiError($this->putJson('/api/v1/users/uc/follow'), 422, 'follow_limit')
        ->assertJsonPath('error.message', 'En fazla 2 oyuncu takip edebilirsin.');
    // Asking again for someone already followed is still fine at the limit.
    $this->putJson('/api/v1/users/iki/follow')->assertNoContent();

    $this->deleteJson('/api/v1/users/bir/follow')->assertNoContent();
    $this->putJson('/api/v1/users/uc/follow')->assertNoContent();
    expect(DB::table('follows')->count())->toBe(2);
});

test('a banned player does not use up a place under the limit', function () {
    config(['quezby.follows.limit' => 1]);
    $me = $this->signIn();
    $banned = User::factory()->withUsername('yasakli')->create(['banned_at' => now()]);
    User::factory()->withUsername('temiz')->create();
    DB::table('follows')->insert(['follower_id' => $me->id, 'followee_id' => $banned->id, 'created_at' => now()]);

    $this->putJson('/api/v1/users/temiz/follow')->assertNoContent();
});

test('following needs a username of your own', function () {
    $this->signIn(User::factory()->create());
    User::factory()->withUsername('ayse.nur')->create();

    $this->assertApiError($this->putJson('/api/v1/users/ayse.nur/follow'), 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => ['username']]]);
});

test('the following list, newest first, with each player as a summary', function () {
    $me = $this->signIn();
    $early = User::factory()->withUsername('erken')->create();
    $late = User::factory()->withUsername('gec')->create();
    $banned = User::factory()->withUsername('yasakli')->create(['banned_at' => now()]);
    $this->recordRanked($early, 3000);
    DB::table('follows')->insert([
        ['follower_id' => $me->id, 'followee_id' => $early->id, 'created_at' => '2026-09-20 10:00:00'],
        ['follower_id' => $me->id, 'followee_id' => $banned->id, 'created_at' => '2026-09-22 10:00:00'],
        ['follower_id' => $me->id, 'followee_id' => $late->id, 'created_at' => '2026-09-23 10:00:00'],
        ['follower_id' => $late->id, 'followee_id' => $early->id, 'created_at' => '2026-09-23 11:00:00'],
    ]);

    $this->getJson('/api/v1/me/following')
        ->assertOk()
        ->assertExactJson([
            'users' => [
                ['username' => 'gec', 'best' => null, 'league' => null, 'isFollowing' => true],
                ['username' => 'erken', 'best' => 3000, 'league' => null, 'isFollowing' => true],
            ],
            'nextCursor' => null,
        ]);
});

test('the followers list says who the caller follows back', function () {
    $me = $this->signIn();
    $friend = User::factory()->withUsername('arkadas')->create();
    $fan = User::factory()->withUsername('hayran')->create();
    $banned = User::factory()->withUsername('yasakli')->create(['banned_at' => now()]);
    DB::table('follows')->insert([
        ['follower_id' => $friend->id, 'followee_id' => $me->id, 'created_at' => '2026-09-20 10:00:00'],
        ['follower_id' => $fan->id, 'followee_id' => $me->id, 'created_at' => '2026-09-21 10:00:00'],
        ['follower_id' => $banned->id, 'followee_id' => $me->id, 'created_at' => '2026-09-22 10:00:00'],
        ['follower_id' => $me->id, 'followee_id' => $friend->id, 'created_at' => '2026-09-22 11:00:00'],
    ]);

    $this->getJson('/api/v1/me/followers')
        ->assertOk()
        ->assertJsonPath('users.*.username', ['hayran', 'arkadas'])
        ->assertJsonPath('users.*.isFollowing', [false, true])
        ->assertJsonPath('nextCursor', null);
});

test('the lists page fifty at a time behind a cursor', function (string $list) {
    $me = $this->signIn();
    $players = User::factory()->withUsername()->count(55)->create();
    DB::table('follows')->insert($players->values()->map(fn (User $player, int $i) => $list === 'following'
        ? ['follower_id' => $me->id, 'followee_id' => $player->id, 'created_at' => now()->subMinutes(55 - $i)]
        : ['follower_id' => $player->id, 'followee_id' => $me->id, 'created_at' => now()->subMinutes(55 - $i)])->all());

    $first = $this->getJson("/api/v1/me/{$list}")->assertOk();
    $cursor = $first->json('nextCursor');
    expect($first->json('users'))->toHaveCount(50)
        ->and($cursor)->toBeString();

    $second = $this->getJson("/api/v1/me/{$list}?cursor={$cursor}")->assertOk()->assertJsonPath('nextCursor', null);

    $newestFirst = $players->reverse()->pluck('username')->values()->all();
    expect([...$first->json('users.*.username'), ...$second->json('users.*.username')])->toBe($newestFirst);
})->with(['following', 'followers']);

test('follows made in the same second still page in one order', function () {
    $me = $this->signIn();
    $players = User::factory()->withUsername()->count(55)->create();
    DB::table('follows')->insert($players->map(fn (User $player) => [
        'follower_id' => $me->id, 'followee_id' => $player->id, 'created_at' => now(),
    ])->all());

    $first = $this->getJson('/api/v1/me/following')->assertOk();
    $second = $this->getJson('/api/v1/me/following?cursor='.$first->json('nextCursor'))->assertOk();

    $seen = [...$first->json('users.*.username'), ...$second->json('users.*.username')];
    expect($seen)->toHaveCount(55)
        ->and(array_unique($seen))->toHaveCount(55)
        ->and($second->json('nextCursor'))->toBeNull();
});

test('a cursor the API did not write is refused', function (string $cursor) {
    $this->signIn();

    $this->assertApiError($this->getJson('/api/v1/me/following?cursor='.urlencode($cursor)), 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => ['cursor']]]);
})->with([
    'not base64' => ['!!!'],
    'base64 of something else' => [base64_encode('hello')],
    'a date without a player' => [rtrim(base64_encode('2026-09-24 10:00:00|'), '=')],
    'too long' => [str_repeat('a', 201)],
]);

test('the number of queries does not grow with the page', function () {
    $me = $this->signIn();
    $count = function (): int {
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/me/following')->assertOk();

        return count(DB::getQueryLog());
    };
    $first = User::factory()->withUsername()->create();
    DB::table('follows')->insert(['follower_id' => $me->id, 'followee_id' => $first->id, 'created_at' => now()]);
    $one = $count();

    foreach (User::factory()->withUsername()->count(30)->create() as $player) {
        $this->recordRanked($player, 1000);
        DB::table('follows')->insert(['follower_id' => $me->id, 'followee_id' => $player->id, 'created_at' => now()]);
    }

    expect($count())->toBe($one);
});

test('following needs a player', function () {
    User::factory()->withUsername('ayse.nur')->create();

    $this->assertApiError($this->putJson('/api/v1/users/ayse.nur/follow'), 401, 'unauthenticated');
    $this->assertApiError($this->deleteJson('/api/v1/users/ayse.nur/follow'), 401, 'unauthenticated');
    $this->assertApiError($this->getJson('/api/v1/me/following'), 401, 'unauthenticated');
    $this->assertApiError($this->getJson('/api/v1/me/followers'), 401, 'unauthenticated');
});
