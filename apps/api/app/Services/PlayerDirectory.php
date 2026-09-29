<?php

namespace App\Services;

use App\Enums\LeaderboardPeriod;
use App\Enums\PlayerRelation;
use App\Models\User;
use App\Services\Avatars\AvatarService;
use App\Services\Rating\RatingService;
use App\Services\Social\FriendService;
use App\Support\Timestamp;
use App\Support\Username;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;

/**
 * Players as other players see them. Search, the profile card and the friend
 * lists all shape a player here, with the same handful of queries whatever
 * the page size: every best, rating and relation is fetched at once. A
 * banned player is shown to nobody but themselves, and a player who blocked
 * the viewer is not there for them.
 */
final class PlayerDirectory
{
    public const SEARCH_LIMIT = 20;

    public function __construct(
        private readonly LeaderboardService $leaderboards,
        private readonly RatingService $ratings,
        private readonly FriendService $friends,
    ) {}

    /**
     * The player behind a username as typed or linked; a banned one only for
     * themselves, and nobody who blocked the viewer.
     */
    public function find(string $username, User $viewer): ?User
    {
        $player = $this->named($username);
        if ($player === null || $player->is($viewer)) {
            return $player;
        }

        return $player->isBanned() || $this->friends->hides($player, $viewer) ? null : $player;
    }

    /** Anyone by username, banned or not. */
    public function named(string $username): ?User
    {
        $name = Username::normalize($username);

        return $name === '' ? null : User::query()->where('username', $name)->first();
    }

    /**
     * Up to twenty players whose username starts with `$prefix`, by username —
     * never the viewer, never a banned player, nobody on either side of a
     * block with the viewer.
     *
     * @return list<array{username: string, avatarUrl: string|null, best: int|null, league: string|null, relation: string}>
     */
    public function search(User $viewer, string $prefix): array
    {
        $players = $this->friends->withoutBlocked(User::query(), $viewer)
            ->where('username', 'like', $prefix.'%')
            ->whereKeyNot($viewer->getKey())
            ->whereNull('banned_at')
            ->orderBy('username')
            ->limit(self::SEARCH_LIMIT)
            ->get();

        return $this->summaries($viewer, $players);
    }

    /**
     * `PlayerSummary` in `packages/types` for each player, in the order given.
     *
     * @param  Collection<int, User>  $players
     * @return list<array{username: string, avatarUrl: string|null, best: int|null, league: string|null, relation: string}>
     */
    public function summaries(User $viewer, Collection $players): array
    {
        /** @var list<string> $ids */
        $ids = $players->modelKeys();
        $bests = $ids === [] ? [] : $this->leaderboards->scope(LeaderboardPeriod::All, 'all')
            ->whereIn('user_id', $ids)
            ->toBase()
            ->pluck('score', 'user_id')
            ->all();
        $tiers = $this->ratings->tiersOf($ids);
        $relations = $this->friends->relations($viewer, $ids);

        return $players->map(fn (User $player) => [
            'username' => (string) $player->username,
            'avatarUrl' => AvatarService::url($player->avatar),
            'best' => isset($bests[$player->id]) ? (int) $bests[$player->id] : null,
            'league' => $tiers[$player->id] ?? null,
            'relation' => ($relations[$player->id] ?? PlayerRelation::None)->value,
        ])->values()->all();
    }

    /**
     * One player as a `PlayerSummary`.
     *
     * @return array{username: string, avatarUrl: string|null, best: int|null, league: string|null, relation: string}
     */
    public function summary(User $viewer, User $player): array
    {
        return $this->summaries($viewer, new EloquentCollection([$player]))[0];
    }

    /**
     * `PlayerCard` in `packages/types`: the season's best and ranks, the
     * rating and its league, lifetime numbers, friends and what the two are
     * to each other.
     *
     * @return array<string, mixed>
     */
    public function card(User $viewer, User $player): array
    {
        $best = $this->leaderboards->bestOf($player);
        $weekly = $this->leaderboards->rowOf($player, LeaderboardPeriod::Weekly, $this->leaderboards->keyAt(LeaderboardPeriod::Weekly, now()));
        $stats = $player->stats()->first();

        return [
            'username' => (string) $player->username,
            'avatarUrl' => AvatarService::url($player->avatar),
            'createdAt' => Timestamp::iso($player->created_at),
            'best' => $best === null ? null : [
                'score' => $best->score,
                'reels' => $best->reels,
                'achievedAt' => Timestamp::iso($best->achieved_at),
            ],
            'league' => $this->ratings->tiersOf([$player->id])[$player->id] ?? null,
            'rating' => $this->ratings->ratingsOf([$player->id])[$player->id] ?? null,
            'ranks' => [
                'weekly' => $weekly === null ? null : $this->leaderboards->rankOf($weekly),
                'all' => $best === null ? null : $this->leaderboards->rankOf($best),
            ],
            'stats' => [
                'runs' => $stats->runs ?? 0,
                'reels' => $stats->reels ?? 0,
                'likes' => $stats->likes ?? 0,
                'perfects' => $stats->perfects ?? 0,
            ],
            'friends' => $this->friends->count($player),
            'relation' => ($player->is($viewer) ? PlayerRelation::None : $this->friends->relation($viewer, $player))->value,
            'isMe' => $player->is($viewer),
        ];
    }
}
