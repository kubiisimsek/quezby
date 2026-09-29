<?php

namespace App\Services\Admin;

use App\Enums\PlayerMilestone;
use App\Enums\RunStatus;
use App\Models\AnalyticsVisit;
use App\Models\User;
use App\Services\Analytics\Analytics;
use App\Support\Timestamp;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * `AdminPlayerActivity` in `packages/types`: one player's use of the game —
 * their last 30 days, their latest visits with the screens in order, and
 * their firsts. Visits and days exist only while the player says yes; the
 * firsts the API knows by itself (the account, a way in, a counted run, a
 * league seat) show either way.
 */
final class PlayerActivity
{
    public function __construct(
        private readonly Analytics $analytics,
        private readonly DaySeries $series,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function of(User $user): array
    {
        $keys = array_column($this->series->days(30), 'key');
        $rows = DB::table('analytics_player_days')
            ->where('user_id', $user->id)
            ->whereBetween('day', [$keys[0], $keys[count($keys) - 1]])
            ->get(['day', 'visits', 'seconds'])
            ->keyBy('day');
        $days = array_map(fn (string $day) => [
            'day' => $day,
            'visits' => (int) ($rows[$day]->visits ?? 0),
            'seconds' => (int) ($rows[$day]->seconds ?? 0),
        ], $keys);
        $visits = array_sum(array_column($days, 'visits'));
        $seconds = array_sum(array_column($days, 'seconds'));
        $range = DB::table('analytics_player_days')
            ->where('user_id', $user->id)
            ->selectRaw('min(day) as first_day, max(day) as last_day')
            ->first();

        return [
            'status' => $this->analytics->status($user)->value,
            'consentAt' => Timestamp::iso($user->analytics_at),
            'summary' => [
                'activeDays' => $rows->count(),
                'visits' => $visits,
                'seconds' => $seconds,
                'avgVisitSeconds' => $visits > 0 ? (int) round($seconds / $visits) : null,
                'firstDay' => $range->first_day ?? null,
                'lastDay' => $range->last_day ?? null,
            ],
            'days' => $days,
            'visits' => AnalyticsVisit::query()
                ->where('user_id', $user->id)
                ->orderByDesc('started_at')
                ->orderByDesc('id')
                ->limit(20)
                ->get()
                ->map(fn (AnalyticsVisit $visit) => [
                    'id' => $visit->id,
                    'startedAt' => Timestamp::iso($visit->started_at),
                    'seconds' => $visit->seconds,
                    'platform' => $visit->platform,
                    'appVersion' => $visit->app_version,
                    'journey' => array_map(fn (array $step) => ['code' => (string) $step[0], 'at' => (int) $step[1]], $visit->journey),
                ])
                ->values()
                ->all(),
            'milestones' => $this->milestones($user),
        ];
    }

    /**
     * The player's firsts, oldest first.
     *
     * @return list<array{milestone: string, at: string|null}>
     */
    private function milestones(User $user): array
    {
        /** @var list<array{0: PlayerMilestone, 1: CarbonInterface}> $found */
        $found = [[PlayerMilestone::Joined, $user->created_at]];

        DB::table('analytics_milestones')->where('user_id', $user->id)->get(['milestone', 'at'])
            ->each(function (object $row) use (&$found) {
                $milestone = PlayerMilestone::tryFrom((string) $row->milestone);
                if ($milestone !== null) {
                    $found[] = [$milestone, Carbon::parse((string) $row->at, 'UTC')];
                }
            });

        $firsts = [
            PlayerMilestone::Protected->value => $user->identities()->min('created_at'),
            PlayerMilestone::FirstRun->value => $user->runs()->where('status', RunStatus::Ranked->value)->where('score', '>', 0)->min('finished_at'),
            // Placed: the first change that set a rating from none.
            PlayerMilestone::League->value => DB::table('rating_changes')->where('user_id', $user->id)
                ->whereNull('before')->whereNotNull('after')->min('created_at'),
        ];
        foreach ($firsts as $milestone => $at) {
            if (is_string($at)) {
                $found[] = [PlayerMilestone::from($milestone), Carbon::parse($at, 'UTC')];
            }
        }

        usort($found, fn (array $a, array $b) => $a[1] <=> $b[1]);

        return array_map(fn (array $first) => ['milestone' => $first[0]->value, 'at' => Timestamp::iso($first[1])], $found);
    }
}
