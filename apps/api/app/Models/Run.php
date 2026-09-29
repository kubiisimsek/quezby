<?php

namespace App\Models;

use App\Enums\DeviceVerdict;
use App\Enums\RunFlag;
use App\Enums\RunMode;
use App\Enums\RunStatus;
use App\Game\EndReason;
use App\Support\Timestamp;
use Carbon\CarbonInterface;
use Database\Factories\RunFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A ranked attempt: started with a server seed, finished with the player's
 * action log, which the API replays with its own engine.
 *
 * @property string $id
 * @property string $user_id
 * @property int $seed
 * @property int $engine_version
 * @property int $content_version
 * @property int $difficulty
 * @property int|null $difficulty_version
 * @property string|null $app_version
 * @property DeviceVerdict|null $device_verdict
 * @property RunStatus $status
 * @property RunMode $mode
 * @property string|null $daily_key
 * @property string|null $duel_id
 * @property string|null $open_user_id
 * @property Carbon $started_at
 * @property Carbon|null $finished_at
 * @property int|null $score
 * @property int|null $reels
 * @property int|null $hits
 * @property int|null $misses
 * @property int|null $perfects
 * @property int|null $max_streak
 * @property int|null $max_combo
 * @property int|null $bonus_points
 * @property int|null $level
 * @property int|null $accuracy
 * @property int|null $avg_reaction_ms
 * @property int|null $active_ms
 * @property EndReason|null $ended_by
 * @property int|null $client_score
 * @property int|null $client_reels
 * @property list<array<string, mixed>>|null $flags
 * @property string|null $flag_codes
 * @property array<string, mixed>|null $stats
 * @property array<mixed>|null $actions
 */
#[Fillable([
    'seed', 'engine_version', 'content_version', 'difficulty', 'difficulty_version', 'app_version', 'device_verdict', 'status', 'mode', 'daily_key', 'duel_id', 'open_user_id',
    'started_at', 'finished_at',
    'score', 'reels', 'hits', 'misses', 'perfects', 'max_streak', 'max_combo', 'bonus_points', 'level',
    'accuracy', 'avg_reaction_ms', 'active_ms', 'ended_by',
    'client_score', 'client_reels', 'flags', 'stats', 'actions',
])]
class Run extends Model
{
    /** @use HasFactory<RunFactory> */
    use HasFactory, HasUlids;

    /** Every column but the action log and the replay's stats: what a list of runs needs. */
    public const LIST_COLUMNS = [
        'id', 'user_id', 'seed', 'engine_version', 'content_version', 'difficulty', 'difficulty_version', 'app_version', 'device_verdict',
        'status', 'mode', 'daily_key', 'duel_id', 'open_user_id', 'started_at', 'finished_at',
        'score', 'reels', 'hits', 'misses', 'perfects', 'max_streak', 'max_combo', 'bonus_points', 'level',
        'accuracy', 'avg_reaction_ms', 'active_ms', 'ended_by', 'client_score', 'client_reels',
        'flags', 'flag_codes', 'created_at', 'updated_at',
    ];

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
            'difficulty' => 'integer',
            'difficulty_version' => 'integer',
            'device_verdict' => DeviceVerdict::class,
            'status' => RunStatus::class,
            'mode' => RunMode::class,
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
            'score' => 'integer',
            'reels' => 'integer',
            'hits' => 'integer',
            'misses' => 'integer',
            'perfects' => 'integer',
            'max_streak' => 'integer',
            'max_combo' => 'integer',
            'bonus_points' => 'integer',
            'level' => 'integer',
            'accuracy' => 'integer',
            'avg_reaction_ms' => 'integer',
            'active_ms' => 'integer',
            'ended_by' => EndReason::class,
            'client_score' => 'integer',
            'client_reels' => 'integer',
            'flags' => 'array',
            'stats' => 'array',
            'actions' => 'array',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Why a flagged run is off the boards, when the player can be told:
     * `device` — the phone failed its integrity check. The other checks are
     * not explained to the player.
     */
    public function flagReason(): ?string
    {
        if ($this->status !== RunStatus::Flagged) {
            return null;
        }
        foreach ($this->flags ?? [] as $flag) {
            if (($flag['code'] ?? null) === 'device_integrity') {
                return 'device';
            }
        }

        return null;
    }

    public function hasExpired(CarbonInterface $now): bool
    {
        $ttl = (int) config('quezby.runs.ttl_minutes');

        return $now->greaterThan($this->started_at->copy()->addMinutes($ttl));
    }

    /**
     * Keeps `flag_codes` in step with `flags`, whichever way they are set —
     * `fill`, `forceFill`, a factory — so a run can be found by its flags.
     *
     * @param  string  $key
     * @param  mixed  $value
     * @return $this
     */
    public function setAttribute($key, $value)
    {
        parent::setAttribute($key, $value);
        if ($key === 'flags') {
            $this->attributes['flag_codes'] = RunFlag::codesOf($value);
        }

        return $this;
    }

    /**
     * The runs that carry `$flag`.
     *
     * @param  Builder<Run>  $query
     */
    public function scopeWithFlag(Builder $query, RunFlag $flag): void
    {
        $query->whereRaw("runs.flag_codes like ? escape '!'", [$flag->pattern()]);
    }
}
