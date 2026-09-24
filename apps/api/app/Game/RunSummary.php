<?php

namespace App\Game;

/** What a run came to — the TypeScript `RunSummary`, key for key. */
final readonly class RunSummary
{
    public function __construct(
        public int $engineVersion,
        public int $seed,
        public int $score,
        public int $reels,
        public int $hits,
        public int $misses,
        public int $perfects,
        public int $maxStreak,
        public int $level,
        /** Hits per thousand reels. */
        public int $accuracy,
        /** Mean decision time on skip and like hits. */
        public int $avgReactionMs,
        /** Time spent on reels, transitions excluded. */
        public int $activeMs,
        public EndReason $endedBy,
        /** The highest combo reached, per-mille. */
        public int $maxCombo,
        /** The part of `score` the named combos paid. */
        public int $bonusPoints,
        /** @var array{flawless: int, lightning: int, coolHead: int, comeback: int} */
        public array $bonuses,
    ) {}

    /**
     * @return array{engineVersion: int, seed: int, score: int, reels: int, hits: int, misses: int, perfects: int, maxStreak: int, level: int, accuracy: int, avgReactionMs: int, activeMs: int, endedBy: string, maxCombo: int, bonusPoints: int, bonuses: array{flawless: int, lightning: int, coolHead: int, comeback: int}}
     */
    public function toArray(): array
    {
        return [
            'engineVersion' => $this->engineVersion,
            'seed' => $this->seed,
            'score' => $this->score,
            'reels' => $this->reels,
            'hits' => $this->hits,
            'misses' => $this->misses,
            'perfects' => $this->perfects,
            'maxStreak' => $this->maxStreak,
            'level' => $this->level,
            'accuracy' => $this->accuracy,
            'avgReactionMs' => $this->avgReactionMs,
            'activeMs' => $this->activeMs,
            'endedBy' => $this->endedBy->value,
            'maxCombo' => $this->maxCombo,
            'bonusPoints' => $this->bonusPoints,
            'bonuses' => $this->bonuses,
        ];
    }
}
