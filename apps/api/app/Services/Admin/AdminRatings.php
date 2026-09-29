<?php

namespace App\Services\Admin;

use App\Enums\LeagueTier;
use App\Enums\RatingKind;
use App\Models\PlayerRating;
use App\Models\RatingChange;
use App\Models\Run;
use App\Models\User;
use App\Services\Rating\RatingService;
use App\Services\Rating\TargetTable;
use App\Support\Timestamp;
use Illuminate\Container\Attributes\Config;

/**
 * The ratings as the admin panel shows them — never changed from here: how
 * many sit in each league, the highest, one player's rating and its history,
 * what one run did to it.
 */
final class AdminRatings
{
    /**
     * @param  array<string, mixed>  $config  `quezby.rating`
     */
    public function __construct(
        #[Config('quezby.rating')]
        private readonly array $config,
        #[Config('quezby.engine_version')]
        private readonly int $engineVersion,
    ) {}

    /**
     * `AdminRatingsResponse`: players per league (all, and those who played
     * lately), how many are still placing, the highest ratings, and the rules
     * the ratings run on.
     *
     * @return array<string, mixed>
     */
    public function overview(int $limit = 50): array
    {
        $since = now()->subDays((int) $this->config['board_active_days']);
        $placed = PlayerRating::query()
            ->join('users', 'users.id', '=', 'player_ratings.user_id')
            ->whereNull('users.banned_at')
            ->whereNotNull('player_ratings.rating');
        $count = fn (bool $active) => (clone $placed)
            ->when($active, fn ($query) => $query->where('player_ratings.rated_at', '>=', $since))
            ->toBase()
            ->selectRaw('player_ratings.tier as tier, count(*) as total')
            ->groupBy('player_ratings.tier')
            ->pluck('total', 'tier');
        $byTier = function ($totals): array {
            $tiers = [];
            foreach (LeagueTier::cases() as $tier) {
                $tiers[$tier->slug()] = (int) ($totals[$tier->value] ?? 0);
            }

            return $tiers;
        };

        return [
            'tiers' => $byTier($count(false)),
            'active' => $byTier($count(true)),
            'placing' => PlayerRating::query()->whereNull('rating')->count(),
            'top' => (clone $placed)
                ->with('user')
                ->orderByDesc('player_ratings.rating')
                ->orderBy('player_ratings.changed_at')
                ->limit($limit)
                ->get(['player_ratings.*'])
                ->map(fn (PlayerRating $rating) => [
                    'player' => AdminRuns::ref($rating->user),
                    'rating' => $rating->rating,
                    'tier' => LeagueTier::fromRating((int) $rating->rating)->slug(),
                    'peak' => $rating->peak,
                    'ratedAt' => Timestamp::iso($rating->rated_at),
                ])
                ->values()
                ->all(),
            'rules' => [
                'engineVersion' => $this->engineVersion,
                'maxDelta' => (int) $this->config['max_delta'],
                'width' => (int) $this->config['width'],
                'provisionalWidth' => (int) $this->config['provisional_width'],
                'provisionalRuns' => (int) $this->config['provisional_runs'],
                'placementRuns' => (int) $this->config['placement_runs'],
                'placementMin' => (int) $this->config['placement_min'],
                'placementMax' => (int) $this->config['placement_max'],
                'shieldRuns' => (int) $this->config['shield_runs'],
                'bronzeLossPercent' => (int) $this->config['bronze_loss_percent'],
                'activeDays' => (int) $this->config['board_active_days'],
                'unlockRuns' => (int) $this->config['unlock_runs'],
                'targets' => array_map(
                    fn (int $rating, int $score) => ['rating' => $rating, 'score' => $score],
                    array_keys($this->config['targets'][$this->engineVersion] ?? []),
                    array_values($this->config['targets'][$this->engineVersion] ?? []),
                ),
            ],
        ];
    }

    /**
     * `AdminPlayerRating`: the player's rating and every change of it,
     * the runs that did not count too. Null for a player never rated.
     *
     * @return array<string, mixed>|null
     */
    public function of(User $player): ?array
    {
        $rating = PlayerRating::query()->find($player->id);
        if ($rating === null) {
            return null;
        }

        return [
            'rating' => $rating->rating,
            'tier' => $rating->rating === null ? null : LeagueTier::fromRating($rating->rating)->slug(),
            'peak' => $rating->peak,
            'target' => $rating->rating === null ? null : TargetTable::forEngine($this->engineVersion)?->shown($rating->rating),
            'placement' => $rating->isPlaced() ? null : [
                'played' => count($rating->placement_scores ?? []),
                'required' => (int) $this->config['placement_runs'],
            ],
            'provisionalLeft' => $rating->provisional_left,
            'shield' => $rating->shield_tier !== null && $rating->shield_left > 0
                ? ['tier' => $rating->shield_tier->slug(), 'runs' => $rating->shield_left]
                : null,
            'ratedRuns' => $rating->rated_runs,
            'ratedAt' => Timestamp::iso($rating->rated_at),
            'history' => RatingChange::query()
                ->where('user_id', $player->id)
                ->orderByDesc('id')
                ->limit(30)
                ->get()
                ->map(fn (RatingChange $change) => self::change($change))
                ->all(),
        ];
    }

    /**
     * `AdminRunRating`: what a run did to its player's rating; null when it
     * never reached the rating (a VS, a run still open, one held for review).
     *
     * @return array<string, mixed>|null
     */
    public function ofRun(Run $run): ?array
    {
        $change = RatingChange::query()->where('run_id', $run->id)->first();
        if ($change === null) {
            return null;
        }
        $reversal = RatingChange::query()->where('reversal_of', $change->id)->first();

        return self::change($change) + ['reversedBy' => $reversal?->delta];
    }

    /**
     * `AdminRatingChange`.
     *
     * @return array<string, mixed>
     */
    private static function change(RatingChange $change): array
    {
        return [
            ...RatingService::presentChange($change),
            'id' => $change->id,
            'performance' => $change->performance,
            'width' => $change->width,
            'shielded' => $change->shielded,
            'engineVersion' => $change->engine_version,
            'counted' => $change->kind !== RatingKind::Void,
        ];
    }
}
