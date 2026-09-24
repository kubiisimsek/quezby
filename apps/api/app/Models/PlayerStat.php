<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A player's lifetime numbers, added up from the server's replays of their
 * ranked runs — never from anything the app reported.
 *
 * @property string $user_id
 * @property int $runs
 * @property int $reels
 * @property int $swipes
 * @property int $likes
 * @property int $holds
 * @property int $perfects
 * @property int $freezes
 * @property int $caught
 * @property int $misses
 * @property int $active_ms
 * @property int|null $best_reaction_ms
 * @property int $max_combo
 * @property int $flawless
 * @property int $lightning
 * @property int $cool_head
 * @property int $comeback
 */
class PlayerStat extends Model
{
    protected $primaryKey = 'user_id';

    protected $keyType = 'string';

    public $incrementing = false;

    public const CREATED_AT = null;

    /** @var list<string> */
    protected $guarded = [];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'runs' => 'integer', 'reels' => 'integer', 'swipes' => 'integer', 'likes' => 'integer',
            'holds' => 'integer', 'perfects' => 'integer', 'freezes' => 'integer', 'caught' => 'integer',
            'misses' => 'integer', 'active_ms' => 'integer', 'best_reaction_ms' => 'integer',
            'max_combo' => 'integer', 'flawless' => 'integer', 'lightning' => 'integer',
            'cool_head' => 'integer', 'comeback' => 'integer',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
