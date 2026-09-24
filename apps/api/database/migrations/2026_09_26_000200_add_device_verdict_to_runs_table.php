<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The player's device verdict when the run started — `pass`, `fail`, or
     * null when there was none standing (or devices were not checked).
     */
    public function up(): void
    {
        Schema::table('runs', function (Blueprint $table) {
            $table->string('device_verdict', 8)->nullable()->after('app_version');
        });
    }

    public function down(): void
    {
        Schema::table('runs', function (Blueprint $table) {
            $table->dropColumn('device_verdict');
        });
    }
};
