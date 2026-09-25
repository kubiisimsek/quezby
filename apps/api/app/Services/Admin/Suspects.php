<?php

namespace App\Services\Admin;

use App\Enums\RunFlag;
use App\Enums\RunStatus;
use App\Models\DeviceCheck;
use App\Models\Run;
use App\Models\User;
use App\Support\Timestamp;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * The players the anti-cheat is most worried about, over the last days: every
 * signal on their runs weighed by how sure it is (`RunFlag::weight()`), plus
 * phones that failed a device check and other accounts on the same install.
 *
 * Three grouped queries whatever the size of the game — the counting is SQL
 * that SQLite, MySQL and MariaDB read alike, the weighing is PHP.
 */
final class Suspects
{
    /** Below this, a player is noise: one soft signal is not a suspicion. */
    public const THRESHOLD = 3;

    /** A failed device check weighs this much, up to three of them. */
    private const DEVICE_FAIL_WEIGHT = 4;

    /** Another account on the same install. */
    private const SHARED_INSTALL_WEIGHT = 3;

    /**
     * `AdminSuspectsResponse` in `packages/types`.
     *
     * @return array<string, mixed>
     */
    public function list(int $days, bool $includeBanned, int $page, int $perPage): array
    {
        $since = now()->subDays($days);
        $runs = $this->runSignals($since);
        $fails = DeviceCheck::query()
            ->toBase()
            ->selectRaw('user_id, count(*) as fails')
            ->where('verdict', 'fail')
            ->where('checked_at', '>=', $since->format((new DeviceCheck)->getDateFormat()))
            ->groupBy('user_id')
            ->pluck('fails', 'user_id')
            ->map(fn ($fails) => (int) $fails);

        $candidates = collect(array_keys($runs))->merge($fails->keys())->unique()->values();
        $players = User::query()->whereKey($candidates)->get()->keyBy('id');
        $shared = $this->sharedInstalls($players->pluck('install_id')->filter()->unique()->values()->all());

        $suspects = [];
        foreach ($players as $id => $player) {
            if ($player->isBanned() && ! $includeBanned) {
                continue;
            }
            $signals = $runs[$id] ?? null;
            $deviceFails = $fails[$id] ?? 0;
            $sharedInstall = $player->install_id === null ? 0 : max(0, ($shared[$player->install_id] ?? 1) - 1);

            $risk = min($deviceFails, 3) * self::DEVICE_FAIL_WEIGHT + ($sharedInstall > 0 ? self::SHARED_INSTALL_WEIGHT : 0);
            foreach ($signals['codes'] ?? [] as $code => $count) {
                $risk += (RunFlag::tryFrom($code)?->weight() ?? 1) * $count;
            }
            if ($risk < self::THRESHOLD) {
                continue;
            }

            $suspects[] = [
                'player' => [...AdminRuns::ref($player), 'platform' => $player->platform, 'createdAt' => Timestamp::iso($player->created_at)],
                'risk' => $risk,
                'runs' => $signals['runs'] ?? ['flagged' => 0, 'review' => 0, 'rejected' => 0, 'signalled' => 0],
                'codes' => collect($signals['codes'] ?? [])
                    ->sortDesc()
                    ->map(fn (int $count, string $code) => [
                        'code' => $code,
                        'severity' => RunFlag::tryFrom($code)?->severity() ?? 'hard',
                        'count' => $count,
                    ])->values()->all(),
                'deviceFails' => $deviceFails,
                'sharedInstall' => $sharedInstall,
                'topScore' => $signals['topScore'] ?? null,
                'lastFlagAt' => $signals['lastFlagAt'] ?? null,
            ];
        }

        usort($suspects, fn (array $a, array $b) => [$b['risk'], $b['lastFlagAt'] ?? ''] <=> [$a['risk'], $a['lastFlagAt'] ?? '']);

        $rows = new LengthAwarePaginator(array_slice($suspects, ($page - 1) * $perPage, $perPage), count($suspects), $perPage, $page);

        return Paginated::of($rows, fn (array $suspect) => $suspect) + ['days' => $days];
    }

    /**
     * Per player, since `$since`: runs by trouble, each flag code's count,
     * the best score among them and when the last one was played.
     *
     * @return array<string, array{runs: array{flagged: int, review: int, rejected: int, signalled: int}, codes: array<string, int>, topScore: int|null, lastFlagAt: string|null}>
     */
    private function runSignals(Carbon $since): array
    {
        $select = [
            'user_id',
            'sum(case when status = ? then 1 else 0 end) as flagged',
            'sum(case when status = ? then 1 else 0 end) as held',
            'sum(case when status = ? then 1 else 0 end) as rejected',
            'sum(case when status = ? then 1 else 0 end) as signalled',
            'max(score) as top_score',
            'max(started_at) as last_at',
        ];
        $bindings = [RunStatus::Flagged->value, RunStatus::Review->value, RunStatus::Rejected->value, RunStatus::Ranked->value];
        foreach (RunFlag::cases() as $index => $flag) {
            $select[] = "sum(case when flag_codes like ? escape '!' then 1 else 0 end) as flag_{$index}";
            $bindings[] = $flag->pattern();
        }

        $rows = DB::table('runs')
            ->selectRaw(implode(', ', $select), $bindings)
            ->whereNotNull('flag_codes')
            ->where('started_at', '>=', $since->format((new Run)->getDateFormat()))
            ->groupBy('user_id')
            ->get();

        $signals = [];
        foreach ($rows as $row) {
            $codes = [];
            foreach (RunFlag::cases() as $index => $flag) {
                $count = (int) $row->{"flag_{$index}"};
                if ($count > 0) {
                    $codes[$flag->value] = $count;
                }
            }
            $signals[(string) $row->user_id] = [
                'runs' => [
                    'flagged' => (int) $row->flagged,
                    'review' => (int) $row->held,
                    'rejected' => (int) $row->rejected,
                    'signalled' => (int) $row->signalled,
                ],
                'codes' => $codes,
                'topScore' => $row->top_score === null ? null : (int) $row->top_score,
                'lastFlagAt' => $row->last_at === null ? null : Timestamp::iso(Carbon::parse($row->last_at, 'UTC')),
            ];
        }

        return $signals;
    }

    /**
     * How many accounts each install has.
     *
     * @param  list<string>  $installs
     * @return array<string, int>
     */
    private function sharedInstalls(array $installs): array
    {
        if ($installs === []) {
            return [];
        }

        return User::query()
            ->toBase()
            ->selectRaw('install_id, count(*) as total')
            ->whereIn('install_id', $installs)
            ->groupBy('install_id')
            ->pluck('total', 'install_id')
            ->map(fn ($total) => (int) $total)
            ->all();
    }
}
