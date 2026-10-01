<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The panel's Loglar page: what went wrong — and what a push did — where
     * staff can read it without SSH. A failed call to Firebase, Google or
     * Apple, every API error but a 401 or a 404, every push decision, and the
     * errors a phone sends in (`POST /me/logs`). Kept `quezby.logs.keep_days`;
     * a deleted player's rows go with the account. The player is an id, not a
     * key, so a row never blocks a deletion.
     */
    public function up(): void
    {
        Schema::create('system_logs', function (Blueprint $table) {
            $table->id();
            // error, warning or info — `LogLevel`.
            $table->string('level', 8);
            // api, external, push or app — `LogSource`.
            $table->string('source', 8);
            // `validation_failed`, `firebase`, `push.sent`, `push.token`…
            $table->string('event', 48);
            $table->string('message', 500);
            $table->unsignedSmallInteger('status')->nullable();
            $table->string('method', 8)->nullable();
            // The API path, or the host and path of an outside call — never a query string.
            $table->string('path', 191)->nullable();
            $table->unsignedInteger('duration_ms')->nullable();
            // The player the row is about: who asked, or whom a push was for.
            $table->ulid('user_id')->nullable();
            $table->string('platform', 8)->nullable();
            $table->string('app_version', 32)->nullable();
            $table->json('context')->nullable();
            $table->dateTime('created_at', 3);

            $table->index('created_at');
            $table->index(['source', 'created_at']);
            $table->index(['level', 'created_at']);
            $table->index(['user_id', 'created_at']);
            $table->index('event');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_logs');
    }
};
