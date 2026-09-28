<?php

namespace App\Services\Social;

use App\Support\Timestamp;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * The one-time move from follows to friends
 * (`2026_09_30_000100_create_social_tables`): two players who followed each
 * other become friends, since both had said yes; a one-way follow becomes a
 * request from the follower, which the one followed can accept or turn down.
 * Nobody is made anyone's friend without having asked for it.
 */
final class FollowsToFriends
{
    /** @return array{friends: int, requests: int} Pairs made friends, requests left waiting. */
    public static function convert(): array
    {
        /** @var array<string, string> $follows `follower|followee` → when. */
        $follows = [];
        DB::table('follows')->orderBy('follower_id')->orderBy('followee_id')
            ->each(function (object $row) use (&$follows) {
                $follows["{$row->follower_id}|{$row->followee_id}"] = (string) $row->created_at;
            });

        $friendships = [];
        $requests = [];
        foreach ($follows as $pair => $at) {
            [$follower, $followee] = explode('|', $pair);
            $back = $follows["{$followee}|{$follower}"] ?? null;
            $at = self::stored($at);
            if ($back === null) {
                $requests[] = ['sender_id' => $follower, 'recipient_id' => $followee, 'created_at' => $at];

                continue;
            }
            // Friends since the second of the two follows: that is when both had said yes.
            $since = max($at, self::stored($back));
            $friendships[] = [
                'user_id' => $follower,
                'friend_id' => $followee,
                'created_at' => $since,
                'last_activity_at' => $since,
            ];
        }

        foreach (array_chunk($friendships, 500) as $chunk) {
            DB::table('friendships')->insertOrIgnore($chunk);
        }
        foreach (array_chunk($requests, 500) as $chunk) {
            DB::table('friend_requests')->insertOrIgnore($chunk);
        }

        return ['friends' => intdiv(count($friendships), 2), 'requests' => count($requests)];
    }

    private static function stored(string $at): string
    {
        return Carbon::parse($at, 'UTC')->format(Timestamp::STORAGE_FORMAT);
    }
}
