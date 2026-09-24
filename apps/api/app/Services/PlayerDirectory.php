<?php

namespace App\Services;

use App\Enums\LeaderboardPeriod;
use App\Models\LeagueMember;
use App\Models\User;
use App\Support\Timestamp;
use App\Support\Username;
use Illuminate\Support\Collection;

/**
 * Players as other players see them. Search, the profile card and the follow
 * lists all shape a player here, with the same handful of queries whatever
 * the page size: every best, league seat and follow flag is fetched at once.
 * A banned player is shown to nobody but themselves.
 */
final class PlayerDirectory
{
    public const SEARCH_LIMIT = 20;

    public function __construct(
        private readonly LeaderboardService $leaderboards,
        private readonly LeagueService $leagues,
        private readonly FollowService $follows,
    ) {}

    /** The player behind a username as typed or linked; a banned one only for themselves. */
    public function find(string $username, User $viewer): ?User
    {
        $player = $this->named($username);

        return $player === null || ($player->isBanned() && ! $player->is($viewer)) ? null : $player;
    }

    /** Anyone by username, banned or not. */
    public function named(string $username): ?User
    {
        $name = Username::normalize($username);

        return $name === '' ? null : User::query()->where('username', $name)->first();
    }

    /**
     * Up to twenty players whose username starts with `$prefix`, by username —
     * never the viewer, never a banned player.
     *
     * @return list<array{username: string, best: int|null, league: string|null, isFollowing: bool}>
     */
    public function search(User $viewer, string $prefix): array
    {
        $players = User::query()
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
     * @return list<array{username: string, best: int|null, league: string|null, isFollowing: bool}>
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
        $tiers = $this->tiersOf($ids);
        $following = $this->leaderboards->followedAmong($viewer, $ids);

        return $players->map(fn (User $player) => [
            'username' => (string) $player->username,
            'best' => isset($bests[$player->id]) ? (int) $bests[$player->id] : null,
            'league' => $tiers[$player->id] ?? null,
            'isFollowing' => isset($following[$player->id]),
        ])->values()->all();
    }

    /**
     * `PlayerCard` in `packages/types`: the season's best and ranks, this
     * week's league, lifetime numbers and who follows whom.
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
            'createdAt' => Timestamp::iso($player->created_at),
            'best' => $best === null ? null : [
                'score' => $best->score,
                'reels' => $best->reels,
                'achievedAt' => Timestamp::iso($best->achieved_at),
            ],
            'league' => $this->tiersOf([$player->id])[$player->id] ?? null,
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
            ...$this->follows->counts($player),
            ...$this->follows->between($viewer, $player),
            'isMe' => $player->is($viewer),
        ];
    }

    /**
     * This week's league of each player seated in one, as its slug.
     *
     * @param  list<string>  $ids
     * @return array<string, string>
     */
    private function tiersOf(array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        return LeagueMember::query()
            ->where('season', $this->leaderboards->season())
            ->where('week_key', $this->leagues->weekKey(now()))
            ->whereIn('user_id', $ids)
            ->get(['user_id', 'tier'])
            ->mapWithKeys(fn (LeagueMember $member) => [$member->user_id => $member->tier->slug()])
            ->all();
    }
}
