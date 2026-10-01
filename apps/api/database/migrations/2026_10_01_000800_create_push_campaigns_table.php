<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Pushes an owner sends from the panel's Push bildirimi page to the
     * players a filter picks, in each player's language. One goes out a batch of phones at a time
     * (`cursor`: the last `push_tokens.id` done), driven by the open panel
     * page or `php artisan quezby:push-campaigns` from cron, so no request
     * runs long on shared hosting; the counts say how far it got.
     */
    public function up(): void
    {
        Schema::create('push_campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->string('admin_name', 64);
            // The words, by language: `{ "tr": { "title", "body" }, "en": … }`.
            // Each player gets their account's language; one without it gets `fallback`.
            $table->json('messages');
            $table->string('fallback', 2);
            $table->json('filters');
            // sending, done or stopped.
            $table->string('status', 8);
            // The players and phones the filter found when it was sent.
            $table->unsignedInteger('players');
            $table->unsignedInteger('devices');
            $table->unsignedBigInteger('cursor')->default(0);
            $table->unsignedInteger('sent')->default(0);
            $table->unsignedInteger('failed')->default(0);
            $table->unsignedInteger('dropped')->default(0);
            // What Firebase said, and how often: `{ "UNAUTHENTICATED · THIRD_PARTY_AUTH_ERROR": 3 }`.
            $table->json('errors')->nullable();
            $table->dateTime('finished_at', 3)->nullable();
            $table->timestamps(3);

            $table->index(['status', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_campaigns');
    }
};
