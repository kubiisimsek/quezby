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
        Schema::create('users', function (Blueprint $table) {
            $table->ulid('id')->primary();
            // Lower case, so the unique index is the case-insensitive rule.
            $table->string('username', 32)->nullable()->unique();
            $table->string('email', 191)->nullable()->unique();
            $table->string('password')->nullable();
            $table->string('install_id', 100)->nullable()->index();
            $table->string('platform', 16)->nullable();
            // `{"haptics":true}` by default — set by the model, since MySQL cannot default a JSON column.
            $table->json('settings');
            $table->unsignedBigInteger('best_score')->nullable();
            $table->unsignedInteger('best_reels')->nullable();
            $table->dateTime('best_achieved_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
