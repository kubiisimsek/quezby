<?php

namespace App\Services\Admin;

use App\Enums\ReportStatus;
use App\Models\Report;
use App\Models\User;
use App\Services\Avatars\AvatarService;
use App\Support\Timestamp;
use Illuminate\Support\Carbon;

/**
 * `GET /admin/reports`: what players reported, a row per reported player —
 * their photo as it is now, how many reports there are about the photo and
 * about the name, the first and the last. The newest trouble first.
 */
final class AdminReports
{
    /**
     * `AdminReportsResponse` in `packages/types`.
     *
     * @return array<string, mixed>
     */
    public function list(ReportStatus $status, int $page, int $perPage): array
    {
        $rows = Report::query()
            ->where('status', $status)
            ->toBase()
            ->selectRaw("reported_id, sum(case when reason = 'photo' then 1 else 0 end) as photo, sum(case when reason = 'name' then 1 else 0 end) as name, count(*) as reports, min(created_at) as first_at, max(created_at) as last_at")
            ->groupBy('reported_id')
            ->orderByDesc('last_at')
            ->orderBy('reported_id')
            ->paginate($perPage, ['*'], 'page', $page);
        $players = User::query()->whereIn('id', collect($rows->items())->pluck('reported_id'))->get()->keyBy('id');

        return Paginated::of($rows, function (object $row) use ($players) {
            $player = $players->get($row->reported_id);

            return [
                'player' => AdminRuns::ref($player),
                'avatarUrl' => AvatarService::url($player?->avatar),
                'reasons' => ['photo' => (int) $row->photo, 'name' => (int) $row->name],
                'reports' => (int) $row->reports,
                'firstAt' => Timestamp::iso(Carbon::parse($row->first_at, 'UTC')),
                'lastAt' => Timestamp::iso(Carbon::parse($row->last_at, 'UTC')),
            ];
        });
    }

    /** Players with a report still open — the sidebar's badge. */
    public function openPlayers(): int
    {
        return Report::query()->where('status', ReportStatus::Open)->distinct()->count('reported_id');
    }
}
