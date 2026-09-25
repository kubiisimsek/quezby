<?php

use App\Game\Gesture;
use App\Game\ReelKind;
use App\Game\Run as Engine;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
 * `$decisionMs` (± `$jitterMs`), for `$reels` reels — then quits.
 *
 * @return list<array{int, int, int}>
 */
function playedLog(int $seed, int $reels, int $decisionMs, int $jitterMs = 0): array
{
    $run = new Engine($seed);
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
