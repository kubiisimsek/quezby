<?php

namespace App\Services\Integrity;

use App\Enums\DeviceVerdict;
use App\Support\Timestamp;
use Carbon\CarbonInterface;

/**
 * `DeviceCheckResponse` in `packages/types`: the verdict, until when the app
 * may rely on it, and whether a `fail` costs the player anything right now.
 */
final readonly class DeviceCheckAnswer
{
    public function __construct(
        public DeviceVerdict $verdict,
        public CarbonInterface $validUntil,
        /** A `fail` keeps the device's runs off the boards: the API enforces verdicts. */
        public bool $enforced,
    ) {}

    /** @return array{verdict: string, validUntil: string|null, enforced: bool} */
    public function toArray(): array
    {
        return [
            'verdict' => $this->verdict->value,
            'validUntil' => Timestamp::iso($this->validUntil),
            'enforced' => $this->enforced,
        ];
    }
}
