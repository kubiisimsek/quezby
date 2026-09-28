<?php

namespace App\Services\Admin;

use App\Content\Catalog;
use App\Game\ReelKind;
use Illuminate\Support\Facades\DB;

/**
 * How each post of the feed fares with players — shown, liked, missed — for
 * balancing the catalog. Every post of the latest catalog is listed, shown
 * or not, a page at a time; the panel labels them from `@quezby/config`.
 */
final class ContentStats
{
    /**
     * `AdminContentResponse` in `packages/types`. Rates are per-mille of
     * shows. The totals and the top fives cover every post of the kind asked
     * for, not just the page.
     *
     * @return array<string, mixed>
     */
    public function list(?ReelKind $kind, string $sort, int $page, int $perPage): array
    {
        $version = Catalog::LATEST;
        $ids = [];
        foreach ($kind === null ? ReelKind::cases() : [$kind] as $one) {
            foreach (range(0, Catalog::size($version, $one) - 1) as $position) {
                $ids[Catalog::idOf($one, $position)] = $one;
            }
        }

        // A row exists only for a post that was ever shown: never more rows than the catalog has posts.
        $stats = DB::table('content_stats')->get()->keyBy('content_id');
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
            'items' => array_slice($rows, ($page - 1) * $perPage, $perPage),
            'page' => $page,
            'perPage' => $perPage,
            'total' => count($rows),
            'totals' => [
                'shows' => array_sum(array_column($rows, 'shows')),
                'likes' => array_sum(array_column($rows, 'likes')),
                'misses' => array_sum(array_column($rows, 'misses')),
            ],
            'topMissed' => $this->top($rows, 'missRate', 'misses'),
            'topLiked' => $this->top($rows, 'likeRate', 'likes'),
        ];
    }

    /**
     * The five highest `$rate`s among the posts with any `$count`, highest first.
     *
     * @param  list<array<string, mixed>>  $rows
     * @return list<array<string, mixed>>
     */
    private function top(array $rows, string $rate, string $count): array
    {
        $rows = array_values(array_filter($rows, fn (array $row) => $row[$rate] !== null && $row[$count] > 0));
        usort($rows, fn (array $a, array $b) => [$b[$rate], $a['contentId']] <=> [$a[$rate], $b['contentId']]);

        return array_slice($rows, 0, 5);
    }
}
