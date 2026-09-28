<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The phones a player's pushes go to: each one's Firebase Cloud Messaging
     * token. A token belongs to one account at a time — a phone that signs in
     * to another account takes its token along (`PUT /me/push-token`) — and a
     * token Firebase no longer knows is dropped the first time it says so.
     */
    public function up(): void
    {
        Schema::create('push_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('user_id')->constrained('users')->cascadeOnDelete();
            $token = $table->string('token', 255)->unique();
            // Tokens are plain ASCII: MySQL then keeps the unique index small.
            if (Schema::getConnection()->getDriverName() === 'mysql') {
                $token->charset('ascii')->collation('ascii_bin');
            }
            $table->string('platform', 8);
            $table->string('app_version', 32)->nullable();
            $table->timestamps(3);

            $table->index(['user_id', 'updated_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_tokens');
    }
};
