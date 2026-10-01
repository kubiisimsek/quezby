<?php

namespace App\Models;

use App\Support\Timestamp;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * A push an owner sent from the panel to the players a filter picked
 * (`PushCampaigns`): its words in each language, the language for the rest,
 * the filter, and how far it got.
 *
 * @property int $id
 * @property string|null $admin_id
 * @property string $admin_name
 * @property array<string, array{title: string, body: string}> $messages
 * @property string $fallback
 * @property array<string, mixed> $filters
 * @property string $status
 * @property int $players
 * @property int $devices
 * @property int $cursor
 * @property int $sent
 * @property int $failed
 * @property int $dropped
 * @property array<string, int>|null $errors
 * @property Carbon|null $finished_at
 * @property Carbon $created_at
 */
#[Fillable(['admin_id', 'admin_name', 'messages', 'fallback', 'filters', 'status', 'players', 'devices', 'cursor', 'sent', 'failed', 'dropped', 'errors', 'finished_at'])]
class PushCampaign extends Model
{
    public const SENDING = 'sending';

    public const DONE = 'done';

    public const STOPPED = 'stopped';

    protected $dateFormat = Timestamp::STORAGE_FORMAT;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'messages' => 'array',
            'filters' => 'array',
            'errors' => 'array',
            'finished_at' => 'datetime',
        ];
    }
}
