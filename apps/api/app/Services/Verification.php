<?php

namespace App\Services;

use App\Game\Replay;
use App\Game\RunSummary;

/**
 * The server's replay of a run, and what it found. A hard flag keeps the run
 * off every board; a soft signal only matters for a score that would reach
 * the top, which then waits for a person to look at it.
 */
final readonly class Verification
{
    /**
     * @param  list<array<string, mixed>>  $hard
     * @param  list<array<string, mixed>>  $soft
     */
    public function __construct(
        public Replay $replay,
        public array $hard,
        public array $soft,
    ) {}

    public function summary(): RunSummary
    {
        return $this->replay->summary;
    }

    /** @param  list<array<string, mixed>>  $signals */
    public function withSoft(array $signals): self
    {
        return new self($this->replay, $this->hard, [...$this->soft, ...$signals]);
    }

    /**
     * Everything found, each marked with how much it weighs — what `runs.flags` stores.
     *
     * @return list<array<string, mixed>>
     */
    public function flags(): array
    {
        return [
            ...array_map(fn (array $flag) => $flag + ['severity' => 'hard'], $this->hard),
            ...array_map(fn (array $flag) => $flag + ['severity' => 'soft'], $this->soft),
        ];
    }
}
