<?php

use App\Enums\LeagueTier;
use App\Game\Rules;
use App\Services\Rating\TargetTable;

/*
| The rating's promise, as the engine's is ±20 %: the target table puts each
| of the engine's simulated players in their league, and holds them there
| without swinging them across it. Scores are drawn around each profile's
| median from `docs/product/scoring.md` (2,000 runs each), 15 % lower for a
| real thumb, spread like the profile's p10–p90.
*/

/**
 * Where `$players` players of a profile end up after `$runs` runs from
 * placement, and how far a run moves them once they have settled.
 *
 * @return array{mean: float, sd: float, p90: int}
 */
function settle(int $median, float $sigma, int $players = 150, int $runs = 120): array
{
    $table = TargetTable::forEngine(Rules::ENGINE_VERSION);
    $config = config('quezby.rating');
    $draw = function () use ($median, $sigma): int {
        $u = max(mt_rand() / mt_getrandmax(), 1e-9);
        $v = mt_rand() / mt_getrandmax();

        return (int) round($median * 0.85 * exp($sigma * sqrt(-2 * log($u)) * cos(2 * M_PI * $v)));
    };

    mt_srand(4242);
    $finals = [];
    $moves = [];
    for ($p = 0; $p < $players; $p++) {
        $placement = array_map(fn () => $draw(), range(1, $config['placement_runs']));
        $rating = max($config['placement_min'], min($config['placement_max'], $table->performance(TargetTable::median($placement)) ?? 0));
        for ($n = 1; $n <= $runs; $n++) {
            $width = $n <= $config['provisional_runs'] ? $config['provisional_width'] : $config['width'];
            $delta = TargetTable::delta($rating, $table->performance($draw()), $width, $config['max_delta']);
            if ($delta < 0 && LeagueTier::fromRating($rating)->isBottom()) {
                $delta = -intdiv(-$delta * $config['bronze_loss_percent'] + 99, 100);
            }
            $rating = max(0, $rating + $delta);
            if ($n > 60) {
                $moves[] = abs($delta);
            }
        }
        $finals[] = $rating;
    }

    $mean = array_sum($finals) / count($finals);
    sort($moves);

    return [
        'mean' => $mean,
        'sd' => sqrt(array_sum(array_map(fn (int $r) => ($r - $mean) ** 2, $finals)) / count($finals)),
        'p90' => $moves[intdiv(count($moves) * 9, 10)],
    ];
}

test('each simulated player settles in their league, and stays there', function (int $median, float $sigma, LeagueTier $league) {
    $settled = settle($median, $sigma);

    expect(LeagueTier::fromRating((int) round($settled['mean'])))->toBe($league)
        ->and($settled['sd'])->toBeLessThan(120.0)
        ->and($settled['p90'])->toBeLessThanOrEqual(75);
})->with([
    // median score, log spread (p90/p10 of the profile), league
    'casual' => [40000, 0.52, LeagueTier::Silver],
    'average' => [104000, 0.35, LeagueTier::Silver],
    'good' => [240000, 0.23, LeagueTier::Gold],
    'pro' => [499000, 0.14, LeagueTier::Platinum],
    'elite' => [744000, 0.12, LeagueTier::Diamond],
]);

test('only near-flawless play holds MasterClass', function () {
    expect(LeagueTier::fromRating((int) round(settle(1000000, 0.08, players: 40)['mean'])))->toBe(LeagueTier::Master)
        ->and(LeagueTier::fromRating((int) round(settle(744000, 0.12, players: 40)['mean'])))->not->toBe(LeagueTier::Master);
});

test('a better player always settles higher', function () {
    $medians = [40000, 104000, 240000, 499000, 744000];
    $settled = array_map(fn (int $median) => settle($median, 0.2, players: 40)['mean'], $medians);

    foreach (range(1, count($settled) - 1) as $i) {
        expect($settled[$i])->toBeGreaterThan($settled[$i - 1] + 500);
    }
});
