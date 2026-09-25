<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * `,wall_clock,reaction_cv,`: the codes in a run's `flags`, so the admin
     * panel can find the runs with one — `LIKE '%,code,%'`, the same in
     * SQLite, MySQL and MariaDB, with no JSON functions. `Run` keeps it in
     * step with `flags`. And indexes on `started_at` and `finished_at`,
     * which every admin list, count and date filter reaches runs by.
     */
    public function up(): void
    {
        Schema::table('runs', function (Blueprint $table) {
            $table->string('flag_codes', 400)->nullable()->after('flags');
            $table->index('started_at');
            $table->index('finished_at');
        });

        DB::table('runs')->whereNotNull('flags')->orderBy('id')->chunkById(500, function ($runs) {
            foreach ($runs as $run) {
                DB::table('runs')->where('id', $run->id)->update(['flag_codes' => $this->codesOf($run->flags)]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('runs', function (Blueprint $table) {
            $table->dropIndex(['started_at']);
            $table->dropIndex(['finished_at']);
            $table->dropColumn('flag_codes');
        });
    }

    /** The migration's own copy of `RunFlag::codesOf`, so it runs the same whatever that becomes. */
    private function codesOf(mixed $flags): ?string
    {
        $flags = is_string($flags) ? json_decode($flags, true) : $flags;
        $codes = [];
        foreach (is_array($flags) ? $flags : [] as $flag) {
            $code = is_array($flag) ? ($flag['code'] ?? null) : null;
            if (is_string($code) && $code !== '') {
                $codes[$code] = true;
            }
        }

        return $codes === [] ? null : ','.implode(',', array_keys($codes)).',';
    }
};
