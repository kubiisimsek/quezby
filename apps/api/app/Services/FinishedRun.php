<?php

namespace App\Services;

use App\Models\Duel;
use App\Models\Run;

/** A closed run and what it did: to the rating, the boards, the daily card — or, for a VS, to its VS. */
final readonly class FinishedRun
{
    /**
     * @param  array{required: int, remaining: int, placement: int}|null  $leagueUnlock  after a free or daily run, how far Dereceli still is (`remaining: 0` on the run that opened it); null otherwise
     * @param  array<string, mixed>|null  $daily
     * @param  array<string, mixed>|null  $rating  `RunRating` in `packages/types`; null for a VS
     */
    public function __construct(
        public Run $run,
        public ?RecordOutcome $outcome,
        public ?array $leagueUnlock,
        public ?array $daily,
        public ?Duel $duel = null,
        public ?array $rating = null,
    ) {}
}
