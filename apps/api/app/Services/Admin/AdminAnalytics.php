<?php

namespace App\Services\Admin;

use App\Enums\AnalyticsEvent;
use App\Enums\AnalyticsScreen;
use App\Enums\FunnelStep;
use App\Enums\RunStatus;
use App\Models\User;
use App\Services\Analytics\Analytics;
use App\Services\Analytics\Totals;
use App\Services\LeaderboardService;
use App\Support\Timestamp;
use App\Support\Username;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Closure;
use Illuminate\Container\Attributes\Config;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * `AdminAnalytics` in `packages/types`: how the game is used. It reads the
 * layers analytics keeps — the daily totals for anything over time, the
 * players' days for the last 7 and 30 days and for the funnel — and the
 * device registry. Every rate is worked out here, per-mille; the panel only
 * shows them. Held for a minute under one key per window, so a busy page
 * costs the database one answer a minute and the cache two files in all.
 */
final class AdminAnalytics
{
    /** The days of a cohort's life the retention table shows. */
    private const RETENTION_DAYS = [1, 3, 7, 14, 30];

    public function __construct(
        private readonly Analytics $analytics,
        private readonly Totals $totals,
        private readonly DaySeries $series,
        private readonly LeaderboardService $leaderboards,
        #[Config('quezby.analytics.keep_visits_days')]
        private readonly int $keepVisits,
        #[Config('quezby.analytics.keep_days_days')]
        private readonly int $keepDays,
        #[Config('quezby.devices.keep_days')]
        private readonly int $keepDevices,
        #[Config('quezby.analytics.online_minutes')]
        private readonly int $onlineMinutes,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function build(int $window): array
    {
        return Cache::remember("admin:analytics:{$window}", 60, fn () => $this->compute($window));
    }

    /**
     * @return array<string, mixed>
     */
    private function compute(int $window): array
    {
        $now = CarbonImmutable::now();
        $days = $this->series->days($window, $now);
        $keys = array_column($days, 'key');
        $today = $keys[count($keys) - 1];
        $series = $this->series($keys);
        $activeToday = $series['active'][count($keys) - 1] ?? 0;

        return [
            'serverTime' => Timestamp::iso($now),
            'today' => $today,
            'days' => $window,
            'collecting' => ['enabled' => $this->analytics->enabled(), 'sample' => $this->analytics->sample()],
            'consent' => $this->consent($days[0]['start']),
            'now' => $this->now($today, $activeToday),
            'series' => $series,
            'retention' => $this->retention($today, $window === 90 ? 12 : 8),
            'funnel' => $this->funnel($days[0]['start']),
            'screens' => $this->ranked('screen:', $keys[0], $today, 'screen', 'views', fn (string $code) => AnalyticsScreen::tryFrom($code) !== null),
            'events' => $this->ranked('event:', $keys[0], $today, 'event', 'count', fn (string $code) => AnalyticsEvent::tryFrom($code) !== null),
            'devices' => $this->devices($now),
            'storage' => $this->storage($today),
        ];
    }

    /**
     * @param  list<string>  $keys
     * @return array<string, list<int|null>|list<string>>
     */
    private function series(array $keys): array
    {
        $grid = $this->totals->grid($keys[0], $keys[count($keys) - 1], ['active', 'age:0', 'visits', 'seconds']);
        $series = ['days' => $keys, 'active' => [], 'newcomers' => [], 'returning' => [], 'visits' => [], 'minutes' => [], 'avgVisitSeconds' => []];

        foreach ($keys as $day) {
            $active = $grid['active'][$day] ?? 0;
            $newcomers = min($active, $grid['age:0'][$day] ?? 0);
            $visits = $grid['visits'][$day] ?? 0;
            $seconds = $grid['seconds'][$day] ?? 0;

            $series['active'][] = $active;
            $series['newcomers'][] = $newcomers;
            $series['returning'][] = $active - $newcomers;
            $series['visits'][] = $visits;
            $series['minutes'][] = intdiv($seconds + 30, 60);
            $series['avgVisitSeconds'][] = $visits > 0 ? (int) round($seconds / $visits) : null;
        }

        return $series;
    }

    /**
     * @return array{online: int, active: int, weekly: int, monthly: int, stickiness: int|null}
     */
    private function now(string $today, int $activeToday): array
    {
        $monthly = $this->activeSince(Analytics::shift($today, -29));

        return [
            'online' => $this->online(),
            'active' => $activeToday,
            'weekly' => $this->activeSince(Analytics::shift($today, -6)),
            'monthly' => $monthly,
            'stickiness' => self::perMille($activeToday, $monthly),
        ];
    }

    /** Players whose app talked to the API in the last minutes — every player; tokens are not analytics. */
    private function online(): int
    {
        return DB::table('personal_access_tokens')
            ->where('tokenable_type', (new User)->getMorphClass())
            ->where('last_used_at', '>=', now()->subMinutes($this->onlineMinutes))
            ->distinct()
            ->count('tokenable_id');
    }

    private function activeSince(string $day): int
    {
        return DB::table('analytics_player_days')->where('day', '>=', $day)->distinct()->count('user_id');
    }

    /**
     * @return array{players: int, granted: int, rate: int|null, newPlayers: int, newGranted: int, newRate: int|null}
     */
    private function consent(CarbonInterface $windowStart): array
    {
        $since = $windowStart->format((new User)->getDateFormat());
        $row = DB::table('users')->selectRaw(
            'count(*) as players,'
            .' sum(case when analytics_at is not null then 1 else 0 end) as granted,'
            .' sum(case when created_at >= ? then 1 else 0 end) as new_players,'
            .' sum(case when created_at >= ? and analytics_at is not null then 1 else 0 end) as new_granted',
            [$since, $since],
        )->first();

        $players = (int) ($row->players ?? 0);
        $granted = (int) ($row->granted ?? 0);
        $newPlayers = (int) ($row->new_players ?? 0);
        $newGranted = (int) ($row->new_granted ?? 0);

        return [
            'players' => $players,
            'granted' => $granted,
            'rate' => self::perMille($granted, $players),
            'newPlayers' => $newPlayers,
            'newGranted' => $newGranted,
            'newRate' => self::perMille($newGranted, $newPlayers),
        ];
    }

    /**
     * Weekly cohorts, newest first: the players active on the day they joined
     * (`age:0` under their day), and how many of them were back on day N
     * (`age:N`) — counted only over the days whose day N is over.
     *
     * @return list<array<string, int|string|null>>
     */
    private function retention(string $today, int $weeks): array
    {
        $monday = CarbonImmutable::parse($today, 'UTC')->startOfWeek(CarbonInterface::MONDAY);
        $buckets = ['age:0', ...array_map(fn (int $n) => "age:{$n}", self::RETENTION_DAYS)];
        $grid = $this->totals->grid($monday->subWeeks($weeks - 1)->format('Y-m-d'), $today, $buckets);
        $sum = fn (string $bucket, array $days) => array_sum(array_map(fn (string $day) => $grid[$bucket][$day] ?? 0, $days));

        $cohorts = [];
        for ($week = 0; $week < $weeks; $week++) {
            $start = $monday->subWeeks($week);
            $days = [];
            for ($offset = 0; $offset < 7; $offset++) {
                $day = $start->addDays($offset)->format('Y-m-d');
                if ($day > $today) {
                    break;
                }
                $days[] = $day;
            }

            $row = ['week' => $start->format('o-\WW'), 'players' => $sum('age:0', $days)];
            foreach (self::RETENTION_DAYS as $n) {
                $over = array_values(array_filter($days, fn (string $day) => Analytics::shift($day, $n) < $today));
                $row["d{$n}"] = self::perMille($sum("age:{$n}", $over), $sum('age:0', $over));
            }
            $cohorts[] = $row;
        }

        return $cohorts;
    }

    /**
     * The first steps of the players who joined in the window and were
     * active on their first day — so with their consent from the start.
     * Rates are of those who joined; "came back" only counts those who
     * joined before today.
     *
     * @return list<array{step: string, players: int, rate: int|null}>
     */
    private function funnel(CarbonInterface $windowStart): array
    {
        $format = (new User)->getDateFormat();
        $cohort = fn (): Builder => User::query()
            ->where('users.created_at', '>=', $windowStart->format($format))
            ->whereExists(fn (QueryBuilder $query) => $query->selectRaw('1')
                ->from('analytics_player_days')
                ->whereColumn('analytics_player_days.user_id', 'users.id')
                ->where('analytics_player_days.age', 0));

        $joined = $cohort()->count();

        $tutorial = $cohort()->whereExists(fn (QueryBuilder $query) => $query->selectRaw('1')
            ->from('analytics_milestones')
            ->whereColumn('analytics_milestones.user_id', 'users.id')
            ->where('analytics_milestones.milestone', AnalyticsEvent::TutorialDone->value))->count();

        // Still on the automatic name (or none): only these few are read, and judged by `Username` itself.
        $unnamed = $cohort()
            ->where(fn (Builder $query) => $query->whereNull('users.username')
                ->orWhere(fn (Builder $query) => $query->where('users.username', 'like', 'guest%')->whereRaw('length(users.username) = 13')))
            ->pluck('users.username')
            ->filter(fn (?string $name) => Username::isPickable($name))
            ->count();

        $protected = $cohort()->where(fn (Builder $query) => $query->whereNotNull('users.email')
            ->orWhereExists(fn (QueryBuilder $query) => $query->selectRaw('1')
                ->from('social_identities')
                ->whereColumn('social_identities.user_id', 'users.id')))->count();

        $firstRun = $cohort()->whereExists(fn (QueryBuilder $query) => $query->selectRaw('1')
            ->from('runs')
            ->whereColumn('runs.user_id', 'users.id')
            ->where('runs.status', RunStatus::Ranked->value)
            ->where('runs.score', '>', 0))->count();

        $league = $cohort()->whereExists(fn (QueryBuilder $query) => $query->selectRaw('1')
            ->from('league_members')
            ->whereColumn('league_members.user_id', 'users.id'))->count();

        $before = $this->analytics->todayStart()->format($format);
        $couldReturn = $cohort()->where('users.created_at', '<', $before)->count();
        $returned = $cohort()->where('users.created_at', '<', $before)
            ->whereExists(fn (QueryBuilder $query) => $query->selectRaw('1')
                ->from('analytics_player_days as back')
                ->whereColumn('back.user_id', 'users.id')
                ->where('back.age', 1))->count();

        return [
            ['step' => FunnelStep::Joined->value, 'players' => $joined, 'rate' => self::perMille($joined, $joined)],
            ['step' => FunnelStep::Tutorial->value, 'players' => $tutorial, 'rate' => self::perMille($tutorial, $joined)],
            ['step' => FunnelStep::Named->value, 'players' => $joined - $unnamed, 'rate' => self::perMille($joined - $unnamed, $joined)],
            ['step' => FunnelStep::Protected->value, 'players' => $protected, 'rate' => self::perMille($protected, $joined)],
            ['step' => FunnelStep::FirstRun->value, 'players' => $firstRun, 'rate' => self::perMille($firstRun, $joined)],
            ['step' => FunnelStep::League->value, 'players' => $league, 'rate' => self::perMille($league, $joined)],
            ['step' => FunnelStep::Returned->value, 'players' => $returned, 'rate' => self::perMille($returned, $couldReturn)],
        ];
    }

    /**
     * The window's totals of one kind — screens or events — most first.
     *
     * @param  Closure(string): bool  $known
     * @return list<array<string, int|string>>
     */
    private function ranked(string $prefix, string $from, string $to, string $name, string $amount, Closure $known): array
    {
        return collect($this->totals->sums($prefix, $from, $to))
            ->filter(fn (int $total, string $code) => $known($code))
            ->map(fn (int $total, string $code) => [$name => $code, $amount => $total])
            ->values()
            ->sortBy([[$amount, 'desc'], [$name, 'asc']])
            ->values()
            ->all();
    }

    /**
     * Every player's phones seen in the last 7 days, from the device registry:
     * app versions, systems (by major version) and models.
     *
     * @return array<string, mixed>
     */
    private function devices(CarbonImmutable $now): array
    {
        $since = $now->subDays(7)->format('Y-m-d H:i:s');
        $seen = fn (): QueryBuilder => DB::table('player_devices')->where('last_seen_at', '>=', $since);
        $total = $seen()->count();
        $share = fn (int $devices) => $total > 0 ? (int) round($devices * 1000 / $total) : 0;

        $slices = fn (string $column, int $limit) => $seen()
            ->selectRaw("platform, {$column} as label, count(*) as devices")
            ->groupBy('platform', $column)
            ->orderByDesc('devices')
            ->orderBy('platform')
            ->orderBy($column)
            ->limit($limit)
            ->get()
            ->map(fn (object $row) => [
                'platform' => $row->platform,
                'value' => $row->label,
                'devices' => (int) $row->devices,
                'share' => $share((int) $row->devices),
            ])
            ->values()
            ->all();

        $systems = [];
        $seen()->selectRaw('platform, os_version, count(*) as devices')->groupBy('platform', 'os_version')->get()
            ->each(function (object $row) use (&$systems) {
                $major = $row->os_version === null ? null : explode('.', (string) $row->os_version)[0];
                $key = ($row->platform ?? '').'|'.($major ?? '');
                $systems[$key] ??= ['platform' => $row->platform, 'value' => $major, 'devices' => 0];
                $systems[$key]['devices'] += (int) $row->devices;
            });

        return [
            'total' => $total,
            'versions' => $slices('app_version', 12),
            'systems' => collect($systems)
                ->map(fn (array $slice) => $slice + ['share' => $share($slice['devices'])])
                ->values()
                ->sortBy([['devices', 'desc'], ['platform', 'asc'], ['value', 'asc']])
                ->take(12)
                ->values()
                ->all(),
            'models' => $slices('model', 10),
        ];
    }

    /**
     * What each layer holds, so its growth shows on the page.
     *
     * @return array<string, mixed>
     */
    private function storage(string $today): array
    {
        $tier = function (string $table, string $column, ?int $keep, bool $dayKeys) {
            $row = DB::table($table)->selectRaw("count(*) as total_rows, min({$column}) as oldest")->first();
            $oldest = is_string($row->oldest ?? null) ? $row->oldest : null;

            return [
                'rows' => (int) ($row->total_rows ?? 0),
                'oldest' => $oldest === null ? null : ($dayKeys ? $this->dayStart($oldest) : Timestamp::iso(Carbon::parse($oldest, 'UTC'))),
                'keepDays' => $keep,
            ];
        };
        $dropped = $this->totals->grid(Analytics::shift($today, -6), $today, ['dropped'])['dropped'];

        return [
            'visits' => $tier('analytics_visits', 'started_at', $this->keepVisits, false),
            'days' => $tier('analytics_player_days', 'day', $this->keepDays, true),
            'totals' => $tier('analytics_totals', 'day', null, true),
            'devices' => $tier('player_devices', 'last_seen_at', $this->keepDevices, false),
            'milestones' => DB::table('analytics_milestones')->count(),
            'dropped' => array_sum($dropped),
        ];
    }

    /** When an Istanbul day began, ISO in UTC. */
    private function dayStart(string $day): ?string
    {
        return Timestamp::iso(CarbonImmutable::parse($day, $this->leaderboards->timezone())->startOfDay());
    }

    private static function perMille(int $count, int $of): ?int
    {
        return $of > 0 ? (int) round($count * 1000 / $of) : null;
    }
}
