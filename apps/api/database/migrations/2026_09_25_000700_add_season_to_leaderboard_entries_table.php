<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A season is an engine version: every board belongs to one, so a rules
     * change starts fresh daily, weekly, monthly and all-time boards instead
     * of ranking two different games against each other. Rows so far were
     * played with engine v1.
     */
    public function up(): void
    {
        Schema::table('leaderboard_entries', function (Blueprint $table) {
            $table->unsignedSmallInteger('season')->default(1)->after('id');
        });

        Schema::table('leaderboard_entries', function (Blueprint $table) {
            $table->dropUnique(['period', 'period_key', 'user_id']);
            $table->dropIndex('leaderboard_entries_ranking_index');
        });

        Schema::table('leaderboard_entries', function (Blueprint $table) {
            $table->unique(['season', 'period', 'period_key', 'user_id']);
            // Rank order: higher score first, then whoever got there first.
            $table->rawIndex('season, period, period_key, score desc, achieved_at asc', 'leaderboard_entries_ranking_index');
        });
    }

    public function down(): void
    {
        Schema::table('leaderboard_entries', function (Blueprint $table) {
            $table->dropUnique(['season', 'period', 'period_key', 'user_id']);
            $table->dropIndex('leaderboard_entries_ranking_index');
        });

        Schema::table('leaderboard_entries', function (Blueprint $table) {
            $table->dropColumn('season');
            $table->unique(['period', 'period_key', 'user_id']);
            $table->rawIndex('period, period_key, score desc, achieved_at asc', 'leaderboard_entries_ranking_index');
        });
    }
};
