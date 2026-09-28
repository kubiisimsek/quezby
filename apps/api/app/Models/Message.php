<?php

namespace App\Models;

use App\Enums\MessageKind;
use App\Enums\Phrase;
use App\Support\Timestamp;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A line between two friends (`Messenger`, `InboxService`).
 *
 * @property int $id
 * @property string $sender_id
 * @property string $recipient_id
 * @property MessageKind $kind
 * @property Phrase|null $phrase
 * @property string|null $duel_id
 * @property Carbon $created_at
 */
#[Fillable(['sender_id', 'recipient_id', 'kind', 'phrase', 'duel_id', 'created_at'])]
class Message extends Model
{
    public const UPDATED_AT = null;

    protected $dateFormat = Timestamp::STORAGE_FORMAT;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'kind' => MessageKind::class,
            'phrase' => Phrase::class,
            'created_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Duel, $this> */
    public function duel(): BelongsTo
    {
        return $this->belongsTo(Duel::class);
    }
}
