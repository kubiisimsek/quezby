<?php

namespace App\Enums;

/**
 * The six leagues, lowest first — a thousand rating points each, open above
 * `Master`. A player's league is the tier of their rating. Stored as the
 * number, spoken as the slug.
 */
enum LeagueTier: int
{
    case Bronze = 1;
    case Silver = 2;
    case Gold = 3;
    case Platinum = 4;
    case Diamond = 5;
    case Master = 6;

    /** Rating points per tier. */
    public const WIDTH = 1000;

    public static function fromRating(int $rating): self
    {
        return self::from(min(self::Master->value, intdiv(max(0, $rating), self::WIDTH) + 1));
    }

    public function slug(): string
    {
        return strtolower($this->name);
    }

    /** The lowest rating in this league. */
    public function floor(): int
    {
        return ($this->value - 1) * self::WIDTH;
    }

    /** Where the next league starts; null above the last one. */
    public function ceil(): ?int
    {
        return $this->isTop() ? null : $this->value * self::WIDTH;
    }

    public function isTop(): bool
    {
        return $this === self::Master;
    }

    public function isBottom(): bool
    {
        return $this === self::Bronze;
    }
}
