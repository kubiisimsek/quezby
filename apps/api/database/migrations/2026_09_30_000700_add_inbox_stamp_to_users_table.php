<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The number a phone polls to learn that its inbox changed
     * (`GET /me/pulse`, `InboxStamp`): it goes up with every request,
     * friendship, line and VS of the player's.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('inbox_stamp')->default(0)->after('avatar');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('inbox_stamp');
        });
    }
};
