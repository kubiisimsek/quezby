<?php

namespace App\Services;

/** What recording a run did to the boards: ranks before and after, a new best, who it overtook. */
final readonly class RecordOutcome
{
    /**
     * @param  array{weekly: int|null, monthly: int|null, all: int|null}  $before
     * @param  array{weekly: int|null, monthly: int|null, all: int|null}  $after
     * @param  list<array{username: string, avatarUrl: string|null, score: int, isFriend: bool}>  $passed
     */
    public function __construct(
        public array $before,
        public array $after,
        public bool $isNewBest,
        public array $passed,
    ) {}

    /**
     * `rankChanges` in `packages/types`.
     *
     * @return array<string, array{before: int|null, after: int|null}>
     */
    public function changes(): array
    {
        $changes = [];
        foreach ($this->after as $period => $after) {
            $changes[$period] = ['before' => $this->before[$period], 'after' => $after];
        }

        return $changes;
    }
}
