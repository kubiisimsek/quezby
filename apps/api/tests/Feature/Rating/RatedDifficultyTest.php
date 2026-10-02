<?php

use App\Enums\RatingKind;
use App\Enums\RunMode;
use App\Enums\RunStatus;
use App\Game\Difficulty;
use App\Game\EngineError;
use App\Game\Gesture;
use App\Game\ReelKind;
use App\Game\Rules;
use App\Game\Run as Engine;
use App\Models\LeaderboardEntry;
use App\Models\PlayerRating;
use App\Models\PlayerStat;
use App\Models\RatingChange;
use App\Models\Run;
use App\Models\User;
use App\Services\LeaderboardService;
use App\Services\Rating\RatingService;
use Illuminate\Support\Carbon;

/*
| Dereceli gets harder as the rating climbs: a rated run is handed the
| difficulty of the player's rating with its seed, played and replayed at it,
| and measured with the targets of its difficulty. It plays for Elo alone:
| the week, the month and the season (Zirve) are Normal's and Günlük's.
| `docs/product/scoring.md` → "Dereceli zorluğu".
*/

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-10-01 12:00', 'Europe/Istanbul'));
});

/** The player's rated run. */
function ratedRunOf(User $player): Run
{
    return Run::query()->where('user_id', $player->id)->where('mode', RunMode::Rated)->sole();
}

test('a rated run is handed the difficulty of the rating', function (int $rating, int $difficulty) {
    $player = $this->signIn();
    $this->rate($player, $rating);

    $start = $this->startRun(['mode' => 'rated'])->assertCreated()->assertJsonPath('difficulty', $difficulty);

    $this->assertDatabaseHas('runs', [
        'id' => $start->json('runId'),
        'difficulty' => $difficulty,
        'difficulty_version' => Difficulty::VERSION,
    ]);
})->with([
    'Bronz plays the game as it is' => [999, 0],
    'Gümüş opens the first step' => [1000, 1],
    'still the first' => [1249, 1],
    'the second' => [1250, 2],
    'Altın' => [2500, 7],
    'Platin' => [3000, 9],
    'the last step before the top' => [4749, 15],
    'the top' => [4750, 16],
    'MasterClass plays the top' => [6200, 16],
]);

test('placement runs are played at difficulty 0', function () {
    $player = $this->signIn();
    PlayerRating::query()->create(['user_id' => $player->id, 'placement_scores' => [30000]]);

    $this->startRun(['mode' => 'rated'])->assertCreated()->assertJsonPath('difficulty', 0);
});

test('Normal, Günlük and VS runs are always played at difficulty 0', function (string $mode) {
    $player = $this->signIn();
    $this->rate($player, 4500);

    $start = $this->startRun(['mode' => $mode])->assertCreated()->assertJsonPath('difficulty', 0);

    $this->assertDatabaseHas('runs', ['id' => $start->json('runId'), 'difficulty' => 0, 'difficulty_version' => null]);
})->with(['free', 'daily']);

test('an app without the difficulty table is told to update before a rated run, not before a Normal one', function (array $version) {
    $player = $this->signIn();
    $this->rate($player, 2500);
    $body = ['engineVersion' => Rules::ENGINE_VERSION, 'contentVersion' => 1] + $version;

    $this->assertApiError($this->postJson('/api/v1/runs', ['mode' => 'rated'] + $body), 422, 'engine_outdated');
    $this->postJson('/api/v1/runs', ['mode' => 'free'] + $body)->assertCreated();
    expect(Run::query()->where('mode', 'rated')->count())->toBe(0);
})->with([
    'an app from before the table' => [[]],
    'another table' => [['difficultyVersion' => Difficulty::VERSION + 1]],
]);

test('the difficulty is set once the run left open has been charged', function () {
    $player = $this->signIn();
    $this->rate($player, 1050);
    $this->startRun(['mode' => 'rated'])->assertCreated()->assertJsonPath('difficulty', 1);
    Carbon::setTestNow(now()->addMinutes(2));

    // Leaving it is a forfeit: 1050 − 200 is Bronz, and Bronz plays difficulty 0.
    $this->startRun(['mode' => 'rated'])->assertCreated()->assertJsonPath('difficulty', 0);
    expect(PlayerRating::query()->findOrFail($player->id)->rating)->toBe(850);
});

test('a rated run is replayed at its difficulty, moves the rating and the stats, and never reaches the boards', function () {
    $player = $this->signIn();
    $this->rate($player, 3000);
    $this->recordRanked($player, 5000);
    $boards = LeaderboardEntry::query()->where('user_id', $player->id)->pluck('score', 'period')->all();

    $finish = $this->playFeed('rated', 80)->assertOk();

    $run = ratedRunOf($player);
    expect($run->difficulty)->toBe(9)
        ->and($run->score)->toBe(Engine::replay($run->seed, $run->actions, 9)->summary->score);
    $finish->assertJsonPath('run.status', 'ranked')
        ->assertJsonPath('run.score', $run->score)
        ->assertJsonPath('isNewBest', false)
        ->assertJsonPath('passed', [])
        ->assertJsonPath('rating.kind', 'run')
        ->assertJsonPath('rating.difficulty', 9)
        ->assertJsonPath('rating.nextDifficulty', app(RatingService::class)->difficultyAt($finish->json('rating.after')));
    expect(LeaderboardEntry::query()->where('user_id', $player->id)->pluck('score', 'period')->all())->toBe($boards)
        ->and(PlayerStat::query()->find($player->id)?->runs)->toBe(1)
        ->and(RatingChange::query()->where('run_id', $run->id)->sole()->kind)->toBe(RatingKind::Run)
        // No week rank to share: a rated run never climbed the week.
        ->and($finish->json('shareText'))->not->toContain('#');
});

test('a log played at another difficulty does not count, and costs the rating', function () {
    $player = $this->signIn();
    $this->rate($player, 3000);
    $start = $this->startRun(['mode' => 'rated'])->assertCreated();
    // The app played the easier game than the one it was handed: the reels are
    // the same, but a sloppy thumb's meter lasts longer at difficulty 0.
    $actions = sloppyLog($start->json('seed'));
    $summary = Engine::replay($start->json('seed'), $actions)->summary;
    try {
        expect(Engine::replay($start->json('seed'), $actions, $start->json('difficulty'))->summary->reels)->toBeLessThan($summary->reels);
    } catch (EngineError) {
        // The meter ran out at the handed difficulty before the log did.
    }
    Run::query()->whereKey($start->json('runId'))->update(['started_at' => now()->subMinutes(10)]);

    $this->finishRun($start->json('runId'), $actions, $summary->score, $summary->reels);

    expect(Run::query()->findOrFail($start->json('runId'))->status)->toBeIn([RunStatus::Rejected, RunStatus::Flagged])
        ->and(PlayerRating::query()->findOrFail($player->id)->rating)->toBe(2800);
});

test('a soft-signalled rated run waits for review only when it would lift its player into the Elo board\'s top', function (int $above, RunStatus $status) {
    $player = $this->signIn();
    $this->rate($player, 1000);
    foreach (range(1, $above) as $i) {
        $this->rate(User::factory()->withUsername()->create(), 1900 + $i);
    }

    // A metronome thumb: every decision at 400 ms is a soft signal.
    $this->playFeed('rated', 100, 400, jitterMs: 0)->assertOk()->assertJsonPath('run.status', $status->value);
    expect(LeaderboardEntry::query()->count())->toBe(0);
})->with([
    'an empty Elo board' => [0, RunStatus::Review],
    'ten players far ahead' => [10, RunStatus::Ranked],
]);

test('rebuilding a player\'s boards leaves their rated runs off', function () {
    $player = User::factory()->withUsername()->create();
    Run::factory()->for($player)->ranked(40000)->create();
    Run::factory()->for($player)->rated()->ranked(90000)->create();

    app(LeaderboardService::class)->rebuildFor($player);

    expect(LeaderboardEntry::query()->where('user_id', $player->id)->pluck('score')->unique()->values()->all())->toBe([40000]);
});

test('the migration takes the rated runs already on the boards off them', function () {
    $player = User::factory()->withUsername()->create();
    $free = $this->recordRanked($player, 40000);
    $rated = Run::factory()->for($player)->rated()->ranked(90000)->create();
    // Before the change, a rated run climbed the boards too.
    app(LeaderboardService::class)->rebuildFor($player);
    LeaderboardEntry::query()->where('user_id', $player->id)->update(['run_id' => $rated->id, 'score' => 90000]);
    $untouched = $this->recordRanked(User::factory()->withUsername()->create(), 70000);

    (require database_path('migrations/2026_10_01_000500_take_rated_runs_off_the_boards.php'))->up();

    expect(LeaderboardEntry::query()->where('user_id', $player->id)->pluck('run_id')->unique()->values()->all())->toBe([$free->id])
        ->and(LeaderboardEntry::query()->where('user_id', $untouched->user_id)->pluck('score')->unique()->values()->all())->toBe([70000]);
});

test('a rated run from before the difficulty table keeps the engine\'s targets', function () {
    $player = User::factory()->withUsername()->create();
    $this->rate($player, 3000);
    $run = Run::factory()->for($player)->rated()->ranked(200000)->create(['difficulty_version' => null]);

    $view = app(RatingService::class)->forFinishedRun($run);

    expect(RatingChange::query()->where('run_id', $run->id)->sole()->target)
        ->toBe((int) round(config('quezby.rating.targets.'.Rules::ENGINE_VERSION)[3000]))
        ->and($view['difficulty'])->toBe(0);
});

test('the difficulty of a rating steps every 250 Elo from 1000, up to the top', function () {
    $ratings = app(RatingService::class);

    expect($ratings->difficultyAt(null))->toBeNull()
        ->and(array_map(fn (int $rating) => $ratings->difficultyAt($rating), [0, 999, 1000, 1999, 2000, 3999, 4000, 4999, 5000, 9000]))
        ->toBe([0, 0, 1, 4, 5, 12, 13, 16, 16, 16]);
    foreach (range(1000, 5000, 50) as $rating) {
        expect($ratings->difficultyAt($rating))->toBeGreaterThanOrEqual($ratings->difficultyAt($rating - 50));
    }
    expect(RunMode::onBoards())->toBe(['free', 'daily']);
});

/**
 * A run played at difficulty 0 that lets every fourth reel time out: the
 * meter just lasts there, and runs out sooner at a harder difficulty.
 *
 * @return list<array{int, int, int}>
 */
function sloppyLog(int $seed): array
{
    $run = new Engine($seed);
    $actions = [];
    while (count($actions) < 300 && ! $run->isOver()) {
        $reel = $run->current();
        $action = match (true) {
            $reel->index % 4 === 3 && $reel->kind !== ReelKind::Freeze => [Gesture::None->value, 0, 0],
            $reel->kind === ReelKind::Skip => [Gesture::Up->value, 430, 0],
            $reel->kind === ReelKind::Like => [Gesture::Like->value, 430, 0],
            $reel->kind === ReelKind::Hold => [Gesture::Hold->value, 300, intdiv($reel->zoneCenter * $reel->holdFill, 1000)],
            default => [Gesture::None->value, 0, 0],
        };
        $run->apply($action);
        $actions[] = $action;
    }

    return $actions;
}
