<?php

namespace App\Enums;

/** The five weekly leagues, lowest first. Stored as the number, spoken as the slug. */
enum LeagueTier: int
{
    case Bronze = 1;
    case Silver = 2;
    case Gold = 3;
    case Platinum = 4;
    case Diamond = 5;

    public function slug(): string
    {
        return strtolower($this->name);
    }

    public function up(): self
    {
        return self::tryFrom($this->value + 1) ?? $this;
    }

    public function down(): self
    {
        return self::tryFrom($this->value - 1) ?? $this;
    }

    public function isTop(): bool
    {
        return $this === self::Diamond;
    }

    public function isBottom(): bool
    {
        return $this === self::Bronze;
    }
}
