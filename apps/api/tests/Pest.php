<?php

use App\Game\Difficulty;
use App\Game\Gesture;
use App\Game\ReelKind;
use App\Game\Rules;
use App\Game\Run as Engine;
use App\Support\Timestamp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Assert;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test case
|--------------------------------------------------------------------------
|
| Every test closure is bound to Tests\TestCase, so `$this->signIn()`,
| `$this->assertApiError()` and Laravel's helpers work in both folders.
| Feature tests share the migrated in-memory database, each inside a
| transaction that is rolled back afterwards.
|
*/

pest()->extend(TestCase::class)->in('Unit');

pest()->extend(TestCase::class)->use(RefreshDatabase::class)->in('Feature');

/*
|--------------------------------------------------------------------------
| Shared fixtures
|--------------------------------------------------------------------------
|
| Plain functions rather than TestCase methods: datasets are resolved while
| the suite is being built, before any test boots the application, so these
| read the fixture files straight from the monorepo without Laravel.
|
*/

/**
 * A JSON fixture shared with the TypeScript packages, by its path from the
 * repo root — the same file as `base_path('../../'.$path)`.
 *
 * @return array<mixed>
 */
function sharedFixture(string $path): array
{
    $file = dirname(__DIR__).'/../../'.$path;

    return json_decode((string) file_get_contents($file), true, flags: JSON_THROW_ON_ERROR);
}

/**
 * One of the engine fixtures in `packages/engine/fixtures`, written by
 * `pnpm engine:fixtures`.
 *
 * @return array<mixed>
 */
function engineFixture(string $name): array
{
    return sharedFixture('packages/engine/fixtures/'.$name);
}

/**
 * @return array{name: string, seed: int, actions: list<array{int, int, int}>, summary: array<string, int|string>}
 */
function replayFixture(string $name): array
{
    foreach (engineFixture('replays.json') as $fixture) {
        if ($fixture['name'] === $name) {
            return $fixture;
        }
    }

    Assert::fail("No replay fixture named {$name}.");
}

/**
 * A log that plays every reel right, deciding skip and like reels after
 * `$decisionMs` (± `$jitterMs`), for `$reels` reels — then quits. A rated
 * run's log is played at its `$difficulty`.
 *
 * @return list<array{int, int, int}>
 */
function playedLog(int $seed, int $reels, int $decisionMs, int $jitterMs = 0, int $difficulty = 0): array
{
    $run = new Engine($seed, $difficulty);
    $actions = [];
    while (count($actions) < $reels && ! $run->isOver()) {
        $reel = $run->current();
        // A deterministic wobble, the way a thumb never lands on the same millisecond twice.
        $t = $decisionMs + ($jitterMs === 0 ? 0 : (($reel->index * 7919) % (2 * $jitterMs + 1)) - $jitterMs);
        $action = match ($reel->kind) {
            ReelKind::Skip => [Gesture::Up->value, $t, 0],
            ReelKind::Like => [Gesture::Like->value, $t, 0],
            ReelKind::Hold => [Gesture::Hold->value, 300, intdiv($reel->zoneCenter * $reel->holdFill, 1000)],
            ReelKind::Freeze => [Gesture::None->value, 0, 0],
        };
        $run->apply($action);
        $actions[] = $action;
    }

    return $actions;
}

/**
 * A log that swipes up on every reel without looking, after `$decisionMs`
 * (± `$jitterMs`): right on swipe reels, wrong on like and gold ones, caught
 * on freeze reels unless `$spareFreeze` — the guesser `fast_decisions` must
 * tell from a bot.
 *
 * @return list<array{int, int, int}>
 */
function swipedLog(int $seed, int $reels, int $decisionMs, int $jitterMs = 0, bool $spareFreeze = false): array
{
    $run = new Engine($seed);
    $actions = [];
    while (count($actions) < $reels && ! $run->isOver()) {
        $reel = $run->current();
        $t = $decisionMs + ($jitterMs === 0 ? 0 : (($reel->index * 7919) % (2 * $jitterMs + 1)) - $jitterMs);
        $action = match ($reel->kind) {
            ReelKind::Freeze => $spareFreeze ? [Gesture::None->value, 0, 0] : [Gesture::Touch->value, $t, 0],
            default => [Gesture::Up->value, $t, 0],
        };
        $run->apply($action);
        $actions[] = $action;
    }

    return $actions;
}

/**
 * Pins this season's Elo target tables — difficulty 0's and the difficulty
 * table's — to engine v2's anchors, the ones the rating tests were written
 * against, so a new season's calibration never moves their numbers. The
 * season's own tables are tested by `Unit/Rating/TargetTableTest` and
 * `Unit/Rating/RatingBalanceTest`.
 */
function pinRatingTargets(): void
{
    $anchors = [0 => 8000, 1000 => 34000, 2000 => 100000, 3000 => 240000, 4000 => 480000, 5000 => 800000, 6000 => 1100000];
    config([
        'quezby.rating.targets.'.Rules::ENGINE_VERSION => $anchors,
        'quezby.rating.difficulty.targets.'.Rules::ENGINE_VERSION.'.'.Difficulty::VERSION => $anchors,
    ]);
}

/**
 * A `GuestNames` digit source that draws `$values` in turn, then keeps
 * drawing the last one.
 *
 * @return Closure(): int
 */
function drawn(int ...$values): Closure
{
    return function () use (&$values): int {
        return count($values) > 1 ? array_shift($values) : $values[0];
    };
}

/*
|--------------------------------------------------------------------------
| Identity providers
|--------------------------------------------------------------------------
|
| Apple and Google behind `Http::fake`, for the sign-in tests.
|
*/

require_once __DIR__.'/Support/FakeIdentityProvider.php';

/*
|--------------------------------------------------------------------------
| Analytics
|--------------------------------------------------------------------------
*/

/**
 * One visit as the app sends it (`AnalyticsVisit` in `packages/types`), with
 * `$overrides` over a five-minute visit that ended a moment ago.
 *
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function analyticsVisit(array $overrides = []): array
{
    return [
        'id' => bin2hex(random_bytes(16)),
        'startedAt' => Timestamp::iso(now()->subMinutes(5)),
        'seconds' => 240,
        'appVersion' => '1.0.0',
        'journey' => [['home', 0], ['game', 12], ['share_result', 230]],
        'counts' => ['home' => 1, 'game' => 1, 'share_result' => 1],
        ...$overrides,
    ];
}

/**
 * `POST /analytics/visits`'s body: the visits, sent now from an iPhone.
 *
 * @param  array<string, mixed>  ...$visits
 * @return array<string, mixed>
 */
function analyticsBatch(array ...$visits): array
{
    return ['sentAt' => Timestamp::iso(now()), 'platform' => 'ios', 'visits' => array_values($visits)];
}

/**
 * The anonymous totals of one Istanbul day, bucket => total.
 *
 * @return array<string, int>
 */
function analyticsTotals(string $day): array
{
    return DB::table('analytics_totals')
        ->where('day', $day)
        ->orderBy('bucket')
        ->pluck('total', 'bucket')
        ->map(fn ($total) => (int) $total)
        ->all();
}

/** The `X-Device` header of a phone, as `@quezby/sdk` writes it. */
function deviceHeaderOf(string $install = 'c0ffee00c0ffee00', string $platform = 'ios', string $os = '18.2', ?string $brand = 'Apple', string $model = 'iPhone 15 Pro', string $build = '42'): string
{
    return "install={$install}; platform={$platform}; os=".rawurlencode($os)
        .($brand === null ? '' : '; brand='.rawurlencode($brand))
        .'; model='.rawurlencode($model).'; build='.rawurlencode($build);
}
