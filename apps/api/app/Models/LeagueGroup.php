<?php

namespace App\Models;

use App\Enums\LeagueTier;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Up to 30 players of one tier competing for one ISO week.
 *
 * @property int $id
 * @property int $season
 * @property string $week_key
 * @property LeagueTier $tier
 * @property int $members
 * @property Carbon $created_at
 */
class LeagueGroup extends Model
{
    public const UPDATED_AT = null;

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
            'members' => 'integer',
        ];
    }

    /** @return HasMany<LeagueMember, $this> */
    public function memberships(): HasMany
    {
        return $this->hasMany(LeagueMember::class, 'group_id');
    }
}
