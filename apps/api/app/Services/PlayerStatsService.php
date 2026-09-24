<?php

namespace App\Services;

use App\Game\RunSummary;
use App\Models\PlayerStat;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Adds a ranked run to its player's lifetime numbers and to the feed's post
 * counters. Only ranked runs count, so a flagged run can never pad a profile.
 */
final class PlayerStatsService
{
    public function add(User $user, RunSummary $summary, RunStats $stats): void
    {
        DB::table('player_stats')->insertOrIgnore(['user_id' => $user->id]);

        $best = $stats->bestReactionMs;
        DB::table('player_stats')->where('user_id', $user->id)->update([
            'runs' => DB::raw('runs + 1'),
            'reels' => DB::raw('reels + '.$summary->reels),
            'swipes' => DB::raw('swipes + '.$stats->swipes),
            'likes' => DB::raw('likes + '.$stats->likes),
            'holds' => DB::raw('holds + '.$stats->holds),
            'perfects' => DB::raw('perfects + '.$stats->perfects),
            'freezes' => DB::raw('freezes + '.$stats->freezes),
            'caught' => DB::raw('caught + '.$stats->misses['caught']),
            'misses' => DB::raw('misses + '.$stats->missCount()),
            'active_ms' => DB::raw('active_ms + '.$summary->activeMs),
            'best_reaction_ms' => $best === null
                ? DB::raw('best_reaction_ms')
                : DB::raw("CASE WHEN best_reaction_ms IS NULL OR best_reaction_ms > {$best} THEN {$best} ELSE best_reaction_ms END"),
            'max_combo' => DB::raw("CASE WHEN max_combo < {$summary->maxCombo} THEN {$summary->maxCombo} ELSE max_combo END"),
            'flawless' => DB::raw('flawless + '.$summary->bonuses['flawless']),
            'lightning' => DB::raw('lightning + '.$summary->bonuses['lightning']),
            'cool_head' => DB::raw('cool_head + '.$summary->bonuses['coolHead']),
            'comeback' => DB::raw('comeback + '.$summary->bonuses['comeback']),
            'updated_at' => now(),
        ]);

        $this->countContent($user, $stats->content);
    }

    /**
     * Two statements per table whatever the run's length: make sure every
     * post has a row, then add to all of them at once.
     *
     * @param  array<string, array{shows: int, likes: int, misses: int}>  $content
     */
    private function countContent(User $user, array $content): void
    {
        if ($content === []) {
            return;
        }
        $ids = array_keys($content);

        DB::table('content_stats')->insertOrIgnore(array_map(fn (string $id) => ['content_id' => $id], $ids));
        $this->addTo('content_stats', [], $content, ['shows', 'likes', 'misses']);

        // A player's favourites are the friends' posts they liked.
        $friends = array_filter($content, fn (string $id) => str_starts_with($id, 'like-'), ARRAY_FILTER_USE_KEY);
        if ($friends === []) {
            return;
        }
        DB::table('player_content')->insertOrIgnore(array_map(
            fn (string $id) => ['user_id' => $user->id, 'content_id' => $id],
            array_keys($friends),
        ));
        $this->addTo('player_content', [$user->id], $friends, ['shows', 'likes']);
    }

    /**
     * `UPDATE … SET col = col + CASE content_id WHEN … END` over every post at once.
     *
     * @param  list<string>  $scopeBindings  The player, for a per-player table.
     * @param  array<string, array<string, int>>  $content
     * @param  list<string>  $columns
     */
    private function addTo(string $table, array $scopeBindings, array $content, array $columns): void
    {
        $ids = array_keys($content);
        $sets = [];
        $bindings = [];
        foreach ($columns as $column) {
            $cases = [];
            foreach ($content as $id => $counts) {
                $cases[] = 'WHEN ? THEN ?';
                array_push($bindings, $id, $counts[$column]);
            }
            $sets[] = "{$column} = {$column} + CASE content_id ".implode(' ', $cases).' ELSE 0 END';
        }
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $scope = $scopeBindings === [] ? '' : 'user_id = ? AND ';

        DB::update(
            "UPDATE {$table} SET ".implode(', ', $sets)." WHERE {$scope}content_id IN ({$placeholders})",
            [...$bindings, ...$scopeBindings, ...$ids],
        );
    }

    /**
     * `PlayerStats` in `packages/types`, and the friends' posts liked most.
     *
     * @return array{stats: array<string, mixed>, topLiked: list<array{contentId: string, likes: int}>}
     */
    public function of(User $user): array
    {
        $row = PlayerStat::query()->find($user->id);

        $stats = [
            'runs' => $row->runs ?? 0,
            'reels' => $row->reels ?? 0,
            'swipes' => $row->swipes ?? 0,
            'likes' => $row->likes ?? 0,
            'holds' => $row->holds ?? 0,
            'perfects' => $row->perfects ?? 0,
            'freezes' => $row->freezes ?? 0,
            'caught' => $row->caught ?? 0,
            'misses' => $row->misses ?? 0,
            'activeMs' => $row->active_ms ?? 0,
            'bestReactionMs' => $row?->best_reaction_ms,
            'maxCombo' => $row->max_combo ?? 1000,
            'bonuses' => [
                'flawless' => $row->flawless ?? 0,
                'lightning' => $row->lightning ?? 0,
                'coolHead' => $row->cool_head ?? 0,
                'comeback' => $row->comeback ?? 0,
            ],
        ];

        $topLiked = DB::table('player_content')
            ->where('user_id', $user->id)
            ->where('likes', '>', 0)
            ->orderByDesc('likes')
            ->orderBy('content_id')
            ->limit(5)
            ->get(['content_id', 'likes'])
            ->map(fn (object $row) => ['contentId' => (string) $row->content_id, 'likes' => (int) $row->likes])
            ->all();

        return ['stats' => $stats, 'topLiked' => $topLiked];
    }
}
