<?php

use App\Models\User;
use App\Services\LeaderboardService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Dereceli plays for Elo alone: a rated run no longer climbs the week,
     * the month or the season. The players whose rows a rated run holds get
     * their rows rebuilt from their Normal and Günlük runs.
     */
    public function up(): void
    {
        $players = DB::table('leaderboard_entries')
            ->join('runs', 'runs.id', '=', 'leaderboard_entries.run_id')
            ->where('runs.mode', 'rated')
            ->distinct()
            ->pluck('leaderboard_entries.user_id');

        $boards = app(LeaderboardService::class);
        User::query()->whereIn('id', $players)->each(fn (User $user) => $boards->rebuildFor($user));
    }

    /** The rows are rebuilt from runs that are all still there; nothing to undo. */
    public function down(): void {}
};
