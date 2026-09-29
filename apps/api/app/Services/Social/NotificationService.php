<?php

namespace App\Services\Social;

use App\Enums\MessageKind;
use App\Models\Duel;
use App\Models\User;
use App\Services\PlayerDirectory;
use App\Support\Timestamp;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * The bell on the lobby: what happened to a player among friends. A request
 * waiting for them, and the game's lines a friend's move sent them — their
 * request accepted, a VS sent to them, and what became of one they sent:
 * played, turned down, run out. Phrases are the inbox's, and a player is
 * never told of their own lines. Nothing is stored for it: it reads the
 * requests and the lines as they are, and `users.notifications_seen_at` —
 * when the player last opened the list — says what is new. Banned players
 * and anyone on either side of a block with the player are left out.
 */
final class NotificationService
{
    /** The newest notifications the list shows. */
    public const LIST = 50;

    public function __construct(
        private readonly DuelService $duels,
        private readonly PlayerDirectory $players,
        private readonly InboxStamp $stamp,
    ) {}

    /**
     * `NotificationsResponse`: the newest fifty, newest first, and how many
     * of them all are unseen. A VS whose time ran out is settled first, as
     * the pulse does. The same handful of queries however many there are.
     *
     * @return array{notifications: list<array<string, mixed>>, unseen: int}
     */
    public function list(User $user): array
    {
        $this->duels->settleDue($user);
        $seenAt = $user->notifications_seen_at;

        $rows = DB::query()
            ->fromSub($this->items($user), 'notifications')
            ->orderByDesc('created_at')
            ->orderByRaw('coalesce(message_id, 0) desc')
            ->orderByDesc('player_id')
            ->limit(self::LIST)
            ->get();
        if ($rows->isEmpty()) {
            return ['notifications' => [], 'unseen' => 0];
        }

        $players = User::query()->whereIn('id', $rows->pluck('player_id')->unique()->values()->all())->get();
        $summaries = array_combine($players->modelKeys(), $this->players->summaries($user, $players));
        $duelIds = $rows->pluck('duel_id')->filter()->unique()->values()->all();
        $duels = $duelIds === [] ? collect() : Duel::query()->whereIn('id', $duelIds)->get()->keyBy('id');

        $notifications = $rows->map(function (object $row) use ($user, $seenAt, $summaries, $duels) {
            /** @var Duel|null $duel */
            $duel = $row->duel_id === null ? null : $duels->get($row->duel_id);

            return [
                'id' => $row->message_id === null ? 'request:'.$summaries[$row->player_id]['username'] : 'message:'.$row->message_id,
                'kind' => $row->kind,
                'player' => $summaries[$row->player_id],
                'duel' => $duel === null ? null : $this->duels->brief($user, $duel),
                'createdAt' => Timestamp::isoStored($row->created_at),
                'unseen' => $seenAt === null || Carbon::parse($row->created_at, 'UTC')->greaterThan($seenAt),
            ];
        })->values()->all();

        return [
            'notifications' => $notifications,
            'unseen' => $this->unseenCount($user),
        ];
    }

    /** Notifications newer than the last time the player opened the list — the bell's badge. One query. */
    public function unseenCount(User $user): int
    {
        return DB::query()->fromSub($this->items($user, $user->notifications_seen_at), 'notifications')->count();
    }

    /**
     * The player opened the list: everything so far is seen. When something
     * was unseen, their inbox stamp moves, so their other phone's badge
     * clears too.
     */
    public function markSeen(User $user): void
    {
        $unseen = $this->unseenCount($user);
        $now = now()->format(Timestamp::STORAGE_FORMAT);
        DB::table('users')->where('id', $user->id)->update(['notifications_seen_at' => $now]);
        // Raw, so the model keeps the milliseconds the column does.
        $user->setRawAttributes(['notifications_seen_at' => $now] + $user->getAttributes());
        $user->syncOriginalAttribute('notifications_seen_at');

        if ($unseen > 0) {
            $this->stamp->bump($user);
        }
    }

    /**
     * Every notification of `$user` — only those after `$after`, when given
     * — each a row of `message_id` (null for a request), `kind`,
     * `player_id`, `duel_id` and `created_at`: the game's lines a friend
     * sent them, and the requests waiting for them.
     */
    private function items(User $user, ?Carbon $after = null): Builder
    {
        $since = $after?->format(Timestamp::STORAGE_FORMAT);

        $lines = $this->fromPlayers(DB::table('messages'), $user, 'messages.sender_id')
            ->where('messages.recipient_id', $user->id)
            ->where('messages.kind', '!=', MessageKind::Phrase->value)
            ->when($since !== null, fn (Builder $query) => $query->where('messages.created_at', '>', $since))
            ->select([
                'messages.id as message_id',
                'messages.kind',
                'messages.sender_id as player_id',
                'messages.duel_id',
                'messages.created_at',
            ]);

        $requests = $this->fromPlayers(DB::table('friend_requests'), $user, 'friend_requests.sender_id')
            ->where('friend_requests.recipient_id', $user->id)
            ->when($since !== null, fn (Builder $query) => $query->where('friend_requests.created_at', '>', $since))
            ->selectRaw("null as message_id, 'friend_request' as kind, friend_requests.sender_id as player_id, null as duel_id, friend_requests.created_at");

        return $lines->unionAll($requests);
    }

    /** Rows whose `$column` is a player who is not banned, and on neither side of a block with `$user`. */
    private function fromPlayers(Builder $query, User $user, string $column): Builder
    {
        return $query
            ->join('users', 'users.id', '=', $column)
            ->whereNull('users.banned_at')
            ->whereNotIn($column, DB::table('blocks')->where('blocked_id', $user->id)->select('blocker_id'))
            ->whereNotIn($column, DB::table('blocks')->where('blocker_id', $user->id)->select('blocked_id'));
    }
}
