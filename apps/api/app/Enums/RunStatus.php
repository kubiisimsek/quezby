<?php

namespace App\Enums;

enum RunStatus: string
{
    /** Handed a seed, not finished yet. */
    case Started = 'started';

    /** Replayed, plausible, on the boards. */
    case Ranked = 'ranked';

    /** Replayed, but it failed a plausibility check: kept, never ranked. */
    case Flagged = 'flagged';

    /** A top score with a soft warning, held off the boards until a person looks. */
    case Review = 'review';

    /**
     * A VS run the replay found clean. It settles its VS and nothing else:
     * no board, league, stat or record ever counts it.
     */
    case Played = 'played';

    /** A log the engine refused. */
    case Rejected = 'rejected';

    /** Left open when the player started another run. */
    case Abandoned = 'abandoned';

    /** Never finished within the time a run is given. */
    case Expired = 'expired';

    /** What the app is told; a closed run it never finished is not its business. */
    public function isVisible(): bool
    {
        return in_array($this, [self::Ranked, self::Flagged, self::Review, self::Played], true);
    }

    /** A run that was played to its end and replayed: what a player's history lists. */
    public static function finished(): array
    {
        return [self::Ranked, self::Flagged, self::Review, self::Played];
    }
}
