<?php

namespace App\Services\Analytics;

use App\Models\User;
use App\Services\Devices\DeviceRegistry;
use Illuminate\Support\Facades\DB;

/**
 * The player's yes or no to usage analytics, kept as its moment
 * (`users.analytics_at`). A no takes back everything kept about them —
 * visits, days, firsts; only the anonymous daily totals stay.
 */
final class Consent
{
    public function __construct(
        private readonly Analytics $analytics,
        private readonly Days $days,
    ) {}

    /**
     * Yes, from now on — today included: the day's first request, which
     * would have counted it, has already gone by. True when it changed.
     */
    public function grant(User $user, ?string $appVersion = null): bool
    {
        if ($user->analytics_at !== null) {
            return false;
        }
        $user->forceFill(['analytics_at' => now()])->save();

        if ($this->analytics->collects($user)) {
            $this->days->touch($user, $this->analytics->today(), $user->platform, DeviceRegistry::version($appVersion));
        }

        return true;
    }

    /** No: nothing more is kept, and what was kept about the player goes. True when it changed. */
    public function revoke(User $user): bool
    {
        $changed = $user->analytics_at !== null;

        DB::transaction(function () use ($user) {
            $user->forceFill(['analytics_at' => null])->save();
            DB::table('analytics_visits')->where('user_id', $user->id)->delete();
            DB::table('analytics_player_days')->where('user_id', $user->id)->delete();
            DB::table('analytics_milestones')->where('user_id', $user->id)->delete();
        });

        return $changed;
    }
}
