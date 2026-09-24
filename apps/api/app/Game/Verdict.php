<?php

namespace App\Game;

enum Verdict: string
{
    case Hit = 'hit';
    case Perfect = 'perfect';
    case Timeout = 'timeout';
    case Wrong = 'wrong';
    case HoldEarly = 'holdEarly';
    case HoldLate = 'holdLate';
    case Caught = 'caught';
    case Drained = 'drained';

    public function isHit(): bool
    {
        return $this === self::Hit || $this === self::Perfect;
    }
}
