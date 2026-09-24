<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A player's best now lives on the season's all-time board row, so a
     * rules change can never compare a new score with an old one. Bans are
     * silent: a banned player keeps playing, nothing of theirs ranks.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dateTime('banned_at')->nullable()->after('settings');
            $table->string('ban_reason', 191)->nullable()->after('banned_at');
            $table->dropColumn(['best_score', 'best_reels', 'best_achieved_at']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('best_score')->nullable();
            $table->unsignedInteger('best_reels')->nullable();
            $table->dateTime('best_achieved_at')->nullable();
            $table->dropColumn(['banned_at', 'ban_reason']);
        });
    }
};
