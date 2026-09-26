<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The device registry: every phone a player used, one row each — its
     * install, system, model and app build, and when it was first and last
     * seen. Kept for every player, consent or not, for support and security;
     * no IP, nothing about how the game is played. Written at most once a
     * day per phone (`App\Services\Analytics\Presence`).
     */
    public function up(): void
    {
        Schema::create('player_devices', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('user_id')->constrained()->cascadeOnDelete();
            // The random id the install minted on its first launch; never null,
            // or the unique index below would let a row in every day.
            $table->string('install_id', 100);
            $table->string('platform', 8)->nullable();
            $table->string('os_version', 32)->nullable();
            $table->string('model', 64)->nullable();
            $table->string('app_version', 32)->nullable();
            $table->string('app_build', 16)->nullable();
            $table->dateTime('first_seen_at');
            $table->dateTime('last_seen_at');

            $table->unique(['user_id', 'install_id']);
            $table->index('install_id');
            $table->index('last_seen_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('player_devices');
    }
};
