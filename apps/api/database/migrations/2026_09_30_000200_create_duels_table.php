<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * VS: two friends, one seed, one attempt each. The challenger plays first;
     * a clean run sends the VS, and the friend has until `expires_at` to
     * answer it. `open_pair` holds "lower id:higher id" while a VS between the
     * two is open, so the unique index keeps it to one at a time. A VS run
     * points back at its VS (`runs.duel_id`); it never ranks anywhere.
     */
    public function up(): void
    {
        Schema::create('duels', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('challenger_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUlid('opponent_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedInteger('seed');
            $table->unsignedSmallInteger('engine_version');
            $table->unsignedSmallInteger('content_version');
            $table->string('status', 16);
            $table->ulid('challenger_run_id')->nullable();
            $table->ulid('opponent_run_id')->nullable();
            $table->unsignedBigInteger('challenger_score')->nullable();
            $table->unsignedBigInteger('opponent_score')->nullable();
            // Whether each side's run was clean: a flagged or refused run loses.
            $table->boolean('challenger_valid')->nullable();
            $table->boolean('opponent_valid')->nullable();
            // Null on a finished VS is a draw.
            $table->ulid('winner_id')->nullable();
            $table->string('open_pair', 60)->nullable()->unique();
            $table->dateTime('sent_at', 3)->nullable();
            $table->dateTime('expires_at', 3)->nullable();
            $table->dateTime('finished_at', 3)->nullable();
            $table->timestamps(3);

            $table->index(['challenger_id', 'status']);
            $table->index(['opponent_id', 'status']);
        });

        Schema::table('runs', function (Blueprint $table) {
            $table->ulid('duel_id')->nullable()->after('daily_key');
            $table->index('duel_id');
            // A player's history, newest first (`GET /me/runs`).
            $table->index(['user_id', 'finished_at']);
        });
    }

    public function down(): void
    {
        Schema::table('runs', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'finished_at']);
            $table->dropIndex(['duel_id']);
            $table->dropColumn('duel_id');
        });
        Schema::dropIfExists('duels');
    }
};
