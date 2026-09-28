<?php

namespace App\Services\Social;

use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * The number a phone polls to learn that its inbox changed (`GET /me/pulse`).
 * Each player's goes up whenever a request, a friendship, a line or a VS of
 * theirs does; a phone that sees it move fetches what it shows, and while it
 * stands still nothing else is asked. It moves in the caller's transaction,
 * so a change that rolls back never moves it.
 */
final class InboxStamp
{
    public function bump(User ...$players): void
    {
        $ids = array_values(array_unique(array_map(fn (User $player) => $player->id, $players)));
        if ($ids !== []) {
            DB::table('users')->whereIn('id', $ids)->increment('inbox_stamp');
        }
    }

    public function of(User $player): int
    {
        return (int) DB::table('users')->where('id', $player->id)->value('inbox_stamp');
    }
}
