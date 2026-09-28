<?php

namespace App\Enums;

/** Where a VS stands — `DuelStatus` in `packages/types`. */
enum DuelStatus: string
{
    /** The challenger is playing their run; the friend knows nothing yet. */
    case Playing = 'playing';

    /** Sent: the challenger's clean run waits for the friend's answer, until it expires. */
    case Waiting = 'waiting';

    /** Both played; the higher clean score won. */
    case Finished = 'finished';

    /** The friend turned it down. */
    case Declined = 'declined';

    /** The friend did not start their run in time; it counts for nobody. */
    case Expired = 'expired';

    /** The two stopped being friends, or one blocked the other, while it was open. */
    case Cancelled = 'cancelled';

    /** The challenger's run was not clean or never finished: it was never sent. */
    case Void = 'void';

    public function isOpen(): bool
    {
        return $this === self::Playing || $this === self::Waiting;
    }
}
