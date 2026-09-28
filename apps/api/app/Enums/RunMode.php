<?php

namespace App\Enums;

enum RunMode: string
{
    /** Any number a day, on a fresh random seed. */
    case Free = 'free';

    /** "Günün akışı": one attempt a day, the same seed for everyone. */
    case Daily = 'daily';

    /** A VS between two friends: their one attempt at the VS's seed. It never ranks. */
    case Vs = 'vs';

    /** Whether the run can reach a board, a league and the lifetime stats. */
    public function ranks(): bool
    {
        return $this !== self::Vs;
    }
}
