<?php

use App\Enums\LeagueTier;
use App\Game\Difficulty;
use App\Game\Rules;
use App\Services\Rating\RatingCurve;
use App\Services\Rating\RatingService;
use App\Services\Rating\TargetTable;

/*
| The rating's promise, as the engine's is ±20 %: the target table puts each
| of the engine's simulated players in their league, and holds them there
| without swinging them across it. Scores are drawn around each profile's
| median from `docs/product/scoring.md` (2,000 runs each), 15 % lower for a
| real thumb, spread like the profile's p10–p90. A run moves the rating by
| its score as a share of the target (`RatingCurve`, up to ±200): a steady
| thumb's runs land near it and move little, a wide one's swing further.
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
    $curve = app(RatingCurve::class);
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
            $delta = $curve->delta($draw(), $table->shown($rating));
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

test('each simulated player settles in their league, and stays there', function (int $median, float $sigma, LeagueTier $league, float $sd, int $p90) {
    $settled = settle($median, $sigma);

    // The short game spreads a casual run's score wide (p90/p10 ≈ 7): one run
    // in ten moves it the full 200, and its rating wanders the most — but
    // settles in its league. A steady thumb's runs land near the target.
    expect(LeagueTier::fromRating((int) round($settled['mean'])))->toBe($league)
        ->and($settled['sd'])->toBeLessThan($sd)
        ->and($settled['p90'])->toBeLessThanOrEqual($p90);
})->with([
    // median score, log spread (p90/p10 of the profile), league, the rating's
    // spread across players, the move of nine runs in ten once settled
    'casual' => [39200, 0.75, LeagueTier::Silver, 200.0, 200],
    'average' => [113100, 0.44, LeagueTier::Silver, 175.0, 200],
    'good' => [267200, 0.28, LeagueTier::Gold, 125.0, 130],
    'pro' => [517800, 0.19, LeagueTier::Platinum, 100.0, 85],
    'elite' => [781700, 0.13, LeagueTier::Diamond, 75.0, 60],
]);

test('only near-flawless play holds MasterClass', function () {
    expect(LeagueTier::fromRating((int) round(settle(1100000, 0.08, players: 40)['mean'])))->toBe(LeagueTier::Master)
        ->and(LeagueTier::fromRating((int) round(settle(781700, 0.13, players: 40)['mean'])))->not->toBe(LeagueTier::Master);
});

test('a better player always settles higher', function () {
    $medians = [39200, 113100, 267200, 517800, 781700];
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
    'casual' => [38800, 34700, 30300, 28000, 25200, 23800, 21600, 19400, 18400, 16400, 14600, 13500, 12100, 11400, 10700, 10000, 9800],
    'average' => [113200, 105600, 101600, 94300, 89300, 82400, 75000, 67500, 61500, 57900, 52800, 47300, 43200, 40300, 37100, 33800, 31200],
    'good' => [270000, 256000, 246500, 230400, 222500, 213700, 199600, 190500, 178000, 168000, 156800, 148400, 138300, 130000, 123400, 116700, 108900],
    'pro' => [520000, 500200, 487800, 472900, 458200, 445200, 436100, 422000, 411600, 393200, 384000, 371100, 359600, 351900, 338800, 325200, 310600],
    'elite' => [781300, 764400, 748600, 733600, 722100, 712000, 692400, 672500, 655400, 641100, 621900, 603200, 589700, 571600, 558600, 547000, 529700],
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
    $curve = app(RatingCurve::class);
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
            $delta = $curve->delta($draw($ratings->difficultyAt($rating)), $table->shown($rating));
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

test('at the difficulties, each simulated player settles in its league on the ladder, and stays there', function (string $profile, float $sigma, LeagueTier $league, float $sd, int $p90) {
    $hard = settleAtDifficulty(DIFFICULTY_MEDIANS[$profile], $sigma, difficultyTargets());

    // A run's score spreads wide for casual, average and good thumbs: their
    // rating moves more a run than a steady player's, never across a league.
    expect(LeagueTier::fromRating((int) round($hard['mean'])))->toBe($league)
        ->and($hard['sd'])->toBeLessThan($sd)
        ->and($hard['p90'])->toBeLessThanOrEqual($p90);
})->with([
    'casual' => ['casual', 0.75, LeagueTier::Silver, 190.0, 200],
    'average' => ['average', 0.44, LeagueTier::Silver, 175.0, 200],
    'good' => ['good', 0.28, LeagueTier::Platinum, 150.0, 130],
    'pro' => ['pro', 0.19, LeagueTier::Master, 100.0, 85],
    'elite' => ['elite', 0.13, LeagueTier::Master, 75.0, 60],
]);

test('MasterClass is a pro’s to reach and to keep: calm once there, and good play stays below it', function () {
    $pro = settleAtDifficulty(DIFFICULTY_MEDIANS['pro'], 0.19, difficultyTargets());
    $elite = settleAtDifficulty(DIFFICULTY_MEDIANS['elite'], 0.13, difficultyTargets());
    $good = settleAtDifficulty(DIFFICULTY_MEDIANS['good'], 0.28, difficultyTargets());

    expect($pro['mean'])->toBeGreaterThan(5000.0)
        ->and($elite['mean'])->toBeGreaterThan($pro['mean'] + 500)
        ->and($pro['p90'])->toBeLessThanOrEqual(80)
        ->and($elite['p90'])->toBeLessThanOrEqual(80)
        ->and($pro['sd'])->toBeLessThan(100.0)
        ->and($good['mean'])->toBeLessThan(4500.0);
});

test('MasterClass’s door asks a run a person can play', function () {
    // At 5000 the target is what halfway from good to pro scores at difficulty
    // 16 — under 180 000, under three minutes of clean play.
    expect(difficultyTargets()->shown(5000))->toBeLessThan(180000)
        ->and(difficultyTargets()->shown(5000))->toBeGreaterThan(difficultyTargets()->shown(4000));
});

test('the difficulty-0 targets would push the best players down a league', function () {
    $elite = settleAtDifficulty(DIFFICULTY_MEDIANS['elite'], 0.13, TargetTable::forEngine(Rules::ENGINE_VERSION), players: 40);

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
