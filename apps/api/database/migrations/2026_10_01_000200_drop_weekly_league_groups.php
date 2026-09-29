<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The league is the rating's tier, ranked by Elo and never reset: the
     * weekly groups, their settled weeks and their Elo bonuses are gone, and
     * so are the day rows the boards kept only to add up group points.
     */
    public function up(): void
    {
        if (Schema::hasColumn('rating_changes', 'league_member_id')) {
            DB::table('rating_changes')->where('kind', 'bonus')->delete();
            Schema::table('rating_changes', function (Blueprint $table) {
                $table->dropForeign(['league_member_id']);
                $table->dropUnique(['league_member_id']);
                $table->dropColumn('league_member_id');
            });
        }
        Schema::dropIfExists('league_members');
        Schema::dropIfExists('league_groups');
        DB::table('leaderboard_entries')->where('period', 'daily')->delete();
    }

    /** The groups' weeks are gone for good; nothing comes back. */
    public function down(): void {}
};
