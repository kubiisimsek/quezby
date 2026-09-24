<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Apple and Google accounts attached to a player. One provider account
     * belongs to one player; a player has at most one of each provider.
     */
    public function up(): void
    {
        Schema::create('social_identities', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('user_id')->constrained()->cascadeOnDelete();
            $table->string('provider', 16);
            $table->string('subject', 191);
            $table->string('email', 191)->nullable();
            $table->boolean('email_verified')->default(false);
            $table->text('apple_refresh_token')->nullable();
            $table->dateTime('last_used_at')->nullable();
            $table->timestamps();

            $table->unique(['provider', 'subject']);
            $table->unique(['user_id', 'provider']);
        });

        Schema::create('auth_nonces', function (Blueprint $table) {
            $table->string('nonce', 64)->primary();
            $table->dateTime('expires_at')->index();
            $table->dateTime('used_at')->nullable();
            $table->dateTime('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auth_nonces');
        Schema::dropIfExists('social_identities');
    }
};
