<?php

namespace App\Services\Social;

use App\Enums\DuelStatus;
use App\Enums\ErrorCode;
use App\Enums\Locale;
use App\Enums\MessageKind;
use App\Enums\Phrase;
use App\Exceptions\ApiException;
use App\Models\Duel;
use App\Models\Message;
use App\Models\User;
use App\Services\PlayerDirectory;
use App\Support\Timestamp;
use Illuminate\Container\Attributes\Config;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * The inbox: the requests waiting for a player and one conversation per
 * friend — what the badge counts, the friends list with each one's last line,
 * a conversation page by page, and the phrases a player sends. Lines older
 * than `inbox.keep_days` are pruned a chunk at a time, at most once an hour,
 * once a response has gone.
 */
final class InboxService
{
    public const THREAD_PAGE = 30;

    /** The VS waiting for the player that the summary names. */
    public const WAITING_SHOWN = 3;

    private const PRUNE_KEY = 'inbox:prune';

    private const PRUNE_CHUNK = 1000;

    public function __construct(
        private readonly FriendService $friends,
        private readonly Messenger $messenger,
        private readonly DuelService $duels,
        private readonly PlayerDirectory $players,
        private readonly InboxStamp $stamp,
        private readonly NotificationService $notifications,
        #[Config('quezby.inbox.phrases_per_day')]
        private readonly int $phrasesPerDay,
        #[Config('quezby.inbox.keep_days')]
        private readonly int $keepDays,
        #[Config('quezby.leaderboard.timezone')]
        private readonly string $timezone,
    ) {}

    /**
     * `InboxSummary`: requests waiting, conversations wanting a look — a line
     * unread or a VS waiting for the player — and how many of those are VS;
     * the player's friends, and the first few VS waiting for them, the one
     * running out first first; the notifications they have not seen.
     *
     * @return array{requests: int, threads: int, yourTurn: int, friends: int, waiting: list<array{id: string, opponent: array<string, mixed>, expiresAt: string|null}>, notifications: int, serverTime: string|null}
     */
    public function summary(User $user): array
    {
        $this->duels->settleFor($user);
        $unread = array_keys($this->unread($user));
        $waiting = $this->waitingFor($user);
        /** @var list<string> $yourTurn */
        $yourTurn = $waiting->pluck('challenger_id')->unique()->values()->all();

        $shown = $waiting->take(self::WAITING_SHOWN)->values()->load('challenger');
        $opponents = $this->players->summaries($user, new EloquentCollection($shown->map(fn (Duel $duel) => $duel->challenger)->all()));

        return [
            'requests' => $this->friends->requests($user)['incoming']->count(),
            'threads' => count(array_unique([...$unread, ...$yourTurn])),
            'yourTurn' => count($yourTurn),
            'friends' => $this->friends->count($user),
            'waiting' => $shown->map(fn (Duel $duel, int $i) => [
                'id' => $duel->id,
                'opponent' => $opponents[$i],
                'expiresAt' => Timestamp::iso($duel->expires_at),
            ])->all(),
            'notifications' => $this->notifications->unseenCount($user),
            'serverTime' => Timestamp::iso(now()),
        ];
    }

    /**
     * `Pulse`: the player's inbox stamp, once a VS of theirs whose time ran
     * out has been settled — the one thing that changes with no one acting.
     * Two indexed reads; the lists themselves are asked only when it moved.
     */
    public function pulse(User $user): int
    {
        $this->duels->settleDue($user);

        return $this->stamp->of($user);
    }

    /**
     * `FriendsResponse`: a page of friends, the one last heard from first,
     * each with their last line, what is unread and the VS open between you.
     *
     * @param  array{0: string, 1: string}|null  $after
     * @return array{friends: list<array<string, mixed>>, nextCursor: string|null}
     */
    public function friends(User $user, ?array $after): array
    {
        $this->prune();
        $this->duels->settleFor($user);
        $page = $this->friends->page($user, $after);
        /** @var Collection<int, User> $friends */
        $friends = $page['friends']->values();
        $summaries = $this->players->summaries($user, $friends);
        $ids = $friends->modelKeys();

        $unread = $this->unread($user, $ids);
        $lasts = Message::query()
            ->whereIn('id', $friends->map(fn (User $friend) => $friend->getAttribute('last_message_id'))->filter()->values()->all())
            ->with('duel')
            ->get()
            ->keyBy('id');
        $duels = Duel::query()
            ->whereIn('open_pair', array_map(fn (string $id) => Duel::pairOf($user->id, $id), $ids))
            ->get()
            ->filter(fn (Duel $duel) => $this->duels->shows($duel, $user))
            ->keyBy(fn (Duel $duel) => $duel->otherOf($user));

        return [
            'friends' => $friends->map(function (User $friend, int $i) use ($user, $summaries, $unread, $lasts, $duels) {
                $last = $lasts->get((int) $friend->getAttribute('last_message_id'));
                $duel = $duels->get($friend->id);

                return [
                    'player' => $summaries[$i],
                    'friendsSince' => Timestamp::isoStored($friend->getAttribute('friends_since')),
                    'lastActivityAt' => Timestamp::isoStored($friend->getAttribute('last_activity_at')),
                    'last' => $last === null ? null : $this->present($user, $last),
                    'unread' => $unread[$friend->id] ?? 0,
                    'duel' => $duel === null ? null : $this->duels->brief($user, $duel),
                ];
            })->all(),
            'nextCursor' => $page['nextCursor'],
        ];
    }

    /**
     * `ThreadResponse`: the conversation with a friend, newest page first
     * (each page oldest line first), the VS open between them and how the two
     * stand. Not friends, no conversation.
     *
     * @return array<string, mixed>
     */
    public function thread(User $user, User $friend, ?int $before): array
    {
        if (! $this->friends->areFriends($user, $friend)) {
            throw ApiException::of(ErrorCode::NotFound);
        }
        $this->prune();

        $duel = $this->duels->openFor($user, $friend);
        $rows = $this->between($user, $friend)
            ->when($before !== null, fn (Builder $query) => $query->where('id', '<', $before))
            ->orderByDesc('id')
            ->limit(self::THREAD_PAGE + 1)
            ->with('duel')
            ->get();
        $page = $rows->take(self::THREAD_PAGE);
        $summary = $this->players->summary($user, $friend);

        return [
            'player' => $summary,
            'h2h' => $this->duels->h2h($user, $friend->id),
            'duel' => $duel === null ? null : $this->duels->view($user, $duel, $summary),
            'messages' => $page->reverse()->values()->map(fn (Message $message) => $this->present($user, $message))->all(),
            'nextBefore' => $rows->count() > self::THREAD_PAGE ? $page->last()?->id : null,
        ];
    }

    /** Marks the conversation with a friend read, up to its newest line. */
    public function read(User $user, User $friend): void
    {
        $newest = $this->between($user, $friend)->max('id');
        if ($newest === null) {
            return;
        }

        DB::table('friendships')
            ->where('user_id', $user->id)
            ->where('friend_id', $friend->id)
            ->where(fn ($query) => $query->whereNull('last_read_message_id')->orWhere('last_read_message_id', '<', $newest))
            ->update(['last_read_message_id' => $newest]);
    }

    /**
     * Sends a friend a phrase — at most `inbox.phrases_per_day` to one
     * friend in an Istanbul day.
     */
    public function sendPhrase(User $user, User $friend, Phrase $phrase): Message
    {
        if ($user->is($friend) || ! $this->friends->areFriends($user, $friend)) {
            throw ApiException::of(ErrorCode::NotFriends);
        }
        $today = now()->setTimezone($this->timezone)->startOfDay()->utc()->format(Timestamp::STORAGE_FORMAT);
        $sent = Message::query()
            ->where('sender_id', $user->id)
            ->where('recipient_id', $friend->id)
            ->where('kind', MessageKind::Phrase)
            ->where('created_at', '>=', $today)
            ->count();
        if ($sent >= $this->phrasesPerDay) {
            throw new ApiException(ErrorCode::MessageLimit, ErrorCode::MessageLimit->message(['limit' => Locale::current()->group($this->phrasesPerDay)]));
        }

        return $this->messenger->say($user, $friend, MessageKind::Phrase, $phrase) ?? throw ApiException::of(ErrorCode::NotFriends);
    }

    /**
     * `InboxMessage` in `packages/types`, from `$viewer`'s side.
     *
     * @return array<string, mixed>
     */
    public function present(User $viewer, Message $message): array
    {
        $duel = $message->duel;

        return [
            'id' => $message->id,
            'kind' => $message->kind->value,
            'mine' => $message->sender_id === $viewer->id,
            'phrase' => $message->phrase?->value,
            'duel' => $duel === null ? null : $this->duels->brief($viewer, $duel),
            'createdAt' => Timestamp::iso($message->created_at),
        ];
    }

    /** Deletes lines older than the keep: once an hour at most, after the response. */
    public function prune(): void
    {
        if (! Cache::add(self::PRUNE_KEY, true, 3600)) {
            return;
        }
        defer(fn () => $this->pruneNow(1));
    }

    /** @return int Lines deleted: `$rounds` statements of at most a thousand. */
    public function pruneNow(int $rounds = PHP_INT_MAX): int
    {
        $before = now()->subDays($this->keepDays)->format(Timestamp::STORAGE_FORMAT);
        $deleted = 0;
        for ($round = 0; $round < $rounds; $round++) {
            $ids = Message::query()->where('created_at', '<', $before)->orderBy('id')->limit(self::PRUNE_CHUNK)->pluck('id');
            if ($ids->isEmpty()) {
                break;
            }
            $deleted += Message::query()->whereIn('id', $ids)->delete();
        }

        return $deleted;
    }

    /**
     * Unread lines per friend: theirs, after what `$user` last read. Banned
     * friends are left out.
     *
     * @param  list<string>|null  $among  Only these friends.
     * @return array<string, int>
     */
    private function unread(User $user, ?array $among = null): array
    {
        return DB::table('messages')
            ->join('friendships', fn (JoinClause $join) => $join
                ->on('friendships.user_id', '=', 'messages.recipient_id')
                ->on('friendships.friend_id', '=', 'messages.sender_id'))
            ->join('users', 'users.id', '=', 'messages.sender_id')
            ->where('messages.recipient_id', $user->id)
            ->whereNull('users.banned_at')
            ->whereRaw('messages.id > coalesce(friendships.last_read_message_id, 0)')
            ->when($among !== null, fn ($query) => $query->whereIn('messages.sender_id', $among))
            ->groupBy('messages.sender_id')
            ->selectRaw('messages.sender_id, count(*) as unread')
            ->pluck('unread', 'sender_id')
            ->map(fn ($count) => (int) $count)
            ->all();
    }

    /**
     * The VS that wait for `$user` to play them — sent by a friend who is not
     * banned, not started yet — the one running out first first. Each is its
     * id, `challenger_id` and `expires_at`.
     *
     * @return EloquentCollection<int, Duel>
     */
    private function waitingFor(User $user): EloquentCollection
    {
        return Duel::query()
            ->join('users', 'users.id', '=', 'duels.challenger_id')
            ->join('friendships', fn (JoinClause $join) => $join
                ->on('friendships.user_id', '=', 'duels.opponent_id')
                ->on('friendships.friend_id', '=', 'duels.challenger_id'))
            ->where('duels.opponent_id', $user->id)
            ->where('duels.status', DuelStatus::Waiting)
            ->whereNull('duels.opponent_run_id')
            ->whereNull('users.banned_at')
            ->orderBy('duels.expires_at')
            ->orderBy('duels.id')
            ->get(['duels.id', 'duels.challenger_id', 'duels.expires_at']);
    }

    /** @return Builder<Message> Every line between the two. */
    private function between(User $a, User $b): Builder
    {
        return Message::query()->where(fn (Builder $query) => $query
            ->where(fn (Builder $query) => $query->where('sender_id', $a->id)->where('recipient_id', $b->id))
            ->orWhere(fn (Builder $query) => $query->where('sender_id', $b->id)->where('recipient_id', $a->id)));
    }
}
