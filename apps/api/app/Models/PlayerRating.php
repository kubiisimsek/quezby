<?php

namespace App\Models;

use App\Enums\LeagueTier;
use App\Support\Timestamp;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A player's Elo — written only by `RatingService`, under a lock on this row.
 * `rating` is null until the placement runs are played; their scores wait in
 * `placement_scores`.
 *
 * @property string $user_id
 * @property int|null $rating
 * @property LeagueTier|null $tier
 * @property int|null $peak
 * @property list<int>|null $placement_scores
 * @property int $rated_runs
 * @property int $provisional_left Runs still moved at the provisional width.
 * @property LeagueTier|null $shield_tier The tier a fresh promotion keeps the player in…
 * @property int $shield_left …for this many more runs.
 * @property Carbon|null $rated_at The last run that counted.
 * @property Carbon|null $changed_at When the rating last moved: of two equal ratings, the one reached first ranks higher.
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
class PlayerRating extends Model
{
    protected $primaryKey = 'user_id';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $dateFormat = Timestamp::STORAGE_FORMAT;

    /** @var list<string> */
    protected $guarded = [];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'tier' => LeagueTier::class,
            'peak' => 'integer',
            'placement_scores' => 'array',
            'rated_runs' => 'integer',
            'provisional_left' => 'integer',
            'shield_tier' => LeagueTier::class,
            'shield_left' => 'integer',
            'rated_at' => 'datetime',
            'changed_at' => 'datetime',
        ];
    }

    public function isPlaced(): bool
    {
        return $this->rating !== null;
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
