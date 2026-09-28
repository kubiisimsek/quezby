<?php

use App\Models\User;
use App\Services\Social\FollowsToFriends;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/*
| The follows there were when friends came in: two players who followed each
| other became friends; a one-way follow became a request from the follower.
*/

beforeEach(function () {
    Schema::create('follows', function (Blueprint $table) {
        $table->foreignUlid('follower_id');
        $table->foreignUlid('followee_id');
        $table->dateTime('created_at');
    });
});

test('mutual follows become friends, one-way follows become requests', function () {
    [$ayse, $ekin, $kerem, $deniz] = User::factory()->withUsername()->count(4)->create()->all();
    DB::table('follows')->insert([
        ['follower_id' => $ayse->id, 'followee_id' => $ekin->id, 'created_at' => '2026-09-20 10:00:00'],
        ['follower_id' => $ekin->id, 'followee_id' => $ayse->id, 'created_at' => '2026-09-22 09:30:00'],
        ['follower_id' => $kerem->id, 'followee_id' => $ayse->id, 'created_at' => '2026-09-21 08:00:00'],
        ['follower_id' => $deniz->id, 'followee_id' => $kerem->id, 'created_at' => '2026-09-23 12:00:00'],
    ]);

    expect(FollowsToFriends::convert())->toBe(['friends' => 1, 'requests' => 2]);

    // Friends since the second yes, on both rows.
    expect(DB::table('friendships')->orderBy('user_id')->get(['user_id', 'friend_id', 'created_at', 'last_activity_at'])->map(fn ($row) => (array) $row)->sortBy('user_id')->values()->all())
        ->toEqualCanonicalizing([
            ['user_id' => $ayse->id, 'friend_id' => $ekin->id, 'created_at' => '2026-09-22 09:30:00.000', 'last_activity_at' => '2026-09-22 09:30:00.000'],
            ['user_id' => $ekin->id, 'friend_id' => $ayse->id, 'created_at' => '2026-09-22 09:30:00.000', 'last_activity_at' => '2026-09-22 09:30:00.000'],
        ])
        ->and(DB::table('friend_requests')->get(['sender_id', 'recipient_id', 'created_at'])->map(fn ($row) => (array) $row)->all())
        ->toEqualCanonicalizing([
            ['sender_id' => $kerem->id, 'recipient_id' => $ayse->id, 'created_at' => '2026-09-21 08:00:00.000'],
            ['sender_id' => $deniz->id, 'recipient_id' => $kerem->id, 'created_at' => '2026-09-23 12:00:00.000'],
        ]);
});

test('no follows, no friends', function () {
    expect(FollowsToFriends::convert())->toBe(['friends' => 0, 'requests' => 0])
        ->and(DB::table('friendships')->count())->toBe(0);
});
