<?php

namespace App\Game;

/** What a checkpoint receipt the API signed says. */
final readonly class CheckpointReceipt
{
    public function __construct(
        /** The run it was signed for. */
        public string $runId,
        /** Reels played by then: the length of the log the hash covers. */
        public int $reel,
        /** `Checkpoint::prefixHash` of those moves, as the app sent it. */
        public string $prefixHash,
        /** When the API saw it, Unix ms. */
        public int $timeMs,
    ) {}
}
