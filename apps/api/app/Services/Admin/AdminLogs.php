<?php

namespace App\Services\Admin;

use App\Enums\LogLevel;
use App\Models\SystemLog;
use App\Services\Logs\SystemLogger;
use App\Support\Timestamp;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * The Loglar page. `list()` — `AdminLogsResponse`: rows of `system_logs`,
 * newest first, a page at a time without counting them all (the table can
 * hold millions): one row more than asked says whether there is a next page.
 * `summary()` — `AdminLogSummary`: what `system_log_days` counted, by day
 * for thirty days or by month for twelve, with the events seen most.
 */
final class AdminLogs
{
    public const RANGES = ['30d', '12m'];

    /** The events a summary names, the most frequent first. */
    public const TOP = 20;

    public function __construct(private readonly SystemLogger $logger) {}

    /**
     * @param  array{level?: string|null, source?: string|null, event?: string|null, player?: string|null, status?: int|string|null}  $filters
     * @return array<string, mixed>
     */
    public function list(array $filters, int $page, int $perPage): array
    {
        $rows = SystemLog::query()
            ->with('user:id,username')
            ->when($filters['level'] ?? null, fn (Builder $query, string $level) => $query->where('level', $level))
            ->when($filters['source'] ?? null, fn (Builder $query, string $source) => $query->where('source', $source))
            ->when($filters['event'] ?? null, fn (Builder $query, string $event) => $query->where('event', $event))
            ->when($filters['player'] ?? null, fn (Builder $query, string $id) => $query->where('user_id', strtolower($id)))
            ->when($filters['status'] ?? null, fn (Builder $query, int|string $status) => $query->where('status', (int) $status))
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->offset(($page - 1) * $perPage)
            ->limit($perPage + 1)
            ->get();

        // The events of the days rows are still kept, from the small table.
        $since = Carbon::parse($this->logger->today())->subDays(max(config('quezby.logs.keep_days')))->format('Y-m-d');
        $events = DB::table('system_log_days')
            ->where('day', '>=', $since)
            ->when($filters['source'] ?? null, fn (QueryBuilder $query, string $source) => $query->where('source', $source))
            ->distinct()
            ->orderBy('event')
            ->limit(200)
            ->pluck('event')
            ->all();

        return [
            'items' => $rows->take($perPage)->map($this->present(...))->values()->all(),
            'page' => $page,
            'perPage' => $perPage,
            'hasMore' => $rows->count() > $perPage,
            'events' => $events,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function summary(string $range): array
    {
        $today = Carbon::parse($this->logger->today());
        $monthly = $range === '12m';
        $start = $monthly ? $today->copy()->startOfMonth()->subMonths(11) : $today->copy()->subDays(29);
        $keyOf = fn (string $day) => $monthly ? substr($day, 0, 7) : $day;

        $buckets = [];
        for ($at = $start->copy(); $at->lte($today); $monthly ? $at->addMonth() : $at->addDay()) {
            $buckets[$monthly ? $at->format('Y-m') : $at->format('Y-m-d')] = ['error' => 0, 'warning' => 0, 'info' => 0];
        }

        $since = $start->format('Y-m-d');
        $byDay = DB::table('system_log_days')
            ->where('day', '>=', $since)
            ->groupBy('day', 'level')
            ->select('day', 'level', DB::raw('SUM(total) as total'))
            ->get();
        $totals = ['error' => 0, 'warning' => 0, 'info' => 0];
        foreach ($byDay as $row) {
            $key = $keyOf(substr((string) $row->day, 0, 10));
            $level = LogLevel::tryFrom((string) $row->level)?->value;
            if ($level === null || ! isset($buckets[$key])) {
                continue;
            }
            $buckets[$key][$level] += (int) $row->total;
            $totals[$level] += (int) $row->total;
        }

        $top = DB::table('system_log_days')
            ->where('day', '>=', $since)
            ->groupBy('source', 'event', 'level')
            ->select('source', 'event', 'level', DB::raw('SUM(total) as total'))
            ->orderByDesc('total')
            ->orderBy('event')
            ->limit(self::TOP)
            ->get()
            ->map(fn (object $row) => ['source' => $row->source, 'event' => $row->event, 'level' => $row->level, 'total' => (int) $row->total])
            ->all();

        return [
            'range' => $range,
            'buckets' => array_map(fn (string $key, array $counts) => ['key' => $key, ...$counts], array_keys($buckets), $buckets),
            'totals' => $totals,
            'top' => $top,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function present(SystemLog $row): array
    {
        return [
            'id' => $row->id,
            'at' => Timestamp::iso($row->created_at),
            'level' => $row->level->value,
            'source' => $row->source->value,
            'event' => $row->event,
            'message' => $row->message,
            'status' => $row->status,
            'method' => $row->method,
            'path' => $row->path,
            'durationMs' => $row->duration_ms,
            'player' => $row->user_id === null ? null : ['id' => $row->user_id, 'username' => $row->user?->username],
            'platform' => $row->platform,
            'appVersion' => $row->app_version,
            'context' => $row->context,
        ];
    }
}
