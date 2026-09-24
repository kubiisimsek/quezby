<?php

namespace App\Services\Integrity;

use App\Enums\DeviceVerdict;

/** What one device check found: a verdict, why it failed, and what the proof said. */
final readonly class DeviceCheckResult
{
    /**
     * @param  array<string, mixed>  $details  kept with the verdict, trimmed to what support needs
     */
    public function __construct(
        public DeviceVerdict $verdict,
        /** A short code for a `fail`, or for why the check was `unavailable`. */
        public ?string $reason = null,
        public array $details = [],
    ) {}

    /** @param  array<string, mixed>  $details */
    public static function pass(array $details = []): self
    {
        return new self(DeviceVerdict::Pass, null, $details);
    }

    /** @param  array<string, mixed>  $details */
    public static function fail(string $reason, array $details = []): self
    {
        return new self(DeviceVerdict::Fail, $reason, $details);
    }

    /** No check could be made; nothing is held against the player. */
    public static function unavailable(string $reason): self
    {
        return new self(DeviceVerdict::Unavailable, $reason);
    }
}
