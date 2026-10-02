<?php

use App\Game\Difficulty;
use App\Game\Rules;
use App\Services\Rating\RatingCurve;
use App\Services\Rating\TargetTable;

/*
| How far a run moves a rating: by its score as a share of the target it saw,
| the same share the same move at every rating. Up 2 qb a per cent, +200 at
| twice the target; down 2 a per cent to 80 %, then 4, −200 at 40 % — a
| forfeit's too.
*/

function curve(): RatingCurve
{
    return app(RatingCurve::class);
}

test('the curve runs through the target, rising from the full loss to the biggest gain', function () {
    $points = config('quezby.rating.curve');
    $shares = array_keys($points);
    $moves = array_values($points);

    expect($points)->toHaveKey(100)
        ->and($points[100])->toBe(0)
        ->and(curve()->floor())->toBe(-200)
        ->and(curve()->ceiling())->toBe(200);
    foreach (range(1, count($points) - 1) as $i) {
        expect($shares[$i])->toBeGreaterThan($shares[$i - 1])
            ->and($moves[$i])->toBeGreaterThan($moves[$i - 1]);
    }
});

test('a run moves the rating by its score as a share of the target', function (int $score, int $delta) {
    expect(curve()->delta($score, 100000))->toBe($delta);
})->with([
    'far short' => [25000, -200],
    '40 %' => [40000, -200],
    'half' => [50000, -160],
    '60 %' => [60000, -120],
    '70 %' => [70000, -80],
    '80 %' => [80000, -40],
    '90 %' => [90000, -20],
    '99 %' => [99000, -2],
    'the target' => [100000, 0],
    '110 %' => [110000, 20],
    '120 %' => [120000, 40],
    '130 %' => [130000, 60],
    '150 %' => [150000, 100],
    'twice' => [200000, 200],
    'three times' => [300000, 200],
]);

test('the same share moves the same at every rating', function () {
    $table = TargetTable::forDifficulty(Rules::ENGINE_VERSION, Difficulty::VERSION) ?? throw new RuntimeException('No targets.');

    foreach ([0, 1000, 2000, 3000, 4500, 6000, 7000] as $rating) {
        $target = $table->shown($rating);

        expect(curve()->delta(intdiv($target * 8, 10), $target))->toBe(-40)
            ->and(curve()->delta(intdiv($target * 3, 2), $target))->toBe(100)
            ->and(curve()->delta($target * 3, $target))->toBe(200);
    }
});

test('no score at all is the full loss', function () {
    expect(curve()->delta(null, 100000))->toBe(-200)
        ->and(curve()->delta(0, 100000))->toBe(-200);
});

test('reaching the shown target never loses, and falling short of it never wins', function () {
    $table = TargetTable::forDifficulty(Rules::ENGINE_VERSION, Difficulty::VERSION) ?? throw new RuntimeException('No targets.');

    foreach (range(0, 7000, 137) as $rating) {
        $shown = $table->shown($rating);

        expect(curve()->delta($shown, $shown))->toBe(0)
            ->and(curve()->delta($shown + 1, $shown))->toBeGreaterThanOrEqual(0)
            ->and(curve()->delta($shown - 1000, $shown))->toBeLessThanOrEqual(0)
            ->and(curve()->delta(intdiv($shown, 2), $shown))->toBeLessThan(0);
    }
});

test('another curve moves by its own points, straight between them and flat past the ends', function () {
    $curve = new RatingCurve([150 => 50, 50 => -100, 100 => 0]);

    expect($curve->delta(75, 100))->toBe(-50)
        ->and($curve->delta(125, 100))->toBe(25)
        ->and($curve->delta(10, 100))->toBe(-100)
        ->and($curve->delta(1000, 100))->toBe(50)
        ->and($curve->floor())->toBe(-100)
        ->and($curve->ceiling())->toBe(50)
        ->and($curve->points())->toBe([
            ['percent' => 50, 'qb' => -100],
            ['percent' => 100, 'qb' => 0],
            ['percent' => 150, 'qb' => 50],
        ]);
});
