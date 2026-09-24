<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Who follows whom — the friends a player's boards can be narrowed to. */
    public function up(): void
    {
        Schema::create('follows', function (Blueprint $table) {
            $table->foreignUlid('follower_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUlid('followee_id')->constrained('users')->cascadeOnDelete();
            $table->dateTime('created_at');

            $table->primary(['follower_id', 'followee_id']);
            $table->index('followee_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('follows');
    }
};
