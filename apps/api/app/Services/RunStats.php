<?php

namespace App\Services;

/**
 * What the server's replay counted: the run's `stats` (stored on the run and
 * shown on the result screen) and, per post of the feed, how often it was
 * shown, liked and missed.
 */
final readonly class RunStats
{
    /**
     * @param  array{timeout: int, wrong: int, holdEarly: int, holdLate: int, caught: int}  $misses
     * @param  list<int>  $levelMisses
     * @param  array{flawless: int, lightning: int, coolHead: int, comeback: int}  $bonuses
     * @param  array{flawless: int, lightning: int, coolHead: int, comeback: int}  $bonusPoints
     * @param  array<string, array{shows: int, likes: int, misses: int}>  $content
     */
    public function __construct(
        public int $swipes,
        public int $likes,
        public int $holds,
        public int $perfects,
        public int $freezes,
        public array $misses,
        public int $avgReactionMs,
        public ?int $bestReactionMs,
        public array $levelMisses,
        public array $bonuses,
        public array $bonusPoints,
        public array $content,
    ) {}

    /**
     * `runs.stats` — `RunStats` in `packages/types`, plus the bonus counts.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'swipes' => $this->swipes,
            'likes' => $this->likes,
            'holds' => $this->holds,
            'perfects' => $this->perfects,
            'freezes' => $this->freezes,
            'misses' => $this->misses,
            'avgReactionMs' => $this->avgReactionMs,
            'bestReactionMs' => $this->bestReactionMs,
            'levelMisses' => $this->levelMisses,
            'bonuses' => $this->bonuses,
            'bonusPoints' => $this->bonusPoints,
        ];
    }

    public function missCount(): int
    {
        return array_sum($this->misses);
    }
}
