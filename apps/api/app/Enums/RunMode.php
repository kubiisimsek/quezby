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

    /**
     * "Dereceli": any number a day, on a fresh random seed — and the only
     * runs that move a player's Elo and their weekly group. Open once the
     * player has counted enough free and daily runs (`rating.unlock_runs`).
     */
    case Rated = 'rated';

    /** Whether the run can reach a board and the lifetime stats. */
    public function ranks(): bool
    {
        return $this !== self::Vs;
    }

    /** Whether the run plays for Elo. */
    public function rated(): bool
    {
        return $this === self::Rated;
    }

    /** Whether the run counts toward opening Dereceli: a free or a daily run. */
    public function opensRated(): bool
    {
        return $this === self::Free || $this === self::Daily;
    }
}
