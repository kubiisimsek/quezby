<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The six-digit codes emailed to prove an address (`EmailCodes`): a new
     * account's email before the account exists (`signup`, holding its
     * password until then), an email a player attaches (`link`), and a
     * password reset (`reset`). Only the code's HMAC is kept; a row goes once
     * its code is used, used up by wrong tries, or a day past its expiry.
     */
    public function up(): void
    {
        Schema::create('email_codes', function (Blueprint $table) {
            $table->id();
            $table->string('purpose', 8);
            $table->string('email', 191);
            $table->foreignUlid('user_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->string('password')->nullable();
            $table->string('code', 64);
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->string('locale', 2);
            $table->string('platform', 8)->nullable();
            $table->string('install_id', 100)->nullable();
            // dateTime, never a NOT NULL timestamp: MySQL without explicit_defaults_for_timestamp
            // gives the second one a zero default, which strict mode refuses (1067).
            $table->dateTime('sent_at', 3);
            $table->dateTime('expires_at', 3)->index();
            $table->timestamps(3);

            $table->index(['purpose', 'email']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_codes');
    }
};
