<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Engine v2 runs: a mode (free or the daily challenge), the one open run a
     * player may have, the content catalog the app drew, the server's stats
     * of the replay, and the app build that played it.
     */
    public function up(): void
    {
        Schema::table('runs', function (Blueprint $table) {
            $table->string('mode', 8)->default('free')->after('status');
            // The Istanbul day of a daily run: one attempt per player per day.
            $table->string('daily_key', 10)->nullable()->after('mode');
            // Set while the run is `started`, so a player has at most one open run.
            $table->ulid('open_user_id')->nullable()->after('daily_key');
            $table->unsignedSmallInteger('content_version')->default(1)->after('engine_version');
            $table->string('app_version', 32)->nullable()->after('content_version');
            $table->unsignedSmallInteger('max_combo')->nullable()->after('max_streak');
            $table->unsignedBigInteger('bonus_points')->nullable()->after('max_combo');
            $table->json('stats')->nullable()->after('flags');

            $table->unique(['user_id', 'daily_key']);
            $table->unique('open_user_id');
            $table->index(['status', 'finished_at']);
        });
    }

    public function down(): void
    {
        Schema::table('runs', function (Blueprint $table) {
            $table->dropIndex(['status', 'finished_at']);
            $table->dropUnique(['open_user_id']);
            $table->dropUnique(['user_id', 'daily_key']);
            $table->dropColumn(['mode', 'daily_key', 'open_user_id', 'content_version', 'app_version', 'max_combo', 'bonus_points', 'stats']);
        });
    }
};
