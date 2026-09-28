<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The inbox: what passed between two friends — the game's own lines
     * ("friends now", a VS sent, its result) and phrases from a fixed list.
     * Never a typed word. A line is one row, from its sender to the other
     * friend; each friend reads the conversation from their side
     * (`friendships.last_read_message_id`). Old lines are pruned.
     */
    public function up(): void
    {
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('sender_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUlid('recipient_id')->constrained('users')->cascadeOnDelete();
            $table->string('kind', 16);
            $table->string('phrase', 16)->nullable();
            $table->foreignUlid('duel_id')->nullable()->constrained('duels')->cascadeOnDelete();
            $table->dateTime('created_at', 3);

            $table->index(['recipient_id', 'sender_id', 'id']);
            $table->index(['sender_id', 'recipient_id', 'id']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
