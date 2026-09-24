<?php

namespace App\Services;

use App\Models\Run;

/** A closed run and what it did: to the boards, the league, and the daily card. */
final readonly class FinishedRun
{
    /**
     * @param  array{tier: string, rank: int, members: int, zone: string, points: int}|null  $league
     * @param  array<string, mixed>|null  $daily
     */
    public function __construct(
        public Run $run,
        public ?RecordOutcome $outcome,
        public ?array $league,
        public ?array $daily,
    ) {}
}
