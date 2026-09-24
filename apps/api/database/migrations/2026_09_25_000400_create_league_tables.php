<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Weekly leagues: groups of up to 30 players of one tier, filled as players
     * finish their first ranked run of the week, settled lazily the next time
     * each member plays.
     */
    public function up(): void
    {
        Schema::create('league_groups', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('season');
            $table->string('week_key', 10);
            $table->unsignedTinyInteger('tier');
            $table->unsignedSmallInteger('members')->default(0);
            $table->dateTime('created_at');

            $table->index(['season', 'week_key', 'tier']);
        });

        Schema::create('league_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_id')->constrained('league_groups')->cascadeOnDelete();
            $table->foreignUlid('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('season');
            $table->string('week_key', 10);
            $table->unsignedTinyInteger('tier');
            $table->dateTime('joined_at', 3);
            $table->unsignedSmallInteger('final_rank')->nullable();
            $table->string('outcome', 10)->nullable();
            $table->dateTime('settled_at')->nullable();

            $table->unique(['user_id', 'season', 'week_key']);
            $table->index('group_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('league_members');
        Schema::dropIfExists('league_groups');
    }
};
