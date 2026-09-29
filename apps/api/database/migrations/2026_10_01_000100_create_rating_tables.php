<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Elo: one row per player — the rating their league comes from, placed
     * after a few runs — and every change of it, one per run at most, so a
     * run can never move a rating twice.
     */
    public function up(): void
    {
        Schema::create('player_ratings', function (Blueprint $table) {
            $table->foreignUlid('user_id')->primary()->constrained()->cascadeOnDelete();
            // Null until the placement runs are played.
            $table->unsignedInteger('rating')->nullable();
            $table->unsignedTinyInteger('tier')->nullable();
            $table->unsignedInteger('peak')->nullable();
            $table->json('placement_scores')->nullable();
            $table->unsignedInteger('rated_runs')->default(0);
            $table->unsignedTinyInteger('provisional_left')->default(0);
            $table->unsignedTinyInteger('shield_tier')->nullable();
            $table->unsignedTinyInteger('shield_left')->default(0);
            $table->dateTime('rated_at', 3)->nullable();
            $table->dateTime('changed_at', 3)->nullable();
            $table->timestamps();

            $table->index(['rating', 'changed_at']);
            $table->index(['tier', 'rating']);
            $table->index('rated_at');
        });

        Schema::create('rating_changes', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('run_id')->nullable()->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('reversal_of')->nullable()->unique()->constrained('rating_changes')->cascadeOnDelete();
            $table->string('kind', 12);
            $table->unsignedBigInteger('score')->nullable();
            $table->unsignedBigInteger('target')->nullable();
            $table->integer('performance')->nullable();
            $table->unsignedInteger('before')->nullable();
            $table->unsignedInteger('after')->nullable();
            $table->smallInteger('delta')->default(0);
            $table->unsignedTinyInteger('tier_before')->nullable();
            $table->unsignedTinyInteger('tier_after')->nullable();
            $table->unsignedSmallInteger('width')->nullable();
            $table->boolean('shielded')->default(false);
            $table->unsignedSmallInteger('engine_version')->nullable();
            $table->dateTime('created_at', 3);

            $table->index(['user_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rating_changes');
        Schema::dropIfExists('player_ratings');
    }
};
