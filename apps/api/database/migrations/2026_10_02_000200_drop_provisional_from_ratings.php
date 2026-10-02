<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A run moves a rating by its score as a share of its target — the same
     * share, the same move, from the first run after placement on. There is
     * no provisional stretch of bigger moves any more, and no width a run is
     * measured with.
     */
    public function up(): void
    {
        if (Schema::hasColumn('player_ratings', 'provisional_left')) {
            Schema::table('player_ratings', function (Blueprint $table) {
                $table->dropColumn('provisional_left');
            });
        }
        if (Schema::hasColumn('rating_changes', 'width')) {
            Schema::table('rating_changes', function (Blueprint $table) {
                $table->dropColumn('width');
            });
        }
    }

    public function down(): void
    {
        Schema::table('player_ratings', function (Blueprint $table) {
            $table->unsignedTinyInteger('provisional_left')->default(0);
        });
        Schema::table('rating_changes', function (Blueprint $table) {
            $table->unsignedSmallInteger('width')->nullable();
        });
    }
};
