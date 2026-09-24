<?php

namespace App\Models;

use App\Enums\LeagueOutcome;
use App\Enums\LeagueTier;
use App\Support\Timestamp;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A player's seat in one week's group. `final_rank` and `outcome` are filled
 * when the week is settled — lazily, the next time the player plays.
 *
 * @property int $id
 * @property int $group_id
 * @property string $user_id
 * @property int $season
 * @property string $week_key
 * @property LeagueTier $tier
 * @property Carbon $joined_at
 * @property int|null $final_rank
 * @property LeagueOutcome|null $outcome
 * @property Carbon|null $settled_at
 */
class LeagueMember extends Model
{
    public $timestamps = false;

    protected $dateFormat = Timestamp::STORAGE_FORMAT;

    /** @var list<string> */
    protected $guarded = [];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'season' => 'integer',
            'tier' => LeagueTier::class,
            'joined_at' => 'datetime',
            'final_rank' => 'integer',
            'outcome' => LeagueOutcome::class,
            'settled_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<LeagueGroup, $this> */
    public function group(): BelongsTo
    {
        return $this->belongsTo(LeagueGroup::class, 'group_id');
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
