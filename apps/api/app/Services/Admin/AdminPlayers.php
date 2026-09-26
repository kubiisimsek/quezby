<?php

namespace App\Services\Admin;

use App\Enums\LeaderboardPeriod;
use App\Enums\RunFlag;
use App\Models\DeviceCheck;
use App\Models\LeaderboardEntry;
use App\Models\LeagueMember;
use App\Models\Run;
use App\Models\SocialIdentity;
use App\Models\User;
use App\Services\Devices\DeviceRegistry;
use App\Services\FollowService;
use App\Services\LeaderboardService;
use App\Services\LeagueService;
use App\Services\PlayerStatsService;
use App\Support\Timestamp;
use App\Support\Username;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * Players as the admin panel sees them: every account, banned or not, found
 * by name, email, id or install, with what they have played and done.
 */
final class AdminPlayers
{
    public function __construct(
        private readonly LeaderboardService $leaderboards,
        private readonly LeagueService $leagues,
        private readonly PlayerStatsService $playerStats,
        private readonly FollowService $follows,
        private readonly AdminRuns $runs,
        private readonly AuditLog $audit,
        private readonly DeviceRegistry $devices,
    ) {}

    /**
     * @param  array{search?: string|null, status?: string|null, platform?: string|null, sort?: string|null}  $filters
     * @return array<string, mixed> `AdminPlayersResponse`
     */
    public function list(array $filters, int $page, int $perPage): array
    {
        $scoped = $this->filtered($filters);
        $counts = $this->counts(clone $scoped);

        $query = $scoped
            ->select('users.*')
            ->selectSub($this->bestScore(), 'best_score')
            ->selectSub(Run::query()->selectRaw('max(finished_at)')->whereColumn('runs.user_id', 'users.id'), 'last_played_at')
            ->with('identities:id,user_id,provider');

        match ($filters['status'] ?? null) {
            'active' => $query->whereNull('users.banned_at'),
            'banned' => $query->whereNotNull('users.banned_at'),
            'guest' => $this->guests($query),
            default => null,
        };

        match ($filters['sort'] ?? 'newest') {
            'oldest' => $query->orderBy('users.created_at')->orderBy('users.id'),
            'best' => $query->orderByRaw('best_score is null')->orderByDesc('best_score')->orderBy('users.id'),
            'lastPlayed' => $query->orderByRaw('last_played_at is null')->orderByDesc('last_played_at')->orderBy('users.id'),
            default => $query->orderByDesc('users.created_at')->orderByDesc('users.id'),
        };

        /** @var LengthAwarePaginator<int, User> $rows */
        $rows = $query->paginate($perPage, ['*'], 'page', $page);

        return Paginated::of($rows, fn (User $player) => $this->row($player)) + ['counts' => $counts];
    }

    /**
     * `AdminPlayerResponse` in `packages/types`.
     *
     * @return array<string, mixed>
     */
    public function detail(User $player, bool $withIp): array
    {
        $player->load('identities');
        $best = $this->leaderboards->bestOf($player);
        $tokens = $player->tokens()->selectRaw('count(*) as sessions, max(last_used_at) as last_seen')->toBase()->first();
        $lastPlayed = $player->runs()->max('finished_at');

        $row = $this->row($player, $best?->score, is_string($lastPlayed) ? $lastPlayed : null);

        return [
            'player' => $row + [
                'installId' => $player->install_id,
                'banReason' => $player->ban_reason,
                'sessions' => (int) ($tokens->sessions ?? 0),
                'lastSeenAt' => is_string($tokens->last_seen ?? null) ? Timestamp::iso(Carbon::parse($tokens->last_seen, 'UTC')) : null,
                'identityDetails' => $player->identities->map(fn (SocialIdentity $identity) => [
                    'provider' => $identity->provider->value,
                    'email' => $identity->email,
                    'emailVerified' => (bool) $identity->email_verified,
                    'lastUsedAt' => Timestamp::iso($identity->last_used_at),
                ])->values()->all(),
                'analyticsAt' => Timestamp::iso($player->analytics_at),
            ],
            'season' => $this->leaderboards->season(),
            'best' => $best === null ? null : [
                'score' => $best->score,
                'reels' => $best->reels,
                'achievedAt' => Timestamp::iso($best->achieved_at),
                'runId' => $best->run_id,
            ],
            'ranks' => $this->leaderboards->ranksFor($player),
            'stats' => $this->playerStats->of($player)['stats'],
            'league' => $this->leagueSeat($player),
            'runs' => $player->runs()->toBase()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status')
                ->map(fn ($total) => (int) $total)->all(),
            'recentRuns' => $player->runs()
                ->select(Run::LIST_COLUMNS)
                ->orderByDesc('started_at')
                ->limit(10)
                ->get()
                ->each(fn (Run $run) => $run->setRelation('user', $player))
                ->map(fn (Run $run) => $this->runs->present($run))
                ->values()
                ->all(),
            'flags' => $this->flagsOf($player, now()->subDays(30)),
            'devices' => $player->deviceChecks()->orderByDesc('checked_at')->limit(20)->get()
                ->map(fn (DeviceCheck $check) => [
                    'id' => $check->id,
                    'platform' => $check->platform->value,
                    'verdict' => $check->verdict->value,
                    'reason' => $check->reason,
                    'details' => $check->details,
                    'checkedAt' => Timestamp::iso($check->checked_at),
                    'expiresAt' => Timestamp::iso($check->expires_at),
                ])->values()->all(),
            'sameInstall' => $player->install_id === null ? [] : User::query()
                ->where('install_id', $player->install_id)
                ->whereKeyNot($player->id)
                ->orderBy('created_at')
                ->limit(20)
                ->get()
                ->map(fn (User $other) => AdminRuns::ref($other))
                ->values()
                ->all(),
            'installs' => $this->devices->of($player),
            'follows' => $this->follows->counts($player),
            'audit' => $this->audit->about('player', $player->id)->map(fn ($entry) => $this->audit->present($entry, $withIp))->values()->all(),
        ];
    }

    /**
     * `AdminPlayerRow` in `packages/types`.
     *
     * @return array<string, mixed>
     */
    private function row(User $player, ?int $best = null, ?string $lastPlayed = null): array
    {
        $best ??= $player->getAttribute('best_score') === null ? null : (int) $player->getAttribute('best_score');
        $lastPlayed ??= $player->getAttribute('last_played_at');
        $identities = $player->identities->map(fn (SocialIdentity $identity) => $identity->provider->value)->values()->all();

        return [
            ...AdminRuns::ref($player),
            'isAutoUsername' => Username::isAutomatic($player->username),
            'isGuest' => $player->email === null && $identities === [],
            'email' => $player->email,
            'platform' => $player->platform,
            'identities' => $identities,
            'best' => $best,
            'createdAt' => Timestamp::iso($player->created_at),
            'lastPlayedAt' => is_string($lastPlayed) ? Timestamp::iso(Carbon::parse($lastPlayed, 'UTC')) : null,
        ];
    }

    /**
     * The players a search and a platform leave, before the status chip.
     *
     * @param  array{search?: string|null, platform?: string|null}  $filters
     * @return Builder<User>
     */
    private function filtered(array $filters): Builder
    {
        $query = User::query();
        $search = mb_strtolower(trim((string) ($filters['search'] ?? '')));

        if ($search !== '') {
            $query->where(function (Builder $query) use ($search) {
                if (preg_match('/^[0-7][0-9a-hjkmnp-tv-z]{25}$/', $search) === 1) {
                    $query->orWhere('users.id', $search);
                }
                // `@kerem` is a handle; `kerem@` or `kerem@quezby.com` an email.
                if (str_contains($search, '@') && ! str_starts_with($search, '@')) {
                    $query->orWhereRaw("lower(users.email) like ? escape '!'", [Paginated::prefix($search)]);
                } else {
                    $query->orWhereRaw("users.username like ? escape '!'", [Paginated::prefix(ltrim($search, '@'))]);
                }
                $query->orWhere('users.install_id', $search);
            });
        }
        if (in_array($filters['platform'] ?? null, ['ios', 'android'], true)) {
            $query->where('users.platform', $filters['platform']);
        }

        return $query;
    }

    /**
     * How many players each status chip would show.
     *
     * @param  Builder<User>  $query
     * @return array{all: int, active: int, banned: int, guest: int}
     */
    private function counts(Builder $query): array
    {
        $row = $query->toBase()->selectRaw(
            'count(*) as all_players,'
            .' sum(case when users.banned_at is null then 1 else 0 end) as active_players,'
            .' sum(case when users.banned_at is not null then 1 else 0 end) as banned_players,'
            .' sum(case when users.email is null and not exists (select 1 from social_identities where social_identities.user_id = users.id) then 1 else 0 end) as guest_players',
        )->first();

        return [
            'all' => (int) ($row->all_players ?? 0),
            'active' => (int) ($row->active_players ?? 0),
            'banned' => (int) ($row->banned_players ?? 0),
            'guest' => (int) ($row->guest_players ?? 0),
        ];
    }

    /**
     * @param  Builder<User>  $query
     */
    private function guests(Builder $query): void
    {
        $query->whereNull('users.email')->whereDoesntHave('identities');
    }

    /**
     * The player's best this season, for a sub-select.
     *
     * @return Builder<LeaderboardEntry>
     */
    private function bestScore(): Builder
    {
        return LeaderboardEntry::query()
            ->select('score')
            ->whereColumn('leaderboard_entries.user_id', 'users.id')
            ->where('season', $this->leaderboards->season())
            ->where('period', LeaderboardPeriod::All->value)
            ->where('period_key', 'all')
            ->limit(1);
    }

    /**
     * This week's seat, where the player stands in it. None for a banned
     * player: they are off the standings.
     *
     * @return array<string, mixed>|null
     */
    private function leagueSeat(User $player): ?array
    {
        if ($player->isBanned()) {
            return null;
        }
        $member = LeagueMember::query()
            ->with('group')
            ->where('user_id', $player->id)
            ->where('season', $this->leaderboards->season())
            ->where('week_key', $this->leagues->weekKey(now()))
            ->first();
        if ($member === null) {
            return null;
        }
        $standing = $this->leagues->standingOf($member);

        return [
            'weekKey' => $member->week_key,
            'groupId' => $member->group_id,
            'tier' => $standing['tier'],
            'rank' => $standing['rank'],
            'members' => $standing['members'],
            'points' => $standing['points'],
            'zone' => $standing['zone'],
        ];
    }

    /**
     * The flag codes on the player's runs since `$since`, most frequent first.
     *
     * @return list<array{code: string, severity: string, count: int}>
     */
    private function flagsOf(User $player, Carbon $since): array
    {
        $counts = [];
        $player->runs()
            ->whereNotNull('flag_codes')
            ->where('started_at', '>=', $since)
            ->pluck('flag_codes')
            ->each(function (string $codes) use (&$counts) {
                foreach (array_filter(explode(',', $codes)) as $code) {
                    $counts[$code] = ($counts[$code] ?? 0) + 1;
                }
            });
        arsort($counts);

        return array_map(fn (string $code, int $count) => [
            'code' => $code,
            'severity' => RunFlag::tryFrom($code)?->severity() ?? 'hard',
            'count' => $count,
        ], array_keys($counts), array_values($counts));
    }
}
