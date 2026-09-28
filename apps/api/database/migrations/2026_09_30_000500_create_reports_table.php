<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * What players reported about another: a photo or a username — the only
     * things a player makes that others see. `subject` is the photo's file
     * or the name as it was, so a new photo or a new name starts afresh. A
     * report stays `open` until a moderator removes what it was about
     * (`resolved`) or lets it be (`dismissed`).
     */
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('reporter_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUlid('reported_id')->constrained('users')->cascadeOnDelete();
            $table->string('reason', 8);
            $table->string('subject', 64);
            $table->string('status', 12)->default('open');
            $table->foreignUlid('resolved_by')->nullable()->constrained('admins')->nullOnDelete();
            $table->dateTime('resolved_at', 3)->nullable();
            $table->dateTime('created_at', 3);

            $table->unique(['reporter_id', 'reported_id', 'reason', 'subject']);
            $table->index(['status', 'reported_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};
