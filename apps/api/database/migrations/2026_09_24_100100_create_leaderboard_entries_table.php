<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('leaderboard_entries', function (Blueprint $table) {
            $table->id();
            $table->string('period', 16);
            $table->string('period_key', 16);
            $table->foreignUlid('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('run_id')->nullable()->constrained('runs')->nullOnDelete();
            $table->unsignedBigInteger('score');
            $table->unsignedInteger('reels');
            $table->dateTime('achieved_at', 3);
            $table->timestamps(3);

            $table->unique(['period', 'period_key', 'user_id']);
            // Rank order: higher score first, then whoever got there first.
            $table->rawIndex('period, period_key, score desc, achieved_at asc', 'leaderboard_entries_ranking_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('leaderboard_entries');
    }
};
