<?php

use App\Enums\LeagueTier;
use App\Enums\RatingKind;
use App\Enums\RunMode;
use App\Enums\RunStatus;
use App\Models\PlayerRating;
use App\Models\RatingChange;
use App\Models\Run;
use App\Models\User;
use App\Services\Rating\RatingService;
use App\Services\Rating\TargetTable;
use Illuminate\Support\Carbon;

/*
| A rated (Dereceli) run against its target: placement first, then past the
| target up and short of it down, never more than a hundred — Bronz halved,
| a fresh promotion shielded, and the runs that do not count noted as such.
| Free, daily and VS runs never touch the rating.
*/

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-10-01 12:00', 'Europe/Istanbul'));
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
    ]);
    expect(ratingOf($player))
        ->rating->toBe(1500)
        ->tier->toBe(LeagueTier::Silver)
        ->peak->toBe(1500)
        ->provisional_left->toBe(15)
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

test('a placed run past its target rises, short of it falls, by tanh of the distance', function () {
    $player = User::factory()->withUsername()->create();
    $this->rate($player, 1500);

    $up = ratedRun($player, 100000);

    expect($up)->toMatchArray([
        'kind' => 'run', 'before' => 1500, 'after' => 1555, 'delta' => 55,
        'tierBefore' => 'silver', 'tier' => 'silver', 'target' => 58400, 'placement' => null, 'shielded' => false,
    ])->and($up['nextTarget'])->toBe(TargetTable::forEngine(2)?->shown(1555));

    $down = ratedRun($player, 34000);
    expect($down['delta'])->toBe(TargetTable::delta(1555, 1000, 800, 100))
        ->and($down['delta'])->toBeLessThan(0);

    $change = RatingChange::query()->where('kind', RatingKind::Run->value)->orderBy('id')->firstOrFail();
    expect($change)
        ->score->toBe(100000)
        ->performance->toBe(2000)
        ->target->toBe(58310)
        ->width->toBe(800)
        ->engine_version->toBe(2);
});

test('a run that scored nothing is the full loss', function () {
    $player = User::factory()->withUsername()->create();
    $this->rate($player, 2400);

    expect(ratedRun($player, 0, ['reels' => 3])['delta'])->toBe(-100);
});

test('provisional runs move twice as fast, and so do the first runs back after a long break', function () {
    $player = User::factory()->withUsername()->create();
    $this->rate($player, 1500, attributes: ['provisional_left' => 2]);

    expect(ratedRun($player, 100000)['delta'])->toBe(85)
        ->and(ratingOf($player)->provisional_left)->toBe(1);

    $returning = User::factory()->withUsername()->create();
    $this->rate($returning, 1500, ratedAt: now()->subDays(40));

    expect(ratedRun($returning, 100000)['delta'])->toBe(85)
        ->and(ratingOf($returning)->provisional_left)->toBe(4);
});

test('Bronz loses half, and never below zero', function () {
    $player = User::factory()->withUsername()->create();
    $this->rate($player, 700);
    $full = TargetTable::delta(700, TargetTable::forEngine(2)?->performance(4000), 800, 100);

    expect(ratedRun($player, 4000)['delta'])->toBe(-intdiv(-$full + 1, 2));

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
        ->rating->toBe(1900)
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
    ])->and(RatingChange::query()->count())->toBe(0);
});

test('a flagged run is a forfeit when it was played wrong, and nothing when only the phone or the ban flagged it', function (array $codes, string $kind, int $delta) {
    $player = User::factory()->withUsername()->create();
    $this->rate($player, 2500);
    $flags = array_map(fn (string $code) => ['code' => $code, 'severity' => 'hard'], $codes);

    $view = ratedRun($player, 900000, ['status' => RunStatus::Flagged, 'flags' => $flags]);

    expect($view)->toMatchArray(['kind' => $kind, 'delta' => $delta]);
})->with([
    'too fast' => [['fast_decisions'], 'forfeit', -100],
    'slowed down' => [['slow_motion', 'checkpoint_mismatch'], 'forfeit', -100],
    'a failed phone' => [['device_integrity'], 'void', 0],
    'a failed phone that also played too fast' => [['device_integrity', 'wall_clock'], 'forfeit', -100],
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
        ->and(ratedRun($player, 0, ['reels' => 0, 'started_at' => now()->subMinutes(2)])['delta'])->toBe(-100);
});

test('a run moves the rating once, however often it is counted', function () {
    $player = User::factory()->withUsername()->create();
    $this->rate($player, 1500);
    $run = Run::factory()->for($player)->rated()->ranked(100000)->create();
    $ratings = app(RatingService::class);

    $first = $ratings->forFinishedRun($run);
    $second = $ratings->forFinishedRun($run);

    expect($second)->toBe($first)
        ->and(ratingOf($player)->rating)->toBe(1555)
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
