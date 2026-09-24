<?php

namespace App\Game;

/** A replayed run: the summary both engines agree on, and every judged reel. */
final readonly class Replay
{
    /**
     * @param  list<Step>  $steps
     */
    public function __construct(
        public RunSummary $summary,
        public array $steps,
    ) {}
}
