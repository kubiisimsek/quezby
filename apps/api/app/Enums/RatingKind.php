<?php

namespace App\Enums;

/** Why a player's rating moved — or, for `void`, why a run did not move it. `RatingChangeKind` in `packages/types`. */
enum RatingKind: string
{
    /** A placement run: its score waits for the others, the last one places the player. */
    case Placement = 'placement';
    /** A run against the target. */
    case Run = 'run';
    /** A run left unfinished, or one the verifier threw out: rated as the worst result. */
    case Forfeit = 'forfeit';
    /** A run that does not count: a banned player's, a failed device's, one quit before it began. */
    case Void = 'void';
    /** A gain taken back after a moderator threw its run out. */
    case Reversal = 'reversal';
    /** An owner set the rating by hand from the panel (`POST /admin/players/{id}/rating`); it places a player not placed yet. */
    case Adjust = 'adjust';
}
