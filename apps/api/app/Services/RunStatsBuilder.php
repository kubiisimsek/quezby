<?php

namespace App\Services;

use App\Content\ContentPicker;
use App\Game\ReelKind;
use App\Game\Replay;
use App\Game\Rules;
use App\Game\Verdict;

/**
 * Counts a run from the server's own replay — never from what the app said:
 * every swipe, like, hold and miss, and which post of the feed each reel wore.
 */
final class RunStatsBuilder
{
    public function build(Replay $replay, int $seed, int $contentVersion): RunStats
    {
        $counts = ['swipes' => 0, 'likes' => 0, 'holds' => 0, 'perfects' => 0, 'freezes' => 0];
        $misses = ['timeout' => 0, 'wrong' => 0, 'holdEarly' => 0, 'holdLate' => 0, 'caught' => 0];
        $levelMisses = [];
        $best = null;
        $content = [];
        $bonusPoints = ['flawless' => 0, 'lightning' => 0, 'coolHead' => 0, 'comeback' => 0];

        foreach ($replay->steps as $step) {
            $reel = $step->reel;
            $level = intdiv($reel->index, Rules::LEVEL_EVERY);
            $levelMisses[$level] ??= 0;

            $post = ContentPicker::postId($contentVersion, $seed, $reel->index, $reel->kind);
            $content[$post] ??= ['shows' => 0, 'likes' => 0, 'misses' => 0];
            $content[$post]['shows']++;

            foreach ($step->bonuses as $bonus) {
                $bonusPoints[$bonus->kind->value] += $bonus->points;
            }
            if ($step->verdict === Verdict::Drained) {
                continue;
            }
            if (! $step->verdict->isHit()) {
                $misses[$step->verdict->value]++;
                $levelMisses[$level]++;
                $content[$post]['misses']++;

                continue;
            }

            match ($reel->kind) {
                ReelKind::Skip => $counts['swipes']++,
                ReelKind::Like => $counts['likes']++,
                ReelKind::Hold => $counts['holds']++,
                ReelKind::Freeze => $counts['freezes']++,
            };
            if ($step->verdict === Verdict::Perfect) {
                $counts['perfects']++;
            }
            if ($reel->kind === ReelKind::Like) {
                $content[$post]['likes']++;
            }
            if ($reel->kind === ReelKind::Skip || $reel->kind === ReelKind::Like) {
                $best = $best === null ? $step->t : min($best, $step->t);
            }
        }

        return new RunStats(
            swipes: $counts['swipes'],
            likes: $counts['likes'],
            holds: $counts['holds'],
            perfects: $counts['perfects'],
            freezes: $counts['freezes'],
            misses: $misses,
            avgReactionMs: $replay->summary->avgReactionMs,
            bestReactionMs: $best,
            levelMisses: array_values($levelMisses),
            bonuses: $replay->summary->bonuses,
            bonusPoints: $bonusPoints,
            content: $content,
        );
    }
}
