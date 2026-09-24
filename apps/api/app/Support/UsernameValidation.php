<?php

namespace App\Support;

final readonly class UsernameValidation
{
    private function __construct(
        public bool $ok,
        public ?string $normalized,
        public ?UsernameProblem $problem,
    ) {}

    public static function valid(string $normalized): self
    {
        return new self(true, $normalized, null);
    }

    public static function invalid(UsernameProblem $problem): self
    {
        return new self(false, null, $problem);
    }
}
