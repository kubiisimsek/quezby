<?php

namespace App\Game;

/** One reel as the rules see it. */
final readonly class Reel
{
    public function __construct(
        public int $index,
        public ReelKind $kind,
        /** Milliseconds to act — or, for a freeze reel, to keep your hands off. */
        public int $window,
        /** Milliseconds for the hold bar to fill. Zero on every other kind. */
        public int $holdFill,
        /** Centre of the green zone, per-mille of the bar. */
        public int $zoneCenter,
        /** Half the zone's width, per-mille of the bar. */
        public int $zoneHalf,
        /** Meter lost per second while this reel is up. */
        public int $drain,
        public int $level,
    ) {}
}
