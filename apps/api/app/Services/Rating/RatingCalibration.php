<?php

namespace App\Services\Rating;

use App\Enums\LeagueTier;
use App\Enums\RunMode;
use App\Enums\RunStatus;
use App\Models\Run;
use Illuminate\Container\Attributes\Config;

/**
 * How well the target table fits the players who actually play — for
 * `quezby:rating:calibrate` and the admin panel. Reads, never writes: a new
 * table is a config change, on record in the changelog.
 *
 * Every player with enough rated runs in the window stands for the median
 * of their scores — where their rating settles. The anchors it proposes put
 * each league's share of those players (`calibration.shares`) between two
 * anchors: Bronz's share below 1000, Gümüş's up to 2000, and so on; the ends
 * carry on the neighbouring stretch.
 */
final class RatingCalibration
{
    /**
     * @param  array{min_runs: int, shares: array<string, int>}  $calibration
     */
    public function __construct(
        #[Config('quezby.rating.calibration')]
        private readonly array $calibration,
        #[Config('quezby.engine_version')]
        private readonly int $engineVersion,
    ) {}

    /**
     * `AdminCalibrationResponse` in `packages/types`.
     *
     * @return array<string, mixed>
     */
    public function report(int $days): array
    {
        $medians = $this->medians($days);
        $table = TargetTable::forEngine($this->engineVersion);
        $anchors = config("quezby.rating.targets.{$this->engineVersion}") ?? [];
        $proposed = $this->propose($medians);

        $settled = array_fill_keys(array_map(fn (LeagueTier $tier) => $tier->slug(), LeagueTier::cases()), 0);
        foreach ($medians as $median) {
            $settled[LeagueTier::fromRating(max(0, $table?->performance($median) ?? 0))->slug()]++;
        }

        return [
            'engineVersion' => $this->engineVersion,
            'days' => $days,
            'minRuns' => $this->calibration['min_runs'],
            'players' => count($medians),
            'shares' => $this->calibration['shares'],
            'settled' => $settled,
            'anchors' => array_map(fn (int $rating) => [
                'rating' => $rating,
                'current' => $anchors[$rating] ?? null,
                'proposed' => $proposed[$rating] ?? null,
            ], array_keys($anchors)),
        ];
    }

    /**
     * Each player's median score over the window, lowest first.
     *
     * @return list<int>
     */
    private function medians(int $days): array
    {
        $scores = [];
        Run::query()
            ->join('users', 'users.id', '=', 'runs.user_id')
            ->whereNull('users.banned_at')
            ->where('runs.status', RunStatus::Ranked->value)
            ->where('runs.mode', RunMode::Rated->value)
            ->where('runs.engine_version', $this->engineVersion)
            ->where('runs.finished_at', '>=', now()->subDays($days))
            ->toBase()
            ->orderBy('runs.id')
            ->select(['runs.user_id', 'runs.score'])
            ->each(function (object $row) use (&$scores) {
                $scores[$row->user_id][] = (int) $row->score;
            });

        $medians = [];
        foreach ($scores as $played) {
            if (count($played) >= $this->calibration['min_runs']) {
                $medians[] = TargetTable::median($played);
            }
        }
        sort($medians);

        return $medians;
    }

    /**
     * The anchors that would hold the leagues' shares; empty when nobody
     * qualified.
     *
     * @param  list<int>  $medians
     * @return array<int, int>
     */
    private function propose(array $medians): array
    {
        if ($medians === []) {
            return [];
        }

        $anchors = [];
        $below = 0;
        foreach (array_values($this->calibration['shares']) as $i => $share) {
            if ($i === count($this->calibration['shares']) - 1) {
                break;
            }
            $below += $share;
            $index = min(count($medians) - 1, max(0, intdiv(count($medians) * $below, 100)));
            $anchors[($i + 1) * LeagueTier::WIDTH] = max(1, $medians[$index]);
        }
        // Scores must rise with the rating, however thin the data.
        $previous = 0;
        foreach ($anchors as $rating => $score) {
            $anchors[$rating] = $previous = max($score, $previous + 1);
        }
        $anchors[0] = max(1, intdiv($anchors[1000] * $anchors[1000], $anchors[2000]));
        $anchors[6000] = intdiv($anchors[5000] * $anchors[5000], $anchors[4000]);
        ksort($anchors);

        return $anchors;
    }
}
