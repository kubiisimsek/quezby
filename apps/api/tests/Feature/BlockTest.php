<?php

use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-24 12:00', 'Europe/Istanbul'));
});

test('blocking ends a friendship and every request between the two', function () {
    $me = $this->signIn();
    $friend = User::factory()->withUsername('kanka')->create();
    $this->befriend($me, $friend);
    $this->requestFriend($friend, $me);

    $this->putJson('/api/v1/users/kanka/block')->assertOk()->assertExactJson(['relation' => 'blocked']);
    $this->putJson('/api/v1/users/kanka/block')->assertOk()->assertExactJson(['relation' => 'blocked']);

    expect(DB::table('friendships')->count())->toBe(0)
        ->and(DB::table('friend_requests')->count())->toBe(0)
        ->and(DB::table('blocks')->get(['blocker_id', 'blocked_id'])->map(fn ($row) => (array) $row)->all())
        ->toBe([['blocker_id' => $me->id, 'blocked_id' => $friend->id]]);
    $this->getJson('/api/v1/users/kanka')->assertOk()->assertJsonPath('player.relation', 'blocked');
});

test('to the blocked player, the blocker is not there', function () {
    $blocker = User::factory()->withUsername('kerem.35')->create();
    $me = $this->signIn(User::factory()->withUsername('kerem.ist')->create());
    $this->block($blocker, $me);

    $this->assertApiError($this->getJson('/api/v1/users/kerem.35'), 404, 'not_found');
    $this->assertApiError($this->putJson('/api/v1/users/kerem.35/friend'), 404, 'not_found');
    $this->getJson('/api/v1/users?search=kerem')->assertOk()->assertExactJson(['users' => []]);
    expect(DB::table('friend_requests')->count())->toBe(0);
});

test('the blocker does not find the blocked in a search either, and cannot add them before lifting it', function () {
    $me = $this->signIn(User::factory()->withUsername('kerem.35')->create());
    User::factory()->withUsername('kerem.ist')->create();
    $this->putJson('/api/v1/users/kerem.ist/block')->assertOk();

    $this->getJson('/api/v1/users?search=kerem')->assertOk()->assertExactJson(['users' => []]);
    $this->assertApiError($this->putJson('/api/v1/users/kerem.ist/friend'), 404, 'not_found');

    $this->deleteJson('/api/v1/users/kerem.ist/block')->assertOk()->assertExactJson(['relation' => 'none']);
    $this->putJson('/api/v1/users/kerem.ist/friend')->assertJsonPath('relation', 'requested');
    expect($me->exists)->toBeTrue();
});

test('the blocks list: the latest first, banned players too', function () {
    $me = $this->signIn();
    $first = User::factory()->withUsername('ilk')->create();
    $banned = User::factory()->withUsername('yasakli')->create(['banned_at' => now()]);
    DB::table('blocks')->insert([
        ['blocker_id' => $me->id, 'blocked_id' => $first->id, 'created_at' => '2026-09-20 10:00:00.000'],
        ['blocker_id' => $me->id, 'blocked_id' => $banned->id, 'created_at' => '2026-09-22 10:00:00.000'],
        ['blocker_id' => $banned->id, 'blocked_id' => $me->id, 'created_at' => '2026-09-23 10:00:00.000'],
    ]);

    $this->getJson('/api/v1/me/blocks')->assertOk()->assertExactJson(['users' => [
        ['username' => 'yasakli', 'avatarUrl' => null, 'blockedAt' => '2026-09-22T10:00:00.000Z'],
        ['username' => 'ilk', 'avatarUrl' => null, 'blockedAt' => '2026-09-20T10:00:00.000Z'],
    ]]);

    // A banned player's block can still be lifted.
    $this->deleteJson('/api/v1/users/yasakli/block')->assertOk();
    expect(DB::table('blocks')->where('blocker_id', $me->id)->count())->toBe(1);
});

test('nobody blocks themselves or an unknown player', function () {
    $this->signIn(User::factory()->withUsername('kendim')->create());

    $this->assertApiError($this->putJson('/api/v1/users/kendim/block'), 404, 'not_found');
    $this->assertApiError($this->putJson('/api/v1/users/kimse.yok/block'), 404, 'not_found');
    $this->assertApiError($this->deleteJson('/api/v1/users/kimse.yok/block'), 404, 'not_found');
});

test('blocks need a player', function () {
    User::factory()->withUsername('ayse.nur')->create();

    $this->assertApiError($this->putJson('/api/v1/users/ayse.nur/block'), 401, 'unauthenticated');
    $this->assertApiError($this->deleteJson('/api/v1/users/ayse.nur/block'), 401, 'unauthenticated');
    $this->assertApiError($this->getJson('/api/v1/me/blocks'), 401, 'unauthenticated');
});
