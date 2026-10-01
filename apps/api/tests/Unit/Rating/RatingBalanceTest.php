<?php

use App\Enums\LeagueTier;
use App\Game\Difficulty;
use App\Game\Rules;
use App\Services\Rating\RatingService;
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
    'casual' => [39900, 0.52, LeagueTier::Silver],
    'average' => [102700, 0.35, LeagueTier::Silver],
    'good' => [238100, 0.24, LeagueTier::Gold],
    'pro' => [494400, 0.16, LeagueTier::Platinum],
    'elite' => [737000, 0.12, LeagueTier::Diamond],
]);

test('only near-flawless play holds MasterClass', function () {
    expect(LeagueTier::fromRating((int) round(settle(1000000, 0.08, players: 40)['mean'])))->toBe(LeagueTier::Master)
        ->and(LeagueTier::fromRating((int) round(settle(737000, 0.12, players: 40)['mean'])))->not->toBe(LeagueTier::Master);
});

test('a better player always settles higher', function () {
    $medians = [40000, 104000, 240000, 499000, 744000];
    $settled = array_map(fn (int $median) => settle($median, 0.2, players: 40)['mean'], $medians);

    foreach (range(1, count($settled) - 1) as $i) {
        expect($settled[$i])->toBeGreaterThan($settled[$i - 1] + 500);
    }
});

/*
| Dereceli's ladder: every rated run is played at the difficulty of the
| player's rating (`RatingService::difficultyAt`) — the same feed, a tighter
| meter — so a player's scores fall as they climb. The difficulty table's
| targets (version 2) set the ladder on people: casual and average play in
| Gümüş, good play in Platin, and MasterClass within a pro's reach, not past
| the best simulated thumb as version 1 had it. The engine's own targets
| would push the best players down a league.
|
| Each profile's median score at difficulties 0–16 (600 simulated runs each,
| `pnpm engine:simulate` prints every fourth), before the real-thumb 15 %.
*/

const DIFFICULTY_MEDIANS = [
    'casual' => [39300, 36700, 34500, 32500, 30900, 29300, 27000, 25000, 23200, 21600, 19700, 17800, 17000, 15700, 14600, 13500, 12800],
    'average' => [101500, 96600, 91000, 85400, 80900, 76200, 72600, 67400, 64400, 59500, 58000, 53000, 49100, 44400, 42900, 41200, 38600],
    'good' => [240300, 231500, 222500, 212300, 204200, 195100, 187000, 178500, 169200, 159400, 152500, 147000, 140000, 129500, 124600, 119700, 112300],
    'pro' => [493200, 474400, 461200, 448800, 440900, 430200, 416400, 405700, 392100, 376500, 364400, 353000, 340100, 326000, 311100, 302100, 294400],
    'elite' => [726800, 710000, 693000, 679400, 667000, 651200, 637400, 622500, 612300, 601400, 586300, 570000, 549100, 529700, 519100, 503300, 485800],
];

/**
 * Where a profile's players settle when each rated run is played at the
 * difficulty of their rating and measured with `$table` — placement at
 * difficulty 0, against the engine's own targets.
 *
 * @param  list<int>  $medians  the profile's median score at each difficulty
 * @return array{mean: float, sd: float, p90: int}
 */
function settleAtDifficulty(array $medians, float $sigma, TargetTable $table, int $players = 150, int $runs = 120): array
{
    $placementTable = TargetTable::forEngine(Rules::ENGINE_VERSION);
    $ratings = app(RatingService::class);
    $config = config('quezby.rating');
    $draw = function (int $difficulty) use ($medians, $sigma): int {
        $u = max(mt_rand() / mt_getrandmax(), 1e-9);
        $v = mt_rand() / mt_getrandmax();

        return (int) round($medians[$difficulty] * 0.85 * exp($sigma * sqrt(-2 * log($u)) * cos(2 * M_PI * $v)));
    };

    mt_srand(4242);
    $finals = [];
    $moves = [];
    for ($p = 0; $p < $players; $p++) {
        $placement = array_map(fn () => $draw(0), range(1, $config['placement_runs']));
        $rating = max($config['placement_min'], min($config['placement_max'], $placementTable->performance(TargetTable::median($placement)) ?? 0));
        for ($n = 1; $n <= $runs; $n++) {
            $width = $n <= $config['provisional_runs'] ? $config['provisional_width'] : $config['width'];
            $delta = TargetTable::delta($rating, $table->performance($draw($ratings->difficultyAt($rating))), $width, $config['max_delta']);
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

function difficultyTargets(): TargetTable
{
    return TargetTable::forDifficulty(Rules::ENGINE_VERSION, Difficulty::VERSION) ?? throw new RuntimeException('No difficulty targets.');
}

test('at the difficulties, each simulated player settles in its league on the ladder, and stays there', function (string $profile, float $sigma, LeagueTier $league) {
    $hard = settleAtDifficulty(DIFFICULTY_MEDIANS[$profile], $sigma, difficultyTargets());

    // A run's score spreads ±35–50 % for casual and average thumbs: their
    // rating moves more a run than a steady player's, never across a league.
    expect(LeagueTier::fromRating((int) round($hard['mean'])))->toBe($league)
        ->and($hard['sd'])->toBeLessThan(150.0)
        ->and($hard['p90'])->toBeLessThanOrEqual(95);
})->with([
    'casual' => ['casual', 0.52, LeagueTier::Silver],
    'average' => ['average', 0.35, LeagueTier::Silver],
    'good' => ['good', 0.24, LeagueTier::Platinum],
    'pro' => ['pro', 0.16, LeagueTier::Master],
    'elite' => ['elite', 0.12, LeagueTier::Master],
]);

test('MasterClass is a pro’s to reach and to keep: calm once there, and good play stays below it', function () {
    $pro = settleAtDifficulty(DIFFICULTY_MEDIANS['pro'], 0.16, difficultyTargets());
    $elite = settleAtDifficulty(DIFFICULTY_MEDIANS['elite'], 0.12, difficultyTargets());
    $good = settleAtDifficulty(DIFFICULTY_MEDIANS['good'], 0.24, difficultyTargets());

    expect($pro['mean'])->toBeGreaterThan(5000.0)
        ->and($elite['mean'])->toBeGreaterThan($pro['mean'] + 500)
        ->and($pro['p90'])->toBeLessThanOrEqual(70)
        ->and($elite['p90'])->toBeLessThanOrEqual(70)
        ->and($pro['sd'])->toBeLessThan(100.0)
        ->and($good['mean'])->toBeLessThan(4500.0);
});

test('MasterClass’s door asks a run a person can play', function () {
    // At 5000 the target is what halfway from good to pro scores at difficulty
    // 16 — under 180 000, some three and a half minutes of clean play.
    expect(difficultyTargets()->shown(5000))->toBeLessThan(180000)
        ->and(difficultyTargets()->shown(5000))->toBeGreaterThan(difficultyTargets()->shown(4000));
});

test('the difficulty-0 targets would push the best players down a league', function () {
    $elite = settleAtDifficulty(DIFFICULTY_MEDIANS['elite'], 0.12, TargetTable::forEngine(Rules::ENGINE_VERSION), players: 40);

    expect(LeagueTier::fromRating((int) round($elite['mean'])))->not->toBe(LeagueTier::Diamond);
});

test('a better player still always settles higher', function () {
    $settled = array_map(
        fn (string $profile) => settleAtDifficulty(DIFFICULTY_MEDIANS[$profile], 0.2, difficultyTargets(), players: 40)['mean'],
        array_keys(DIFFICULTY_MEDIANS),
    );

    foreach (range(1, count($settled) - 1) as $i) {
        expect($settled[$i])->toBeGreaterThan($settled[$i - 1] + 500);
    }
});
