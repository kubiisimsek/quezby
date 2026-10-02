<?php

use App\Enums\LeagueTier;
use App\Enums\RatingKind;
use App\Enums\RunMode;
use App\Enums\RunStatus;
use App\Game\Difficulty;
use App\Game\Rules;
use App\Models\PlayerRating;
use App\Models\RatingChange;
use App\Models\Run;
use App\Models\User;
use App\Services\Rating\RatingService;
use App\Services\Rating\TargetTable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;

/*
| A rated (Dereceli) run against its target: placement first, then past the
| target up and short of it down, by the score's share of the target —
| never more than 200 either way, Bronz's losses halved, a fresh promotion
| shielded, and the runs that do not count noted as such. Free, daily and VS
| runs never touch the rating.
*/

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-10-01 12:00', 'Europe/Istanbul'));
    pinRatingTargets();
});

/**
 * A finished rated run of `$score` by `$player`, counted.
 *
 * @param  array<string, mixed>  $state
 * @return array<string, mixed>
 */
function ratedRun(User $player, int $score, array $state = []): array
{
    $run = Run::factory()->for($player)->rated()->ranked($score)->create(['started_at' => now()->subMinutes(5), ...$state]);

    return app(RatingService::class)->forFinishedRun($run) ?? [];
}

function ratingOf(User $player): PlayerRating
{
    return PlayerRating::query()->findOrFail($player->id);
}

test('the first three rated runs place the player at the rating of their median, and until then nothing shows', function () {
    $player = User::factory()->withUsername('yeni')->create();

    foreach ([20000, 100000] as $i => $score) {
        expect(ratedRun($player, $score))->toBe([
            'kind' => 'placement',
            'before' => null,
            'after' => null,
            'delta' => 0,
            'tierBefore' => null,
            'tier' => null,
            'target' => null,
            'nextTarget' => null,
            'placement' => ['played' => $i + 1, 'required' => 3],
            'shielded' => false,
            'difficulty' => 0,
            'nextDifficulty' => null,
        ]);
    }

    // Median of 20, 58.31 and 100 thousand: 58,310 — the typical score at 1500.
    expect(ratedRun($player, 58310))->toBe([
        'kind' => 'placement',
        'before' => null,
        'after' => 1500,
        'delta' => 0,
        'tierBefore' => null,
        'tier' => 'silver',
        'target' => null,
        'nextTarget' => 58400,
        'placement' => ['played' => 3, 'required' => 3],
        'shielded' => false,
        'difficulty' => 0,
        'nextDifficulty' => 3,
    ]);
    expect(ratingOf($player))
        ->rating->toBe(1500)
        ->tier->toBe(LeagueTier::Silver)
        ->peak->toBe(1500)
        ->rated_runs->toBe(3);
});

test('placement is held inside Gümüş, whatever the median', function (int $score, int $placed) {
    $player = User::factory()->withUsername()->create();
    foreach (range(1, 3) as $i) {
        $view = ratedRun($player, $score);
    }

    expect($view['after'])->toBe($placed)->and($view['tier'])->toBe('silver');
})->with([
    'a weak start' => [5000, 1200],
    'no score at all' => [0, 1200],
    'a strong start' => [600000, 1800],
]);

test('a placed run past its target rises, short of it falls, by its score as a share of the target it saw', function () {
    $player = User::factory()->withUsername()->create();
    $this->rate($player, 1500);

    // The target at 1500 is 58,309 — 58,400 as the player sees it: 87,600 is 150 % of that.
    $up = ratedRun($player, 87600);

    expect($up)->toMatchArray([
        'kind' => 'run', 'before' => 1500, 'after' => 1600, 'delta' => 100,
        'tierBefore' => 'silver', 'tier' => 'silver', 'target' => 58400, 'placement' => null, 'shielded' => false,
    ])->and($up['nextTarget'])->toBe(TargetTable::forDifficulty(Rules::ENGINE_VERSION, Difficulty::VERSION)?->shown(1600))
        ->and($up['nextTarget'])->toBe(65000);

    // 52,000 is 80 % of 65,000.
    expect(ratedRun($player, 52000))->toMatchArray(['before' => 1600, 'after' => 1560, 'delta' => -40, 'target' => 65000]);

    $change = RatingChange::query()->where('kind', RatingKind::Run->value)->orderBy('id')->firstOrFail();
    expect($change)
        ->score->toBe(87600)
        ->performance->toBe(1877)
        ->target->toBe(58400)
        ->engine_version->toBe(Rules::ENGINE_VERSION);
});

test('a run that scored nothing is the full loss', function () {
    $player = User::factory()->withUsername()->create();
    $this->rate($player, 2400);

    expect(ratedRun($player, 0, ['reels' => 3])['delta'])->toBe(-200);
});

test('the same share moves the same at every rating, right after placement and back after a long break too', function () {
    $placed = User::factory()->withUsername()->create();
    $this->rate($placed, 1500, attributes: ['rated_runs' => 3]);
    $high = User::factory()->withUsername()->create();
    $this->rate($high, 4500);
    $returning = User::factory()->withUsername()->create();
    $this->rate($returning, 1700, ratedAt: now()->subDays(40));
    $targets = TargetTable::forDifficulty(Rules::ENGINE_VERSION, Difficulty::VERSION);

    foreach ([$placed, $high, $returning] as $player) {
        $target = $targets?->shown((int) ratingOf($player)->rating) ?? 0;

        expect(ratedRun($player, intdiv($target * 3, 2))['delta'])->toBe(100);
    }
});

test('no stretch moves faster: no provisional runs to count, no width to measure with', function () {
    expect(Schema::hasColumn('player_ratings', 'provisional_left'))->toBeFalse()
        ->and(Schema::hasColumn('rating_changes', 'width'))->toBeFalse()
        ->and(config('quezby.rating'))->not->toHaveKeys(['max_delta', 'width', 'provisional_width', 'provisional_runs']);
});

test('Bronz loses half, and never below zero', function () {
    // At 700 the target is 22,100: 17,680 is 80 % of it (−40), 4,000 far short (−200).
    $player = User::factory()->withUsername()->create();
    $this->rate($player, 700);
    expect(ratedRun($player, 17680)['delta'])->toBe(-20);

    $far = User::factory()->withUsername()->create();
    $this->rate($far, 700);
    expect(ratedRun($far, 4000)['delta'])->toBe(-100);

    $bottom = User::factory()->withUsername()->create();
    $this->rate($bottom, 20);
    expect(ratedRun($bottom, 0, ['reels' => 2]))->toMatchArray(['after' => 0, 'delta' => -20]);
});

test('a promotion shields the new league for three runs — against bad luck, not against leaving', function () {
    $player = User::factory()->withUsername()->create();
    $this->rate($player, 1990);

    $promotion = ratedRun($player, 240000);
    expect($promotion)->toMatchArray(['tierBefore' => 'silver', 'tier' => 'gold'])
        ->and(ratingOf($player))->shield_tier->toBe(LeagueTier::Gold)->shield_left->toBe(3);

    $held = ratedRun($player, 1000);
    expect($held)->toMatchArray(['after' => 2000, 'tier' => 'gold', 'shielded' => true])
        ->and(ratingOf($player)->shield_left)->toBe(2);

    $left = Run::factory()->for($player)->rated()->create(['status' => RunStatus::Abandoned, 'started_at' => now()->subMinute()]);
    app(RatingService::class)->forfeit($left);
    expect(ratingOf($player))
        ->rating->toBe(1800)
        ->tier->toBe(LeagueTier::Silver)
        ->shield_tier->toBeNull()
        ->shield_left->toBe(0);
});

test('the shield runs out after three runs', function () {
    $player = User::factory()->withUsername()->create();
    $this->rate($player, 2010, attributes: ['shield_tier' => LeagueTier::Gold, 'shield_left' => 1]);

    ratedRun($player, 90000);
    expect(ratingOf($player))->shield_tier->toBeNull()->shield_left->toBe(0);

    expect(ratedRun($player, 1000)['after'])->toBeLessThan(2000);
});

test('MasterClass has no ceiling', function () {
    $player = User::factory()->withUsername()->create();
    $this->rate($player, 5950);

    $view = ratedRun($player, 3000000);

    expect($view['after'])->toBeGreaterThan(6000)
        ->and($view['tier'])->toBe('master')
        ->and(ratingOf($player)->peak)->toBe($view['after']);
});

test('only a rated run plays for Elo: a free run, the day\'s and a VS never', function (RunMode $mode, RunStatus $status) {
    $player = User::factory()->withUsername()->create();
    $this->rate($player, 1500);
    $run = Run::factory()->for($player)->ranked(900000)->create(['mode' => $mode, 'status' => $status]);

    expect(app(RatingService::class)->forFinishedRun($run))->toBeNull()
        ->and(ratingOf($player)->rating)->toBe(1500)
        ->and(RatingChange::query()->count())->toBe(0);
})->with([
    'free' => [RunMode::Free, RunStatus::Ranked],
    'daily' => [RunMode::Daily, RunStatus::Ranked],
    'vs' => [RunMode::Vs, RunStatus::Played],
]);

test('a run held for review waits, and moves nothing', function () {
    $player = User::factory()->withUsername()->create();
    $this->rate($player, 3000);

    expect(ratedRun($player, 900000, ['status' => RunStatus::Review]))->toBe([
        'kind' => 'pending',
        'before' => 3000,
        'after' => 3000,
        'delta' => 0,
        'tierBefore' => 'platinum',
        'tier' => 'platinum',
        'target' => null,
        'nextTarget' => 240000,
        'placement' => null,
        'shielded' => false,
        'difficulty' => 0,
        'nextDifficulty' => 9,
    ])->and(RatingChange::query()->count())->toBe(0);
});

test('a flagged run is a forfeit when it was played wrong, and nothing when only the phone or the ban flagged it', function (array $codes, string $kind, int $delta) {
    $player = User::factory()->withUsername()->create();
    $this->rate($player, 2500);
    $flags = array_map(fn (string $code) => ['code' => $code, 'severity' => 'hard'], $codes);

    $view = ratedRun($player, 900000, ['status' => RunStatus::Flagged, 'flags' => $flags]);

    expect($view)->toMatchArray(['kind' => $kind, 'delta' => $delta]);
})->with([
    'too fast' => [['fast_decisions'], 'forfeit', -200],
    'slowed down' => [['slow_motion', 'checkpoint_mismatch'], 'forfeit', -200],
    'a failed phone' => [['device_integrity'], 'void', 0],
    'a failed phone that also played too fast' => [['device_integrity', 'wall_clock'], 'forfeit', -200],
    'banned' => [['banned', 'fast_decisions'], 'void', 0],
]);

test('a banned player\'s rating stands still', function () {
    $player = User::factory()->withUsername()->create(['banned_at' => now()]);
    $this->rate($player, 2500);

    expect(ratedRun($player, 900000)['kind'])->toBe('void')
        ->and(ratingOf($player)->rating)->toBe(2500);
});

test('a run given up in the countdown does not count; one quit later is the full loss', function () {
    $player = User::factory()->withUsername()->create();
    $this->rate($player, 2500);

    expect(ratedRun($player, 0, ['reels' => 0, 'started_at' => now()->subSeconds(8)])['kind'])->toBe('void')
        ->and(ratedRun($player, 0, ['reels' => 0, 'started_at' => now()->subMinutes(2)])['delta'])->toBe(-200);
});

test('a run moves the rating once, however often it is counted', function () {
    $player = User::factory()->withUsername()->create();
    $this->rate($player, 1500);
    $run = Run::factory()->for($player)->rated()->ranked(100000)->create();
    $ratings = app(RatingService::class);

    $first = $ratings->forFinishedRun($run);
    $second = $ratings->forFinishedRun($run);

    expect($second)->toBe($first)
        ->and(ratingOf($player)->rating)->toBe(1642)
        ->and(RatingChange::query()->where('run_id', $run->id)->count())->toBe(1);
});

test('a finished rated run tells the app what it did to the rating; any other run nothing', function () {
    config(['quezby.rating.unlock_runs' => 0]);
    $me = $this->signIn();
    $this->befriend($me, User::factory()->withUsername('rakip')->create());

    $this->playFeed('rated')->assertOk()
        ->assertJsonPath('rating.kind', 'placement')
        ->assertJsonPath('rating.placement', ['played' => 1, 'required' => 3])
        ->assertJsonPath('rating.after', null);

    $this->playFeed()->assertOk()->assertJsonPath('rating', null);
    $this->playFeed(mode: 'vs', body: ['opponent' => 'rakip'])->assertJsonPath('rating', null);
});
