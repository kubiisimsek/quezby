<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The staff who sign in to the admin panel. Never players: an admin's
     * token opens no player route, a player's no admin route. ULIDs, because
     * `personal_access_tokens` points at its owners with `ulidMorphs`.
     */
    public function up(): void
    {
        Schema::create('admins', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('name', 64);
            $table->string('email', 191)->unique();
            $table->string('password');
            // owner, moderator or viewer — `AdminRole`.
            $table->string('role', 16);
            // A new account or a reset password: nothing opens until it changes.
            $table->boolean('must_change_password')->default(true);
            $table->dateTime('last_login_at')->nullable();
            $table->dateTime('disabled_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admins');
    }
};
