<?php

namespace App\Services;

use App\Models\Run;

/** A closed run and what it did: to the boards, the league, and the daily card. */
final readonly class FinishedRun
{
    /**
     * @param  array{tier: string, rank: int, members: int, zone: string, points: int}|null  $league
     * @param  array{required: int, remaining: int}|null  $leagueUnlock  how far the league still is; null once it is open
     * @param  array<string, mixed>|null  $daily
     */
    public function __construct(
        public Run $run,
        public ?RecordOutcome $outcome,
        public ?array $league,
        public ?array $leagueUnlock,
        public ?array $daily,
    ) {}
}
