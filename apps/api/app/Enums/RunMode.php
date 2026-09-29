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
     * "Dereceli": any number a day, on a fresh random seed, at the difficulty
     * the player's Elo gives it — and the only runs that move a player's Elo.
     * They never reach the score boards. Open once the player has counted
     * enough free and daily runs (`rating.unlock_runs`).
     */
    case Rated = 'rated';

    /**
     * Whether the run is judged for a standing — ranked, held for review or
     * flagged — and counts in the lifetime stats: every run but a VS.
     */
    public function ranks(): bool
    {
        return $this !== self::Vs;
    }

    /** Whether the run climbs the week, the month and the season (Zirve): Normal and Günlük only. */
    public function boards(): bool
    {
        return $this === self::Free || $this === self::Daily;
    }

    /**
     * The modes whose runs climb the score boards, as stored.
     *
     * @return list<string>
     */
    public static function onBoards(): array
    {
        return array_values(array_map(fn (self $mode) => $mode->value, array_filter(self::cases(), fn (self $mode) => $mode->boards())));
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
