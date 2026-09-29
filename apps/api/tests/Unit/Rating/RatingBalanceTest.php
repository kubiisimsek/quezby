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
| The same promise at Dereceli's difficulties: every rated run is played at
| the difficulty of the player's rating (`RatingService::difficultyAt`), so a
| player's scores fall as they climb. The difficulty table's targets hold
| each profile where it settles at difficulty 0; the engine's own targets
| would push the best players down a league.
|
| Each profile's median score at difficulties 0–16 (600 simulated runs each,
| `pnpm engine:simulate` prints every fourth), before the real-thumb 15 %.
*/

const DIFFICULTY_MEDIANS = [
    'casual' => [39300, 36900, 34300, 33000, 30700, 27200, 24400, 22300, 19200, 16800, 15300, 13600, 13000, 11700, 9900, 9300, 8200],
    'average' => [101500, 97100, 92900, 87500, 83100, 75300, 72700, 66500, 60700, 56900, 51300, 46900, 41600, 37400, 33000, 29000, 26000],
    'good' => [240300, 228800, 224600, 213000, 200800, 193400, 180300, 164600, 155300, 145700, 134100, 129000, 119000, 104300, 95300, 89400, 79300],
    'pro' => [493200, 478500, 470000, 455600, 440600, 419100, 398000, 384200, 365700, 350900, 327200, 311200, 290100, 270000, 251400, 233900, 214200],
    'elite' => [726800, 725000, 709000, 696800, 671000, 650000, 628200, 608800, 578500, 553300, 522500, 496300, 473500, 435500, 415800, 391700, 361600],
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

test('at the difficulties, each simulated player settles in the league it settles in without them', function (string $profile, float $sigma, LeagueTier $league) {
    $hard = settleAtDifficulty(DIFFICULTY_MEDIANS[$profile], $sigma, difficultyTargets());
    $easy = settle((int) round(DIFFICULTY_MEDIANS[$profile][0]), $sigma);

    expect(LeagueTier::fromRating((int) round($hard['mean'])))->toBe($league)
        ->and(abs($hard['mean'] - $easy['mean']))->toBeLessThan(150.0)
        ->and($hard['sd'])->toBeLessThan(120.0)
        ->and($hard['p90'])->toBeLessThanOrEqual(80);
})->with([
    'casual' => ['casual', 0.52, LeagueTier::Silver],
    'average' => ['average', 0.35, LeagueTier::Silver],
    'good' => ['good', 0.24, LeagueTier::Gold],
    'pro' => ['pro', 0.16, LeagueTier::Platinum],
    'elite' => ['elite', 0.12, LeagueTier::Diamond],
]);

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
