<?php

namespace App\Console\Commands;

use App\Services\Rating\RatingCalibration;
use Illuminate\Console\Command;

/**
 * How the target table fits the players who actually play, and the anchors
 * that would hold the leagues' shares. Writes nothing: a new table goes in
 * `config/quezby.php` › `rating.targets`, with a changelog entry.
 */
final class RatingCalibrateCommand extends Command
{
    protected $signature = 'quezby:rating:calibrate {--days=30 : How far back the runs go}';

    protected $description = 'Report how the rating targets fit real players, and propose anchors';

    public function handle(RatingCalibration $calibration): int
    {
        $report = $calibration->report(max(1, (int) $this->option('days')));

        $this->components->info(sprintf(
            'Engine %d, difficulty table %d: %d players with %d+ counted runs in %d days.',
            $report['engineVersion'], $report['difficultyVersion'], $report['players'], $report['minRuns'], $report['days'],
        ));
        $this->table(
            ['League', 'Wanted %', 'Settles now %'],
            array_map(fn (string $tier) => [
                $tier,
                $report['shares'][$tier],
                $report['players'] === 0 ? '—' : round($report['settled'][$tier] * 100 / $report['players'], 1),
            ], array_keys($report['shares'])),
        );
        $this->table(
            ['Rating', 'Target now', 'Proposed'],
            array_map(fn (array $anchor) => [$anchor['rating'], $anchor['current'] ?? '—', $anchor['proposed'] ?? '—'], $report['anchors']),
        );

        return self::SUCCESS;
    }
}
