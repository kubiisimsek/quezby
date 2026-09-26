<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The language the player plays in (`App\Enums\Locale`): the request's
     * when the account is made, then whatever the phone last set
     * (`PUT /me/locale`). Accounts from before the game spoke six languages
     * played in Turkish, so that is the default.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('locale', 8)->default('tr')->after('platform');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('locale');
        });
    }
};
