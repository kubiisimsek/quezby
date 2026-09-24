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
        Schema::create('runs', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('seed');
            $table->unsignedSmallInteger('engine_version');
            $table->string('status', 16);
            $table->dateTime('started_at', 3);
            $table->dateTime('finished_at', 3)->nullable();

            // The server's replay summary, set when the run is finished.
            $table->unsignedBigInteger('score')->nullable();
            $table->unsignedInteger('reels')->nullable();
            $table->unsignedInteger('hits')->nullable();
            $table->unsignedInteger('misses')->nullable();
            $table->unsignedInteger('perfects')->nullable();
            $table->unsignedInteger('max_streak')->nullable();
            $table->unsignedInteger('level')->nullable();
            $table->unsignedSmallInteger('accuracy')->nullable();
            $table->unsignedInteger('avg_reaction_ms')->nullable();
            $table->unsignedBigInteger('active_ms')->nullable();
            $table->string('ended_by', 16)->nullable();

            // What the app claimed — compared, never trusted.
            $table->unsignedBigInteger('client_score')->nullable();
            $table->unsignedBigInteger('client_reels')->nullable();

            $table->json('flags')->nullable();
            $table->json('actions')->nullable();
            $table->timestamps(3);

            $table->index(['user_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('runs');
    }
};
