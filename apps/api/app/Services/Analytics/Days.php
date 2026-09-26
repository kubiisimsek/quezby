<?php

namespace App\Services\Analytics;

use App\Models\User;
use Illuminate\Container\Attributes\Config;
use Illuminate\Support\Facades\DB;

/**
 * A consenting player's active days (`analytics_player_days`), one row per
 * player and Istanbul day. The first time a day is touched is the only time
 * the day's counters move — so presence and visits, arriving in any order
 * and any number of times, count a player once a day.
 */
final class Days
{
    public function __construct(
        private readonly Analytics $analytics,
        private readonly Totals $totals,
        #[Config('quezby.analytics.max_age')]
        private readonly int $maxAge,
    ) {}

    /**
     * The player was active on `$day`. The first time that day: its row, the
     * day's `active`, and — for a player who was active on the day they
     * joined — the cohort's `age:N`, so players who said yes only later
     * never skew the cohorts. True when it was the first time.
     */
    public function touch(User $user, string $day, ?string $platform, ?string $version): bool
    {
        $age = $this->analytics->ageOf($user, $day);
        $inserted = DB::table('analytics_player_days')->insertOrIgnore([
            'user_id' => $user->id,
            'day' => $day,
            'age' => min($age, 65535),
            'visits' => 0,
            'seconds' => 0,
            'platform' => $platform,
            'app_version' => $version,
        ]);
        if ($inserted === 0) {
            return false;
        }

        $this->totals->add($day, ['active' => 1]);
        if ($age <= $this->maxAge && ($age === 0 || $this->wasActiveOnFirstDay($user))) {
            $this->totals->add($this->analytics->cohortOf($user), ["age:{$age}" => 1]);
        }

        return true;
    }

    /** A visit of `$seconds` on the player's `$day`, already touched. */
    public function addVisit(User $user, string $day, int $seconds, ?string $platform, ?string $version): void
    {
        DB::table('analytics_player_days')
            ->where('user_id', $user->id)
            ->where('day', $day)
            ->update(array_filter([
                'visits' => DB::raw('visits + 1'),
                'seconds' => DB::raw('seconds + '.max(0, $seconds)),
                'platform' => $platform,
                'app_version' => $version,
            ], fn ($value) => $value !== null));
    }

    /** How many visits the player's `$day` holds already. */
    public function visitsOn(User $user, string $day): int
    {
        return (int) DB::table('analytics_player_days')
            ->where('user_id', $user->id)
            ->where('day', $day)
            ->value('visits');
    }

    private function wasActiveOnFirstDay(User $user): bool
    {
        return DB::table('analytics_player_days')
            ->where('user_id', $user->id)
            ->where('day', $this->analytics->cohortOf($user))
            ->exists();
    }
}
