<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Device integrity: the one-time challenges a phone proves itself against,
     * the verdicts Play Integrity and App Attest gave, and the App Attest keys
     * the API has seen attested.
     */
    public function up(): void
    {
        Schema::create('device_challenges', function (Blueprint $table) {
            // SHA-256 of the challenge, hex: the challenge itself is never stored.
            $table->string('hash', 64)->primary();
            $table->foreignUlid('user_id')->constrained()->cascadeOnDelete();
            $table->dateTime('expires_at')->index();
            $table->dateTime('used_at')->nullable();
            $table->dateTime('created_at');
        });

        Schema::create('device_checks', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('user_id')->constrained()->cascadeOnDelete();
            $table->string('platform', 16);
            // `pass` or `fail`; an `unavailable` check is never stored.
            $table->string('verdict', 8);
            // Why a check failed, as a short code.
            $table->string('reason', 32)->nullable();
            // What the proof said, trimmed — for support and moderation.
            $table->json('details')->nullable();
            $table->dateTime('checked_at', 3);
            $table->dateTime('expires_at', 3);

            $table->index(['user_id', 'checked_at']);
        });

        Schema::create('app_attest_keys', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('user_id')->constrained()->cascadeOnDelete();
            // Base64 of the key's 32-byte id, as App Attest names it.
            $table->string('key_id', 64)->unique();
            // The attested key, PEM: every assertion is checked against it.
            $table->text('public_key');
            // The authenticator's counter at the last assertion; only ever goes up.
            $table->unsignedInteger('counter')->default(0);
            $table->string('environment', 16);
            // Apple's receipt of the attestation, base64 — kept for fraud metrics.
            $table->mediumText('receipt')->nullable();
            $table->dateTime('attested_at');
            $table->dateTime('last_used_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_attest_keys');
        Schema::dropIfExists('device_checks');
        Schema::dropIfExists('device_challenges');
    }
};
