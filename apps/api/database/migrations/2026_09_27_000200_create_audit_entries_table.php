<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The audit log: every moderation and admin action, whether it came from
     * the panel, `php artisan` or the ops routes. Append-only; a row outlives
     * the player it names, so the subject is an id and a label, not a key.
     */
    public function up(): void
    {
        Schema::create('audit_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('admin_id')->nullable()->constrained('admins')->nullOnDelete();
            // Who acted, as they were called then: an admin's name, "Komut satırı", "Ops".
            $table->string('actor_label', 64);
            // panel, cli, ops or system — `AuditVia`.
            $table->string('via', 8);
            // `player.ban`, `run.reject`… — `AuditAction`.
            $table->string('action', 48);
            // player, run, admin or system.
            $table->string('subject_type', 16);
            $table->string('subject_id', 26)->nullable();
            // The player's name at the time, or the admin's.
            $table->string('subject_label', 64)->nullable();
            $table->string('reason', 191)->nullable();
            $table->json('details')->nullable();
            $table->string('ip', 45)->nullable();
            $table->dateTime('created_at', 3);

            $table->index('created_at');
            $table->index(['subject_type', 'subject_id']);
            $table->index(['admin_id', 'created_at']);
            $table->index('action');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_entries');
    }
};
