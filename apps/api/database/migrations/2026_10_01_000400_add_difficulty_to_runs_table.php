<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Dereceli's difficulty (`App\Game\Difficulty`): the one a run was handed
     * with its seed and is replayed at — 0 for every run but a rated one —
     * and, on a rated run, the version of the difficulty table it was played
     * on, which picks its Elo targets. Rated runs from before the table have
     * none and keep the engine's own targets.
     */
    public function up(): void
    {
        Schema::table('runs', function (Blueprint $table) {
            $table->unsignedTinyInteger('difficulty')->default(0)->after('content_version');
            $table->unsignedTinyInteger('difficulty_version')->nullable()->after('difficulty');
        });
    }

    public function down(): void
    {
        Schema::table('runs', function (Blueprint $table) {
            $table->dropColumn(['difficulty', 'difficulty_version']);
        });
    }
};
