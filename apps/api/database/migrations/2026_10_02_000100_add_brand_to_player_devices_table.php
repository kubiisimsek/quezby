<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The phone's maker (`brand=` in `X-Device`, the system's manufacturer:
     * `Apple`, `Samsung`, `Xiaomi`), so the panel can tell an iPhone from a
     * Samsung — an Android model alone is a code like `SM-S918B`. Null on the
     * phones of an app too old to send it; the next day it is seen fills it.
     */
    public function up(): void
    {
        Schema::table('player_devices', function (Blueprint $table) {
            $table->string('brand', 32)->nullable()->after('os_version');
        });
    }

    public function down(): void
    {
        Schema::table('player_devices', function (Blueprint $table) {
            $table->dropColumn('brand');
        });
    }
};
