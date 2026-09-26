<?php

namespace App\Services\Analytics;

use App\Models\User;
use App\Services\Devices\DeviceRegistry;
use App\Support\DeviceHeader;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Laravel\Sanctum\Events\TokenAuthenticated;
use Throwable;

/**
 * "Seen today": the device registry, and — with consent — the player's day.
 * Written on a token's first request of the Istanbul day and never again
 * that day, with no request, no query and no cache file of its own: Sanctum
 * already moves the token's `last_used_at` on every request, and announces
 * the token (`TokenAuthenticated`) just before it does, so the old value
 * tells whether the day has been seen. A cache key per player and day
 * would leave a file behind for every one of them — the file store never
 * deletes what expired — and fill a shared host's inodes.
 *
 * Nothing here may break a request: a failure is only reported.
 */
final class Presence
{
    /** Where the token's previous use waits, on the request, for `RecordPresence`. */
    public const PREVIOUS = 'quezby.presence.previous';

    public function __construct(
        private readonly Analytics $analytics,
        private readonly Days $days,
        private readonly DeviceRegistry $devices,
    ) {}

    /** Sanctum's `TokenAuthenticated`: note on the request when a player's token was used before this one. */
    public static function remember(TokenAuthenticated $event): void
    {
        if (! $event->token->tokenable instanceof User) {
            return;
        }
        $previous = $event->token->last_used_at;
        request()->attributes->set(self::PREVIOUS, [
            'at' => $previous instanceof CarbonInterface ? $previous->toImmutable() : null,
        ]);
    }

    /** The request is the day's first for its token: the phone into the registry, and the player's day. */
    public function seen(Request $request, User $user): void
    {
        $previous = $request->attributes->get(self::PREVIOUS);
        if (! is_array($previous)) {
            return;
        }

        try {
            $at = $previous['at'] ?? null;
            if ($at instanceof CarbonInterface && $at->gte($this->analytics->todayStart())) {
                return;
            }

            $version = DeviceRegistry::version($request->header('X-App-Version'));
            $device = DeviceHeader::from($request);
            if ($device !== null) {
                $this->devices->seen($user, $device, $version);
            }
            if ($this->analytics->collects($user)) {
                $this->days->touch($user, $this->analytics->today(), $device?->platform?->value ?? $user->platform, $version);
            }
        } catch (Throwable $e) {
            report($e);
        }
    }
}
