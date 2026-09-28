<?php

namespace App\Services\Social;

use App\Enums\MessageKind;
use App\Enums\Phrase;
use App\Models\Duel;
use App\Models\Message;
use App\Models\User;
use App\Services\Push\PushService;
use App\Support\Timestamp;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Writes the lines between two friends. A line moves their conversation to
 * the top of both friends' lists and is read on the sender's side at once;
 * the other friend has it unread until they open the conversation. Only
 * friends have a conversation: between anyone else nothing is written. A
 * line moves both players' `InboxStamp`.
 */
final class Messenger
{
    public function __construct(
        private readonly PushService $push,
        private readonly InboxStamp $stamp,
    ) {}

    public function say(User $from, User $to, MessageKind $kind, ?Phrase $phrase = null, ?Duel $duel = null): ?Message
    {
        $message = DB::transaction(function () use ($from, $to, $kind, $phrase, $duel) {
            $side = DB::table('friendships')->where('user_id', $from->id)->where('friend_id', $to->id);
            if (! $side->exists()) {
                return null;
            }

            $now = now();
            $message = Message::query()->create([
                'sender_id' => $from->id,
                'recipient_id' => $to->id,
                'kind' => $kind,
                'phrase' => $phrase,
                'duel_id' => $duel?->id,
                'created_at' => $now,
            ]);
            DB::table('friendships')
                ->where(fn (Builder $query) => $query
                    ->where(fn (Builder $query) => $query->where('user_id', $from->id)->where('friend_id', $to->id))
                    ->orWhere(fn (Builder $query) => $query->where('user_id', $to->id)->where('friend_id', $from->id)))
                ->update(['last_activity_at' => $now->format(Timestamp::STORAGE_FORMAT), 'last_message_id' => $message->id]);
            $side->update(['last_read_message_id' => $message->id]);
            $this->stamp->bump($from, $to);

            return $message;
        });

        if ($message !== null) {
            $this->push->aboutMessage($message, $from, $to);
        }

        return $message;
    }

    /** Every line between two players — when their friendship ends. Returns how many went. */
    public function forget(User $a, User $b): int
    {
        return (int) Message::query()
            ->where(fn ($query) => $query->where('sender_id', $a->id)->where('recipient_id', $b->id))
            ->orWhere(fn ($query) => $query->where('sender_id', $b->id)->where('recipient_id', $a->id))
            ->delete();
    }
}
