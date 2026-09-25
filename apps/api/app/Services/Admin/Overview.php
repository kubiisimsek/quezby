<?php

namespace App\Services\Admin;

use App\Enums\LeaderboardPeriod;
use App\Enums\RunFlag;
use App\Enums\RunStatus;
use App\Models\LeaderboardEntry;
use App\Models\Run;
use App\Models\User;
use App\Services\DailyService;
use App\Services\LeaderboardService;
use App\Support\Timestamp;
use Illuminate\Support\Facades\DB;

/**
 * `AdminOverview` in `packages/types`: how the game is doing today and over
 * the last thirty days, what the anti-cheat saw this week, and the queue.
 */
final class Overview
{
    public function __construct(
        private readonly DaySeries $series,
        private readonly LeaderboardService $leaderboards,
        private readonly DailyService $daily,
        private readonly AdminRuns $runs,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function build(): array
    {
        $now = now();
        $days = $this->series->days(30, $now);
        $runFormat = (new Run)->getDateFormat();
        $userFormat = (new User)->getDateFormat();
        $played = [RunStatus::Ranked->value, RunStatus::Flagged->value, RunStatus::Review->value, RunStatus::Rejected->value];

        $newPlayers = $this->series->count(DB::table('users'), 'created_at', $userFormat, $days);
        $activePlayers = $this->series->count(DB::table('runs')->whereIn('status', $played), 'finished_at', $runFormat, $days, 'user_id');
        $runs = $this->series->count(DB::table('runs')->whereIn('status', $played), 'finished_at', $runFormat, $days);
        $flagged = $this->series->count(DB::table('runs')->whereIn('status', [RunStatus::Flagged->value, RunStatus::Rejected->value]), 'finished_at', $runFormat, $days);

        $today = $days[count($days) - 1];
        $last = count($days) - 1;

        return [
            'serverTime' => Timestamp::iso($now),
            'season' => $this->leaderboards->season(),
            'today' => $today['key'],
            'dailyNumber' => $this->daily->number($today['key']),
            'kpis' => [
                'players' => User::query()->count(),
                'newToday' => $newPlayers[$last],
                'activeToday' => $activePlayers[$last],
                'runsToday' => $runs[$last],
                'rankedToday' => Run::query()
                    ->where('status', RunStatus::Ranked)
                    ->where('finished_at', '>=', $today['start']->format($runFormat))
                    ->where('finished_at', '<', $today['end']->format($runFormat))
                    ->count(),
                'flaggedToday' => $flagged[$last],
                'review' => Run::query()->where('status', RunStatus::Review)->count(),
                'banned' => User::query()->whereNotNull('banned_at')->count(),
                'dailyPlayers' => LeaderboardEntry::query()
                    ->where('season', $this->leaderboards->season())
                    ->where('period', LeaderboardPeriod::Challenge->value)
                    ->where('period_key', $today['key'])
                    ->count(),
            ],
            'series' => [
                'days' => array_column($days, 'key'),
                'newPlayers' => $newPlayers,
                'activePlayers' => $activePlayers,
                'runs' => $runs,
                'flagged' => $flagged,
            ],
            'topFlags' => $this->topFlags($now->copy()->subDays(7)->format($runFormat)),
            'queue' => Run::query()
                ->select(Run::LIST_COLUMNS)
                ->with('user')
                ->where('status', RunStatus::Review)
                ->orderByDesc('score')
                ->limit(5)
                ->get()
                ->map(fn (Run $run) => $this->runs->present($run))
                ->values()
                ->all(),
        ];
    }

    /**
     * Each flag's count on the runs started since `$since`, most frequent first.
     *
     * @return list<array{code: string, severity: string, count: int}>
     */
    private function topFlags(string $since): array
    {
        $select = [];
        $bindings = [];
        foreach (RunFlag::cases() as $index => $flag) {
            $select[] = "sum(case when flag_codes like ? escape '!' then 1 else 0 end) as flag_{$index}";
            $bindings[] = $flag->pattern();
        }
        $row = DB::table('runs')
            ->selectRaw(implode(', ', $select), $bindings)
            ->whereNotNull('flag_codes')
            ->where('started_at', '>=', $since)
            ->first();

        $flags = [];
        foreach (RunFlag::cases() as $index => $flag) {
            $count = (int) ($row?->{"flag_{$index}"} ?? 0);
            if ($count > 0) {
                $flags[] = ['code' => $flag->value, 'severity' => $flag->severity(), 'count' => $count];
            }
        }
        usort($flags, fn (array $a, array $b) => [$b['count'], $a['code']] <=> [$a['count'], $b['code']]);

        return $flags;
    }
}
