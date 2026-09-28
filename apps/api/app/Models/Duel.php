<?php

namespace App\Models;

use App\Enums\DuelStatus;
use App\Support\Timestamp;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A VS between two friends (`DuelService`).
 *
 * @property string $id
 * @property string $challenger_id
 * @property string $opponent_id
 * @property int $seed
 * @property int $engine_version
 * @property int $content_version
 * @property DuelStatus $status
 * @property string|null $challenger_run_id
 * @property string|null $opponent_run_id
 * @property int|null $challenger_score
 * @property int|null $opponent_score
 * @property bool|null $challenger_valid
 * @property bool|null $opponent_valid
 * @property string|null $winner_id
 * @property string|null $open_pair
 * @property Carbon|null $sent_at
 * @property Carbon|null $expires_at
 * @property Carbon|null $finished_at
 * @property Carbon $created_at
 */
#[Fillable([
    'challenger_id', 'opponent_id', 'seed', 'engine_version', 'content_version', 'status',
    'challenger_run_id', 'opponent_run_id', 'challenger_score', 'opponent_score',
    'challenger_valid', 'opponent_valid', 'winner_id', 'open_pair', 'sent_at', 'expires_at', 'finished_at',
])]
class Duel extends Model
{
    use HasUlids;

    protected $dateFormat = Timestamp::STORAGE_FORMAT;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'seed' => 'integer',
            'engine_version' => 'integer',
            'content_version' => 'integer',
            'status' => DuelStatus::class,
            'challenger_score' => 'integer',
            'opponent_score' => 'integer',
            'challenger_valid' => 'boolean',
            'opponent_valid' => 'boolean',
            'sent_at' => 'datetime',
            'expires_at' => 'datetime',
            'finished_at' => 'datetime',
        ];
    }

    /** "lower id:higher id" — the two players, whichever way round. */
    public static function pairOf(string $a, string $b): string
    {
        return strcmp($a, $b) < 0 ? "{$a}:{$b}" : "{$b}:{$a}";
    }

    /** @return BelongsTo<User, $this> */
    public function challenger(): BelongsTo
    {
        return $this->belongsTo(User::class, 'challenger_id');
    }

    /** @return BelongsTo<User, $this> */
    public function opponent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opponent_id');
    }

    public function involves(User $user): bool
    {
        return $this->challenger_id === $user->id || $this->opponent_id === $user->id;
    }

    /** The other player of the two, seen from `$user`. */
    public function otherOf(User $user): string
    {
        return $this->challenger_id === $user->id ? $this->opponent_id : $this->challenger_id;
    }
}
