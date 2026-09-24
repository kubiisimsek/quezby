<?php

namespace App\Game;

use RuntimeException;

/** A log the app could not have produced. Same codes as the TypeScript engine. */
final class EngineError extends RuntimeException
{
    public const MALFORMED_ACTION = 'malformed_action';

    public const GESTURE_NOT_ALLOWED = 'gesture_not_allowed';

    public const LATE_ACTION = 'late_action';

    public const RUN_OVER = 'run_over';

    /**
     * @param  self::MALFORMED_ACTION|self::GESTURE_NOT_ALLOWED|self::LATE_ACTION|self::RUN_OVER  $error
     */
    public function __construct(
        public readonly string $error,
        public readonly int $reelIndex,
    ) {
        parent::__construct("{$error} at reel {$reelIndex}");
    }
}
