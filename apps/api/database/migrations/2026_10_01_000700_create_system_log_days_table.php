<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The Loglar page's long memory: how many rows of each source, event and
     * level a day held (Istanbul days) — counted as they are written, kept
     * for good while `system_logs` keeps the rows themselves for days or
     * months. A few dozen rows a day, however busy the game.
     */
    public function up(): void
    {
        Schema::create('system_log_days', function (Blueprint $table) {
            $table->id();
            $table->date('day');
            $table->string('source', 8);
            $table->string('event', 48);
            $table->string('level', 8);
            $table->unsignedInteger('total');

            $table->unique(['day', 'source', 'event', 'level']);
            $table->index(['source', 'day']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_log_days');
    }
};
