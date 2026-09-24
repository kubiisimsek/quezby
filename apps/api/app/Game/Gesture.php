<?php

namespace App\Game;

/** What the player did on one reel — the first element of an action. */
enum Gesture: int
{
    /** The reel's window ran out untouched. */
    case None = 0;
    case Up = 1;
    case Like = 2;
    /** Pressed, then let go after `d` ms. */
    case Hold = 3;
    /** Touched a freeze reel at all. */
    case Touch = 4;

    public function allowedOn(ReelKind $kind): bool
    {
        if ($this === self::None) {
            return true;
        }

        return $kind === ReelKind::Freeze ? $this === self::Touch : $this !== self::Touch;
    }
}
