<?php

namespace App\Services\Social;

use App\Enums\DuelStatus;
use App\Enums\ErrorCode;
use App\Enums\Locale;
use App\Enums\MessageKind;
use App\Enums\PlayerRelation;
use App\Exceptions\ApiException;
use App\Models\Duel;
use App\Models\User;
use App\Services\Push\PushService;
use App\Support\Cursor;
use App\Support\NameCursor;
use App\Support\Timestamp;
use Illuminate\Container\Attributes\Config;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Who is friends with whom, and who keeps whom away.
 *
 * A friendship takes two yeses: one player asks, the other accepts — or asks
 * back, which is the same thing. It lasts until either of them ends it or
 * blocks the other. It is two rows, one per side, so each side keeps its own
 * place in their conversation. A block ends everything between two players
 * and keeps the blocked one from finding the blocker again; the blocked
 * player is never told. A banned player is left out of every list and count.
 */
final class FriendService
{
    public const PAGE_SIZE = 50;

    /** The newest requests a player is shown, each way. */
    public const REQUEST_LIST = 100;

    public function __construct(
        private readonly Messenger $messenger,
        private readonly PushService $push,
        private readonly InboxStamp $stamp,
        #[Config('quezby.friends.limit')]
        private readonly int $limit,
        #[Config('quezby.friends.pending_limit')]
        private readonly int $pendingLimit,
    ) {}

    public function relation(User $viewer, User $player): PlayerRelation
    {
        return $this->relations($viewer, [$player->id])[$player->id] ?? PlayerRelation::None;
    }

    /**
     * What each of `$ids` is to `$viewer` — the same few queries whatever
     * the count. The viewer is left out.
     *
     * @param  list<string>  $ids
     * @return array<string, PlayerRelation>
     */
    public function relations(User $viewer, array $ids): array
    {
        $ids = array_values(array_diff(array_unique($ids), [$viewer->id]));
        if ($ids === []) {
            return [];
        }

        $relations = array_fill_keys($ids, PlayerRelation::None);
        foreach (DB::table('friend_requests')->where('sender_id', $viewer->id)->whereIn('recipient_id', $ids)->pluck('recipient_id') as $id) {
            $relations[$id] = PlayerRelation::Requested;
        }
        foreach (DB::table('friend_requests')->where('recipient_id', $viewer->id)->whereIn('sender_id', $ids)->pluck('sender_id') as $id) {
            $relations[$id] = PlayerRelation::Incoming;
        }
        foreach (array_keys($this->among($viewer, $ids)) as $id) {
            $relations[$id] = PlayerRelation::Friend;
        }
        foreach (DB::table('blocks')->where('blocker_id', $viewer->id)->whereIn('blocked_id', $ids)->pluck('blocked_id') as $id) {
            $relations[$id] = PlayerRelation::Blocked;
        }

        return $relations;
    }

    /**
     * Adds a friend: sends a request — or, when theirs is waiting, accepts
     * it. Idempotent: asking again changes nothing. A block between the two
     * answers as though the other player were not there.
     */
    public function add(User $user, User $other): PlayerRelation
    {
        if ($user->is($other)) {
            throw ApiException::of(ErrorCode::CannotBefriendSelf);
        }
        // A friend shows up by name in the other player's lists, which have no room for a nameless row.
        if ($user->username === null) {
            throw ValidationException::withMessages(['username' => [__('messages.username_to_befriend')]]);
        }
        if ($this->blockedBetween($user, $other)) {
            throw ApiException::of(ErrorCode::NotFound);
        }

        $asked = false;
        $relation = DB::transaction(function () use ($user, $other, &$asked) {
            if ($this->areFriends($user, $other)) {
                return PlayerRelation::Friend;
            }
            if ($this->hasRequest($other, $user)) {
                $this->assertRoom($user);
                $this->befriend($user, $other);

                return PlayerRelation::Friend;
            }
            if ($this->hasRequest($user, $other)) {
                return PlayerRelation::Requested;
            }

            $this->assertRoom($user);
            if ($this->pending($user) >= $this->pendingLimit) {
                throw new ApiException(ErrorCode::RequestLimit, ErrorCode::RequestLimit->message(['limit' => Locale::current()->group($this->pendingLimit)]));
            }
            $asked = DB::table('friend_requests')->insertOrIgnore([
                'sender_id' => $user->id,
                'recipient_id' => $other->id,
                'created_at' => now()->format(Timestamp::STORAGE_FORMAT),
            ]) > 0;
            if ($asked) {
                $this->stamp->bump($user, $other);
            }

            // They asked at the same moment: two yeses.
            if ($this->hasRequest($other, $user)) {
                $asked = false;
                $this->befriend($user, $other);

                return PlayerRelation::Friend;
            }

            return PlayerRelation::Requested;
        });

        if ($asked && ! $user->isBanned()) {
            $this->push->friendRequest($user, $other);
        }

        return $relation;
    }

    /**
     * Takes a request back, turns one down, or ends a friendship — whichever
     * there is. Idempotent. A block stays: only unblocking lifts it.
     */
    public function remove(User $user, User $other): PlayerRelation
    {
        $this->sever($user, $other);

        return $this->relation($user, $other);
    }

    /**
     * Ends everything between two players: their friendship and what they
     * said to each other, a request either way, and the VS still open
     * between them. Their inbox stamps move only when something was there.
     */
    public function sever(User $a, User $b): void
    {
        DB::transaction(function () use ($a, $b) {
            $gone = DB::table('friendships')->where(fn (Builder $query) => $this->pair($query, 'user_id', 'friend_id', $a, $b))->delete()
                + DB::table('friend_requests')->where(fn (Builder $query) => $this->pair($query, 'sender_id', 'recipient_id', $a, $b))->delete()
                + $this->messenger->forget($a, $b)
                + Duel::query()->where('open_pair', Duel::pairOf($a->id, $b->id))->update([
                    'status' => DuelStatus::Cancelled->value,
                    'open_pair' => null,
                    'finished_at' => now()->format(Timestamp::STORAGE_FORMAT),
                ]);
            if ($gone > 0) {
                $this->stamp->bump($a, $b);
            }
        });
    }

    /**
     * Blocks a player: ends everything between the two and keeps the blocked
     * one away until it is lifted. Idempotent.
     */
    public function block(User $user, User $other): PlayerRelation
    {
        if ($user->is($other)) {
            throw ApiException::of(ErrorCode::NotFound);
        }

        DB::transaction(function () use ($user, $other) {
            $blocked = DB::table('blocks')->insertOrIgnore([
                'blocker_id' => $user->id,
                'blocked_id' => $other->id,
                'created_at' => now()->format(Timestamp::STORAGE_FORMAT),
            ]) > 0;
            if ($blocked) {
                $this->stamp->bump($user);
            }
            $this->sever($user, $other);
        });

        return PlayerRelation::Blocked;
    }

    /** Lifts the block `$user` put on `$other`, if there is one. They are strangers again. */
    public function unblock(User $user, User $other): PlayerRelation
    {
        if (DB::table('blocks')->where('blocker_id', $user->id)->where('blocked_id', $other->id)->delete() > 0) {
            $this->stamp->bump($user);
        }

        return $this->relation($user, $other);
    }

    public function areFriends(User $a, User $b): bool
    {
        return DB::table('friendships')->where('user_id', $a->id)->where('friend_id', $b->id)->exists();
    }

    /** Whether either of the two blocked the other. */
    public function blockedBetween(User $a, User $b): bool
    {
        return DB::table('blocks')->where(fn (Builder $query) => $this->pair($query, 'blocker_id', 'blocked_id', $a, $b))->exists();
    }

    /** Whether `$player` blocked `$viewer` — then, to the viewer, they are not there. */
    public function hides(User $player, User $viewer): bool
    {
        return DB::table('blocks')->where('blocker_id', $player->id)->where('blocked_id', $viewer->id)->exists();
    }

    /**
     * Leaves out of a players query everyone on either side of a block with
     * `$viewer`.
     *
     * @template TModel of \Illuminate\Database\Eloquent\Model
     *
     * @param  EloquentBuilder<TModel>  $query
     * @return EloquentBuilder<TModel>
     */
    public function withoutBlocked(EloquentBuilder $query, User $viewer, string $column = 'users.id'): EloquentBuilder
    {
        return $query
            ->whereNotIn($column, DB::table('blocks')->where('blocked_id', $viewer->id)->select('blocker_id'))
            ->whereNotIn($column, DB::table('blocks')->where('blocker_id', $viewer->id)->select('blocked_id'));
    }

    /**
     * Which of `$ids` are `$viewer`'s friends.
     *
     * @param  list<string>  $ids
     * @return array<string, true>
     */
    public function among(User $viewer, array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        return DB::table('friendships')
            ->where('user_id', $viewer->id)
            ->whereIn('friend_id', $ids)
            ->pluck('friend_id')
            ->mapWithKeys(fn (string $id) => [$id => true])
            ->all();
    }

    /**
     * Every friend of `$user` — a friends board is them and the player.
     *
     * @return list<string>
     */
    public function ids(User $user): array
    {
        return DB::table('friendships')->where('user_id', $user->id)->pluck('friend_id')->all();
    }

    /** Friends who are not banned. */
    public function count(User $user): int
    {
        return $this->visible($user)->count();
    }

    /** Whether `$viewer` may see `$owner`'s friend list: their own, or a friend's. */
    public function canSeeFriends(User $viewer, User $owner): bool
    {
        return $viewer->is($owner) || $this->areFriends($viewer, $owner);
    }

    /**
     * A page of `$owner`'s friends as `$viewer` sees them, A to Z: no banned
     * player, nobody on either side of a block with the viewer. `total`
     * counts the whole list, every page together.
     *
     * @param  string|null  $after  The last username of the page before.
     * @return array{friends: Collection<int, User>, total: int, nextCursor: string|null}
     */
    public function listOf(User $owner, User $viewer, ?string $after): array
    {
        $query = $this->withoutBlocked(User::query(), $viewer)
            ->join('friendships', 'friendships.friend_id', '=', 'users.id')
            ->where('friendships.user_id', $owner->id)
            ->whereNull('users.banned_at');

        $rows = (clone $query)
            ->when($after !== null, fn (EloquentBuilder $query) => $query->where('users.username', '>', $after))
            ->orderBy('users.username')
            ->limit(self::PAGE_SIZE + 1)
            ->get(['users.*']);

        $page = $rows->take(self::PAGE_SIZE)->values();
        $last = $page->last();

        return [
            'friends' => $page,
            'total' => $query->count(),
            'nextCursor' => $rows->count() > self::PAGE_SIZE && $last !== null ? NameCursor::encode((string) $last->username) : null,
        ];
    }

    /**
     * The requests waiting for `$user` and the ones they sent, newest first,
     * each player with `requested_at`.
     *
     * @return array{incoming: Collection<int, User>, outgoing: Collection<int, User>}
     */
    public function requests(User $user): array
    {
        $side = fn (string $own, string $other) => User::query()
            ->join('friend_requests', "friend_requests.{$other}", '=', 'users.id')
            ->where("friend_requests.{$own}", $user->id)
            ->whereNull('users.banned_at')
            ->orderByDesc('friend_requests.created_at')
            ->orderByDesc('users.id')
            ->limit(self::REQUEST_LIST)
            ->get(['users.*', 'friend_requests.created_at as requested_at']);

        return [
            'incoming' => $side('recipient_id', 'sender_id'),
            'outgoing' => $side('sender_id', 'recipient_id'),
        ];
    }

    /**
     * A page of `$user`'s friends, the one they last heard from first. Each
     * carries `friends_since`, `last_activity_at`, `last_message_id` and
     * `last_read_message_id` from their side of the friendship.
     *
     * @param  array{0: string, 1: string}|null  $after  A parsed cursor.
     * @return array{friends: Collection<int, User>, nextCursor: string|null}
     */
    public function page(User $user, ?array $after): array
    {
        $rows = User::query()
            ->join('friendships', 'friendships.friend_id', '=', 'users.id')
            ->where('friendships.user_id', $user->id)
            ->whereNull('users.banned_at')
            ->when($after !== null, fn (EloquentBuilder $query) => $query->where(fn (EloquentBuilder $query) => $query
                ->where('friendships.last_activity_at', '<', $after[0])
                ->orWhere(fn (EloquentBuilder $query) => $query
                    ->where('friendships.last_activity_at', $after[0])
                    ->where('users.id', '<', $after[1]))))
            ->orderByDesc('friendships.last_activity_at')
            ->orderByDesc('users.id')
            ->limit(self::PAGE_SIZE + 1)
            ->get([
                'users.*',
                'friendships.created_at as friends_since',
                'friendships.last_activity_at',
                'friendships.last_message_id',
                'friendships.last_read_message_id',
            ]);

        $page = $rows->take(self::PAGE_SIZE)->values();
        $last = $page->last();

        return [
            'friends' => $page,
            'nextCursor' => $rows->count() > self::PAGE_SIZE && $last !== null
                ? Cursor::encode((string) $last->getAttribute('last_activity_at'), $last->id)
                : null,
        ];
    }

    /**
     * The players `$user` blocked, the latest first, each with `blocked_at` —
     * banned ones too, so every block can be lifted.
     *
     * @return Collection<int, User>
     */
    public function blocked(User $user): Collection
    {
        return User::query()
            ->join('blocks', 'blocks.blocked_id', '=', 'users.id')
            ->where('blocks.blocker_id', $user->id)
            ->orderByDesc('blocks.created_at')
            ->orderByDesc('users.id')
            ->get(['users.*', 'blocks.created_at as blocked_at']);
    }

    /** How many players have blocked `$user` — a sign for moderators, never shown to players. */
    public function blockedByCount(User $user): int
    {
        return DB::table('blocks')->where('blocked_id', $user->id)->count();
    }

    /**
     * Both rows of a new friendship; the requests between the two are
     * answered. Their conversation opens with "friends now", from the one who
     * said the second yes to the one who asked.
     */
    private function befriend(User $accepter, User $asker): void
    {
        $now = now()->format(Timestamp::STORAGE_FORMAT);
        DB::table('friend_requests')->where(fn (Builder $query) => $this->pair($query, 'sender_id', 'recipient_id', $accepter, $asker))->delete();
        DB::table('friendships')->insertOrIgnore([
            ['user_id' => $accepter->id, 'friend_id' => $asker->id, 'created_at' => $now, 'last_activity_at' => $now],
            ['user_id' => $asker->id, 'friend_id' => $accepter->id, 'created_at' => $now, 'last_activity_at' => $now],
        ]);
        $this->messenger->say($accepter, $asker, MessageKind::Friends);
    }

    private function hasRequest(User $from, User $to): bool
    {
        return DB::table('friend_requests')->where('sender_id', $from->id)->where('recipient_id', $to->id)->exists();
    }

    /** Requests `$user` sent that still wait, to players who are not banned. */
    private function pending(User $user): int
    {
        return DB::table('friend_requests')
            ->join('users', 'users.id', '=', 'friend_requests.recipient_id')
            ->where('friend_requests.sender_id', $user->id)
            ->whereNull('users.banned_at')
            ->count();
    }

    private function assertRoom(User $user): void
    {
        if ($this->count($user) >= $this->limit) {
            throw new ApiException(ErrorCode::FriendLimit, ErrorCode::FriendLimit->message(['limit' => Locale::current()->group($this->limit)]));
        }
    }

    /** `$user`'s side of their friendships with players who are not banned. */
    private function visible(User $user): Builder
    {
        return DB::table('friendships')
            ->join('users', 'users.id', '=', 'friendships.friend_id')
            ->where('friendships.user_id', $user->id)
            ->whereNull('users.banned_at');
    }

    /** Rows between `$a` and `$b`, either way round. */
    private function pair(Builder $query, string $one, string $two, User $a, User $b): Builder
    {
        return $query
            ->where(fn (Builder $query) => $query->where($one, $a->id)->where($two, $b->id))
            ->orWhere(fn (Builder $query) => $query->where($one, $b->id)->where($two, $a->id));
    }
}
