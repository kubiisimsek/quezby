<?php

namespace App\Models;

use App\Enums\LeaderboardPeriod;
use App\Support\Timestamp;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A player's best ranked run on one board of one season:
 * `(season, period, period_key, user_id)`.
 *
 * @property int $id
 * @property int $season
 * @property LeaderboardPeriod $period
 * @property string $period_key
 * @property string $user_id
 * @property string|null $run_id
 * @property int $score
 * @property int $reels
 * @property Carbon $achieved_at
 * @property string|null $username Joined from `users` when listing a board.
 */
#[Fillable(['season', 'period', 'period_key', 'user_id', 'run_id', 'score', 'reels', 'achieved_at'])]
class LeaderboardEntry extends Model
{
    protected $dateFormat = Timestamp::STORAGE_FORMAT;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'season' => 'integer',
            'period' => LeaderboardPeriod::class,
            'score' => 'integer',
            'reels' => 'integer',
            'achieved_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
