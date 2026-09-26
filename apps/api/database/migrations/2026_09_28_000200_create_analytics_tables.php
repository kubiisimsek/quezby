<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Usage analytics, only for players who said yes (`users.analytics_at`),
     * kept in layers that stop growing (`docs/product/analytics.md`):
     *
     * - `analytics_visits` — one row per visit with its screen journey, kept
     *   30 days by default;
     * - `analytics_player_days` — one row per player and active day, kept 90;
     * - `analytics_totals` — anonymous counters per Istanbul day, kept for
     *   good: a few dozen rows a day;
     * - `analytics_milestones` — a player's firsts, a handful each.
     *
     * Every per-player row goes with the account and with the consent.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // When the player said yes to usage analytics; null while they have not.
            $table->dateTime('analytics_at')->nullable()->after('ban_reason');
        });

        Schema::create('analytics_visits', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('user_id')->constrained()->cascadeOnDelete();
            // Minted on the phone: a visit sent twice is kept once.
            $table->string('client_id', 32);
            // The Istanbul day it began.
            $table->string('day', 10);
            $table->dateTime('started_at');
            $table->unsignedInteger('seconds');
            $table->string('platform', 8)->nullable();
            $table->string('app_version', 32)->nullable();
            // [[code, seconds after the start], …] — at most 40 steps.
            $table->json('journey');
            $table->dateTime('created_at');

            $table->unique(['user_id', 'client_id']);
            $table->index(['user_id', 'started_at']);
            $table->index('started_at');
        });

        Schema::create('analytics_player_days', function (Blueprint $table) {
            $table->foreignUlid('user_id')->constrained()->cascadeOnDelete();
            $table->string('day', 10);
            // Istanbul days since the account was made: 0 on its first day.
            $table->unsignedSmallInteger('age');
            $table->unsignedSmallInteger('visits')->default(0);
            $table->unsignedInteger('seconds')->default(0);
            $table->string('platform', 8)->nullable();
            $table->string('app_version', 32)->nullable();

            $table->primary(['user_id', 'day']);
            // Players active over a stretch of days: `count(distinct user_id)`.
            $table->index(['day', 'user_id']);
        });

        Schema::create('analytics_totals', function (Blueprint $table) {
            // The Istanbul day — for `age:N`, the day the players joined.
            $table->string('day', 10);
            // `active`, `visits`, `seconds`, `screen:home`, `event:rival`, `age:7`, `dropped`…
            $table->string('bucket', 40);
            $table->unsignedBigInteger('total')->default(0);

            $table->primary(['day', 'bucket']);
        });

        Schema::create('analytics_milestones', function (Blueprint $table) {
            $table->foreignUlid('user_id')->constrained()->cascadeOnDelete();
            // `tutorial_done`, `nickname_skip`… — `AnalyticsEvent::isMilestone()`.
            $table->string('milestone', 24);
            $table->dateTime('at');

            $table->primary(['user_id', 'milestone']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('analytics_milestones');
        Schema::dropIfExists('analytics_totals');
        Schema::dropIfExists('analytics_player_days');
        Schema::dropIfExists('analytics_visits');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('analytics_at');
        });
    }
};
