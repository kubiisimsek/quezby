<?php

namespace App\Models;

use App\Enums\LeagueTier;
use App\Enums\RatingKind;
use App\Support\Timestamp;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One move of a player's rating, and why. At most one per run
 * (`run_id` is unique) and one reversal per change.
 *
 * @property int $id
 * @property string $user_id
 * @property string|null $run_id
 * @property int|null $reversal_of
 * @property RatingKind $kind
 * @property int|null $score
 * @property int|null $target The score the run had to reach, as the player saw it.
 * @property int|null $performance The rating whose typical score the run's was.
 * @property int|null $before
 * @property int|null $after
 * @property int $delta
 * @property LeagueTier|null $tier_before
 * @property LeagueTier|null $tier_after
 * @property bool $shielded
 * @property int|null $engine_version
 * @property Carbon $created_at
 */
class RatingChange extends Model
{
    public const UPDATED_AT = null;

    protected $dateFormat = Timestamp::STORAGE_FORMAT;

    /** @var list<string> */
    protected $guarded = [];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'kind' => RatingKind::class,
            'score' => 'integer',
            'target' => 'integer',
            'performance' => 'integer',
            'before' => 'integer',
            'after' => 'integer',
            'delta' => 'integer',
            'tier_before' => LeagueTier::class,
            'tier_after' => LeagueTier::class,
            'shielded' => 'boolean',
            'engine_version' => 'integer',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Run, $this> */
    public function run(): BelongsTo
    {
        return $this->belongsTo(Run::class);
    }
}
