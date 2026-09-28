<?php

use App\Services\Social\FollowsToFriends;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Friends instead of follows. A friendship is two rows, one per side, so
     * each side keeps its own place in the conversation between them
     * (`last_read_message_id`); a request waits until the other player answers
     * it; a block keeps two players apart until the one who blocked lifts it.
     * The follows there were become friends or requests (`FollowsToFriends`).
     */
    public function up(): void
    {
        Schema::create('friendships', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUlid('friend_id')->constrained('users')->cascadeOnDelete();
            $table->dateTime('created_at', 3);
            // The last message or friendship moment between the two — the same on both rows.
            $table->dateTime('last_activity_at', 3);
            $table->unsignedBigInteger('last_message_id')->nullable();
            // How far this row's player has read the conversation.
            $table->unsignedBigInteger('last_read_message_id')->nullable();

            $table->unique(['user_id', 'friend_id']);
            $table->index(['user_id', 'last_activity_at']);
            $table->index('friend_id');
        });

        Schema::create('friend_requests', function (Blueprint $table) {
            $table->foreignUlid('sender_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUlid('recipient_id')->constrained('users')->cascadeOnDelete();
            $table->dateTime('created_at', 3);

            $table->primary(['sender_id', 'recipient_id']);
            $table->index(['recipient_id', 'created_at']);
        });

        Schema::create('blocks', function (Blueprint $table) {
            $table->foreignUlid('blocker_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUlid('blocked_id')->constrained('users')->cascadeOnDelete();
            $table->dateTime('created_at', 3);

            $table->primary(['blocker_id', 'blocked_id']);
            $table->index('blocked_id');
        });

        if (Schema::hasTable('follows')) {
            FollowsToFriends::convert();
            Schema::drop('follows');
        }
    }

    public function down(): void
    {
        Schema::create('follows', function (Blueprint $table) {
            $table->foreignUlid('follower_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUlid('followee_id')->constrained('users')->cascadeOnDelete();
            $table->dateTime('created_at');

            $table->primary(['follower_id', 'followee_id']);
            $table->index('followee_id');
        });

        DB::table('follows')->insertUsing(
            ['follower_id', 'followee_id', 'created_at'],
            DB::table('friendships')->select(['user_id', 'friend_id', 'created_at']),
        );
        DB::table('follows')->insertOrIgnore(
            DB::table('friend_requests')->get(['sender_id', 'recipient_id', 'created_at'])
                ->map(fn (object $row) => ['follower_id' => $row->sender_id, 'followee_id' => $row->recipient_id, 'created_at' => $row->created_at])
                ->all(),
        );

        Schema::dropIfExists('blocks');
        Schema::dropIfExists('friend_requests');
        Schema::dropIfExists('friendships');
    }
};
