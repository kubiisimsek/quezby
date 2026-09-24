<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Lifetime numbers, added up from the server's replays of ranked runs, and
     * which posts of the feed players liked — per player and overall.
     */
    public function up(): void
    {
        Schema::create('player_stats', function (Blueprint $table) {
            $table->foreignUlid('user_id')->primary()->constrained()->cascadeOnDelete();
            $table->unsignedInteger('runs')->default(0);
            $table->unsignedInteger('reels')->default(0);
            $table->unsignedInteger('swipes')->default(0);
            $table->unsignedInteger('likes')->default(0);
            $table->unsignedInteger('holds')->default(0);
            $table->unsignedInteger('perfects')->default(0);
            $table->unsignedInteger('freezes')->default(0);
            $table->unsignedInteger('caught')->default(0);
            $table->unsignedInteger('misses')->default(0);
            $table->unsignedBigInteger('active_ms')->default(0);
            $table->unsignedInteger('best_reaction_ms')->nullable();
            $table->unsignedSmallInteger('max_combo')->default(1000);
            $table->unsignedInteger('flawless')->default(0);
            $table->unsignedInteger('lightning')->default(0);
            $table->unsignedInteger('cool_head')->default(0);
            $table->unsignedInteger('comeback')->default(0);
            $table->dateTime('updated_at')->nullable();
        });

        Schema::create('player_content', function (Blueprint $table) {
            $table->foreignUlid('user_id')->constrained()->cascadeOnDelete();
            $table->string('content_id', 24);
            $table->unsignedInteger('shows')->default(0);
            $table->unsignedInteger('likes')->default(0);

            $table->primary(['user_id', 'content_id']);
        });

        Schema::create('content_stats', function (Blueprint $table) {
            $table->string('content_id', 24)->primary();
            $table->unsignedBigInteger('shows')->default(0);
            $table->unsignedBigInteger('likes')->default(0);
            $table->unsignedBigInteger('misses')->default(0);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('content_stats');
        Schema::dropIfExists('player_content');
        Schema::dropIfExists('player_stats');
    }
};
