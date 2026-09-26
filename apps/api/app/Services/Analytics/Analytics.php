<?php

namespace App\Services\Analytics;

use App\Enums\ActivityStatus;
use App\Enums\LeaderboardPeriod;
use App\Models\User;
use App\Services\LeaderboardService;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Container\Attributes\Config;

/**
 * Whose usage is kept, and the days it is kept by. Kept only when analytics
 * is switched on, the player said yes (`users.analytics_at`) and they are in
 * the sample — the same players whatever the day, by a hash of their id.
 * Days are the game's: Istanbul days, `Y-m-d`.
 */
final class Analytics
{
    public function __construct(
        private readonly LeaderboardService $leaderboards,
        #[Config('quezby.analytics.enabled')]
        private readonly bool $enabled,
        #[Config('quezby.analytics.sample')]
        private readonly int $sample,
    ) {}

    public function enabled(): bool
    {
        return $this->enabled;
    }

    /** Of every 1000 consenting players, how many are kept. */
    public function sample(): int
    {
        return $this->sample;
    }

    public function status(User $user): ActivityStatus
    {
        return match (true) {
            ! $this->enabled => ActivityStatus::Disabled,
            $user->analytics_at === null => ActivityStatus::NoConsent,
            ! $this->inSample($user->id) => ActivityStatus::NotSampled,
            default => ActivityStatus::Tracked,
        };
    }

    public function collects(User $user): bool
    {
        return $this->status($user) === ActivityStatus::Tracked;
    }

    public function inSample(string $userId): bool
    {
        return $this->sample >= 1000 || crc32($userId) % 1000 < $this->sample;
    }

    public function dayOf(CarbonInterface $at): string
    {
        return $this->leaderboards->keyAt(LeaderboardPeriod::Daily, $at);
    }

    public function today(): string
    {
        return $this->dayOf(now());
    }

    /** When today began, in UTC. */
    public function todayStart(): CarbonImmutable
    {
        [$start] = $this->leaderboards->boundsAt(LeaderboardPeriod::Daily, now()) ?? [now()->toImmutable()->startOfDay()];

        return $start;
    }

    /** The Istanbul day the account was made — its cohort. */
    public function cohortOf(User $user): string
    {
        return $this->dayOf($user->created_at);
    }

    /** Istanbul days from the account's first day to `$day`: 0 on the first, never below. */
    public function ageOf(User $user, string $day): int
    {
        return max(0, self::between($this->cohortOf($user), $day));
    }

    /** `$day` moved by `$days`, `Y-m-d`. */
    public static function shift(string $day, int $days): string
    {
        return CarbonImmutable::parse($day, 'UTC')->addDays($days)->format('Y-m-d');
    }

    /** Whole days from `$from` to `$to`; negative when `$to` comes first. */
    public static function between(string $from, string $to): int
    {
        return (int) round(CarbonImmutable::parse($from, 'UTC')->diffInDays(CarbonImmutable::parse($to, 'UTC'), false));
    }
}
