<?php

namespace App\Game;

/** A named combo a hit set off, and what it paid on top of the reel. */
final readonly class BonusHit
{
    public function __construct(
        public BonusKind $kind,
        public int $points,
    ) {}

    /**
     * @return array{kind: string, points: int}
     */
    public function toArray(): array
    {
        return ['kind' => $this->kind->value, 'points' => $this->points];
    }
}
