<?php

use App\Enums\LeagueTier;
use App\Enums\RatingKind;
use App\Enums\RunStatus;
use App\Game\Rules;
use App\Models\PlayerRating;
use App\Models\RatingChange;
use App\Models\Run;
use App\Models\User;
use App\Services\Rating\RatingService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;

/*
| `GET /rating`: the player's Elo, league, and the target of their next run.
| `GET /ratings`: the highest ratings of the players who played lately —
| everyone's, friends', or your own league's — each with their best score in
| the league they are in.
*/

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-10-01 12:00', 'Europe/Istanbul'));
    pinRatingTargets();
});

test('a player still placing sees how far placement has got, and nothing else', function () {
    $player = $this->signIn();
    PlayerRating::query()->create(['user_id' => $player->id, 'placement_scores' => [30000, 40000]]);

    $this->getJson('/api/v1/rating')->assertOk()->assertExactJson([
        'unlock' => null,
        'placed' => false,
        'rating' => null,
        'tier' => null,
        'floor' => null,
        'ceil' => null,
        'progress' => null,
        'target' => null,
        'difficulty' => null,
        'peak' => null,
        'placement' => ['played' => 2, 'required' => 3],
        'shield' => null,
        'history' => [],
    ]);
});

test('a placed player sees their league, how far into it, the next target and their last changes', function () {
    $player = $this->signIn();
    $this->rate($player, 2400, attributes: ['peak' => 2600, 'shield_tier' => LeagueTier::Gold, 'shield_left' => 1]);
    $run = Run::factory()->for($player)->rated()->ranked(240000)->create();
    $counted = app(RatingService::class)->forFinishedRun($run);

    $this->getJson('/api/v1/rating')->assertOk()
        ->assertJsonPath('placed', true)
        ->assertJsonPath('rating', $counted['after'])
        ->assertJsonPath('tier', 'gold')
        ->assertJsonPath('floor', 2000)
        ->assertJsonPath('ceil', 3000)
        ->assertJsonPath('progress', intdiv(($counted['after'] - 2000) * 1000, 1000))
        ->assertJsonPath('target', $counted['nextTarget'])
        ->assertJsonPath('difficulty', $counted['nextDifficulty'])
        ->assertJsonPath('peak', 2600)
        ->assertJsonMissingPath('provisional')
        ->assertJsonPath('shield', null)
        ->assertJsonPath('history.0.kind', 'run')
        ->assertJsonPath('history.0.delta', $counted['delta'])
        ->assertJsonPath('history.0.score', 240000)
        ->assertJsonPath('history.0.target', $counted['target'])
        ->assertJsonPath('history.0.tier', 'gold')
        ->assertJsonPath('history.0.runId', $run->id)
        ->assertJsonPath('history.0.at', '2026-10-01T09:00:00.000Z');
});

test('the history lists what set or moved the rating, not the placement runs on the way', function () {
    $player = $this->signIn();
    $ratings = app(RatingService::class);
    foreach ([20000, 100000, 58310] as $score) {
        $ratings->forFinishedRun(Run::factory()->for($player)->rated()->ranked($score)->create());
    }

    $this->getJson('/api/v1/rating')->assertOk()
        ->assertJsonCount(1, 'history')
        ->assertJsonPath('history.0.kind', 'placement')
        ->assertJsonPath('history.0.after', 1500);
});

test('MasterClass has no ceiling to be part of the way to', function () {
    $this->rate($this->signIn(), 5400);

    $this->getJson('/api/v1/rating')
        ->assertJsonPath('tier', 'master')
        ->assertJsonPath('floor', 5000)
        ->assertJsonPath('ceil', null)
        ->assertJsonPath('progress', null);
});

test('a shield shows while it lasts', function () {
    $this->rate($this->signIn(), 3050, attributes: ['shield_tier' => LeagueTier::Platinum, 'shield_left' => 2]);

    $this->getJson('/api/v1/rating')->assertJsonPath('shield', ['tier' => 'platinum', 'runs' => 2]);
});

test('the board ranks the players who played lately, highest first, the one who got there first ahead', function () {
    $me = $this->signIn();
    $players = collect(['birinci' => 5200, 'ikinci' => 4100, 'ucuncu' => 4100, 'eski' => 4800, 'yasakli' => 6000, 'yeni' => null])
        ->map(fn (?int $rating, string $name) => User::factory()->withUsername($name)->create());
    $this->rate($players['birinci'], 5200);
    $this->rate($players['ikinci'], 4100, now()->subHours(2));
    $this->rate($players['ucuncu'], 4100, now()->subHour());
    $this->rate($players['eski'], 4800, now()->subDays(20));
    $this->rate($players['yasakli'], 6000);
    $players['yasakli']->forceFill(['banned_at' => now()])->save();
    PlayerRating::query()->create(['user_id' => $players['yeni']->id, 'placement_scores' => [1000]]);
    $this->rate($me, 3000);
    $this->befriend($me, $players['ucuncu']);

    $this->getJson('/api/v1/ratings')->assertOk()
        ->assertJsonPath('scope', 'everyone')
        ->assertJsonPath('players', 4)
        ->assertJsonPath('entries.*.username', ['birinci', 'ikinci', 'ucuncu', $me->username])
        ->assertJsonPath('entries.*.rank', [1, 2, 3, 4])
        ->assertJsonPath('entries.*.tier', ['master', 'diamond', 'diamond', 'platinum'])
        ->assertJsonPath('entries.*.gap', [null, 1101, 1, 1101])
        ->assertJsonPath('entries.2.isFriend', true)
        ->assertJsonPath('entries.3.isMe', true)
        ->assertJsonPath('me', [
            'rank' => 4,
            'username' => $me->username,
            'avatarUrl' => null,
            'rating' => 3000,
            'tier' => 'platinum',
            'leagueBest' => null,
            'isMe' => true,
            'isFriend' => false,
            'gap' => 1101,
        ]);

    $this->getJson('/api/v1/ratings?scope=friends')->assertOk()
        ->assertJsonPath('players', 2)
        ->assertJsonPath('entries.*.username', ['ucuncu', $me->username])
        ->assertJsonPath('me.rank', 2);
});

test('the league board ranks the players of your own league by Elo, and never resets', function () {
    $me = $this->signIn();
    $ratings = ['ust' => 2900, 'es' => 2500, 'alt' => 2100, 'platin' => 3100, 'gumus' => 1900, 'eski' => 2700];
    $players = collect($ratings)->map(fn (int $rating, string $name) => User::factory()->withUsername($name)->create());
    foreach ($ratings as $name => $rating) {
        $this->rate($players[$name], $rating, $name === 'eski' ? now()->subDays(20) : null);
    }
    $this->rate($me, 2400);

    $this->getJson('/api/v1/ratings?scope=league')->assertOk()
        ->assertJsonPath('scope', 'league')
        ->assertJsonPath('players', 4)
        ->assertJsonPath('entries.*.username', ['ust', 'es', $me->username, 'alt'])
        ->assertJsonPath('entries.*.tier', ['gold', 'gold', 'gold', 'gold'])
        ->assertJsonPath('me.rank', 3)
        ->assertJsonPath('me.gap', 101);

    // A week later nothing has been settled or reset: the same order.
    Carbon::setTestNow(now()->addWeek());
    $this->rate($players['ust'], 2900);
    $this->rate($players['es'], 2500);
    $this->rate($players['alt'], 2100);
    $this->rate($me, 2400);
    $this->getJson('/api/v1/ratings?scope=league')->assertJsonPath('entries.*.username', ['ust', 'es', $me->username, 'alt']);
});

/**
 * A counted rated run of `$score` that `$player` played in `$tier` — this
 * season's, unless `$change` says otherwise.
 *
 * @param  array<string, mixed>  $run
 * @param  array<string, mixed>  $change
 */
function playedIn(User $player, LeagueTier $tier, int $score, array $run = [], array $change = []): Run
{
    $played = Run::factory()->for($player)->rated()->ranked($score)->create($run);
    RatingChange::query()->create([
        'user_id' => $player->id,
        'run_id' => $played->id,
        'kind' => RatingKind::Run,
        'score' => $score,
        'target' => 100000,
        'before' => $tier->floor() + 100,
        'after' => $tier->floor() + 120,
        'delta' => 20,
        'tier_before' => $tier,
        'tier_after' => $tier,
        'engine_version' => Rules::ENGINE_VERSION,
        'created_at' => now(),
        ...$change,
    ]);

    return $played;
}

test('every row shows the player\'s best rated score in the league they are in now', function () {
    $me = $this->signIn();
    $rival = User::factory()->withUsername('rakip')->create();
    $promoted = User::factory()->withUsername('yeni')->create();
    $this->rate($me, 2400);
    $this->rate($rival, 2600);
    $this->rate($promoted, 2100);

    playedIn($me, LeagueTier::Gold, 90000);
    playedIn($me, LeagueTier::Gold, 130000);
    // Not in Altın: before the promotion, a forfeit, last season, thrown out since.
    playedIn($me, LeagueTier::Silver, 200000);
    playedIn($me, LeagueTier::Gold, 0, change: ['kind' => RatingKind::Forfeit, 'score' => null]);
    playedIn($me, LeagueTier::Gold, 300000, change: ['engine_version' => Rules::ENGINE_VERSION - 1]);
    playedIn($me, LeagueTier::Gold, 250000, run: ['status' => RunStatus::Rejected]);
    playedIn($rival, LeagueTier::Gold, 110000);
    playedIn($promoted, LeagueTier::Silver, 180000);

    $this->getJson('/api/v1/ratings?scope=league')->assertOk()
        ->assertJsonPath('entries.*.username', ['rakip', $me->username, 'yeni'])
        ->assertJsonPath('entries.*.leagueBest', [110000, 130000, null])
        ->assertJsonPath('me.leagueBest', 130000);
});

test('on the everyone board each best is from the player\'s own league', function () {
    $me = $this->signIn();
    $platinum = User::factory()->withUsername('platin')->create();
    $this->rate($me, 2400);
    $this->rate($platinum, 3100);
    playedIn($platinum, LeagueTier::Platinum, 95000);
    playedIn($platinum, LeagueTier::Gold, 140000);
    playedIn($me, LeagueTier::Gold, 120000);

    $this->getJson('/api/v1/ratings')->assertOk()
        ->assertJsonPath('entries.*.username', ['platin', $me->username])
        ->assertJsonPath('entries.*.leagueBest', [95000, 120000]);
});

test('a player not placed yet has no league board', function () {
    $player = $this->signIn();
    PlayerRating::query()->create(['user_id' => $player->id, 'placement_scores' => [30000]]);
    $this->rate(User::factory()->withUsername('ekin')->create(), 1500);

    $this->getJson('/api/v1/ratings?scope=league')->assertOk()->assertExactJson([
        'scope' => 'league',
        'entries' => [],
        'me' => null,
        'players' => 0,
    ]);
});

test('the weekly groups are gone: no route, no tables', function () {
    $this->signIn();

    $this->getJson('/api/v1/leagues/current')->assertNotFound();
    expect(Schema::hasTable('league_groups'))->toBeFalse()
        ->and(Schema::hasTable('league_members'))->toBeFalse()
        ->and(Schema::hasColumn('rating_changes', 'league_member_id'))->toBeFalse();
});

test('a player who has not played lately is not on the board', function () {
    $this->rate($this->signIn(), 3000, now()->subDays(15));

    $this->getJson('/api/v1/ratings')->assertOk()->assertJsonPath('me', null)->assertJsonPath('entries', []);
});

test('the rating needs a player, the board a known scope', function () {
    $this->assertApiError($this->getJson('/api/v1/rating'), 401, 'unauthenticated');
    $this->assertApiError($this->getJson('/api/v1/ratings'), 401, 'unauthenticated');

    $this->signIn();
    $this->assertApiError($this->getJson('/api/v1/ratings?scope=world'), 422, 'validation_failed');
});
