<?php

namespace App\Services\Admin;

use App\Content\Catalog;
use App\Game\ReelKind;
use Illuminate\Support\Facades\DB;

/**
 * How each post of the feed fares with players — shown, liked, missed — for
 * balancing the catalog. Every post of the latest catalog is listed, shown
 * or not; the panel labels them from `@quezby/config`.
 */
final class ContentStats
{
    /**
     * `AdminContentResponse` in `packages/types`. Rates are per-mille of shows.
     *
     * @return array<string, mixed>
     */
    public function list(?ReelKind $kind, string $sort): array
    {
        $version = Catalog::LATEST;
        $ids = [];
        foreach ($kind === null ? ReelKind::cases() : [$kind] as $one) {
            foreach (range(0, Catalog::size($version, $one) - 1) as $position) {
                $ids[Catalog::idOf($one, $position)] = $one;
            }
        }

        $stats = DB::table('content_stats')->whereIn('content_id', array_keys($ids))->get()->keyBy('content_id');
        $rows = [];
        foreach ($ids as $id => $one) {
            $row = $stats->get($id);
            $shows = (int) ($row->shows ?? 0);
            $likes = (int) ($row->likes ?? 0);
            $misses = (int) ($row->misses ?? 0);
            $rows[] = [
                'contentId' => $id,
                'kind' => $one->value,
                'shows' => $shows,
                'likes' => $likes,
                'misses' => $misses,
                'likeRate' => $shows === 0 ? null : (int) round($likes * 1000 / $shows),
                'missRate' => $shows === 0 ? null : (int) round($misses * 1000 / $shows),
            ];
        }

        $by = match ($sort) {
            'likeRate' => 'likeRate',
            'missRate' => 'missRate',
            default => 'shows',
        };
        usort($rows, fn (array $a, array $b) => [$b[$by] ?? -1, $a['contentId']] <=> [$a[$by] ?? -1, $b['contentId']]);

        return [
            'contentVersion' => $version,
            'items' => $rows,
            'totals' => [
                'shows' => array_sum(array_column($rows, 'shows')),
                'likes' => array_sum(array_column($rows, 'likes')),
                'misses' => array_sum(array_column($rows, 'misses')),
            ],
        ];
    }
}
