<?php

use App\Enums\LeagueOutcome;
use App\Enums\LeagueTier;
use App\Models\LeagueGroup;
use App\Models\LeagueMember;
use App\Models\Run;
use App\Models\User;
use App\Services\LeagueService;
use Illuminate\Support\Carbon;

/*
| Weekly leagues: 30 players of a tier, points from each day's best, five up
| and five down when the week ends — all worked out lazily, without cron.
*/

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-23 12:00', 'Europe/Istanbul')); // Wednesday, 2026-W39
});

/** A ranked run of `$score` for `$player`, on the boards and seated in the league. */
function leagueRun(object $test, User $player, int $score): Run
{
    $run = $test->recordRanked($player, $score);
    app(LeagueService::class)->join($run);

    return $run;
}

test('a player who has not played this week is not in a group yet', function () {
    $this->signIn();

    $this->getJson('/api/v1/leagues/current')->assertOk()
        ->assertJsonPath('weekKey', '2026-W39')
        ->assertJsonPath('tier', 'bronze')
        ->assertJsonPath('joined', false)
        ->assertJsonPath('members', [])
        ->assertJsonPath('me', null)
        ->assertJsonPath('endsAt', '2026-09-27T21:00:00.000Z')
        ->assertJsonPath('lastWeek', null);
});

test('the week\'s first ranked run seats the player in a Bronz group', function () {
    $user = $this->signIn();

    $finish = $this->playFeed()->assertOk();

    $score = $finish->json('run.score');
    $finish->assertJsonPath('league', ['tier' => 'bronze', 'rank' => 1, 'members' => 1, 'zone' => 'stay', 'points' => $score]);
    $this->getJson('/api/v1/leagues/current')->assertOk()
        ->assertJsonPath('joined', true)
        ->assertJsonPath('members.0.username', $user->username)
        ->assertJsonPath('members.0.points', $score)
        ->assertJsonPath('members.0.daysPlayed', 1)
        ->assertJsonPath('me.isMe', true)
        ->assertJsonPath('promoteCount', 0)
        ->assertJsonPath('demoteCount', 0);

    $this->playFeed(reels: 30)->assertOk();
    expect(LeagueMember::query()->where('user_id', $user->id)->count())->toBe(1)
        ->and(LeagueGroup::query()->sole()->members)->toBe(1);
});

test('league points are each day\'s best, summed', function () {
    $player = User::factory()->withUsername('gunluk')->create();

    leagueRun($this, $player, 1000);
    leagueRun($this, $player, 3000);
    leagueRun($this, $player, 2000);
    Carbon::setTestNow(Carbon::parse('2026-09-24 12:00', 'Europe/Istanbul'));
    leagueRun($this, $player, 500);
    $this->signIn($player);

    $this->getJson('/api/v1/leagues/current')
        ->assertJsonPath('me.points', 3500)
        ->assertJsonPath('me.daysPlayed', 2);
});

test('a full group of thirty opens another', function () {
    foreach (range(1, 31) as $i) {
        leagueRun($this, User::factory()->withUsername("lig.{$i}")->create(), 1000 + $i);
    }

    expect(LeagueGroup::query()->orderBy('id')->pluck('members')->all())->toBe([30, 1])
        ->and(LeagueMember::query()->count())->toBe(31);
});

test('members are ranked by points, then by who joined first, with the zones and gaps', function () {
    $players = collect(range(1, 12))->map(fn (int $i) => User::factory()->withUsername("sira.{$i}")->create());
    Carbon::setTestNow(Carbon::parse('2026-09-23 12:00', 'Europe/Istanbul'));
    foreach ($players as $i => $player) {
        leagueRun($this, $player, 12000 - $i * 1000);
    }
    LeagueGroup::query()->update(['tier' => LeagueTier::Silver->value]);
    LeagueMember::query()->update(['tier' => LeagueTier::Silver->value]);
    $this->signIn($players[5]);

    $board = $this->getJson('/api/v1/leagues/current')->assertOk();

    $board->assertJsonPath('tier', 'silver')
        ->assertJsonPath('promoteCount', 2)
        ->assertJsonPath('demoteCount', 2)
        ->assertJsonPath('members.*.zone', ['promote', 'promote', 'stay', 'stay', 'stay', 'stay', 'stay', 'stay', 'stay', 'stay', 'demote', 'demote'])
        ->assertJsonPath('members.0.gap', null)
        ->assertJsonPath('members.1.gap', 1001)
        ->assertJsonPath('me.rank', 6)
        ->assertJsonPath('promotionGap', 11000 - 7000 + 1)
        ->assertJsonPath('nextRankProgress', intdiv(7000 * 1000, 8001));

    $this->signIn($players[0]);
    $this->getJson('/api/v1/leagues/current')
        ->assertJsonPath('me.rank', 1)
        ->assertJsonPath('promotionGap', null)
        ->assertJsonPath('nextRankProgress', null);
});

test('zones scale with the group, never above Elmas or below Bronz', function () {
    $leagues = app(LeagueService::class);

    expect($leagues->zones(LeagueTier::Gold, 30))->toBe([5, 5])
        ->and($leagues->zones(LeagueTier::Gold, 12))->toBe([2, 2])
        ->and($leagues->zones(LeagueTier::Gold, 6))->toBe([1, 1])
        ->and($leagues->zones(LeagueTier::Gold, 5))->toBe([0, 0])
        ->and($leagues->zones(LeagueTier::Bronze, 30))->toBe([5, 0])
        ->and($leagues->zones(LeagueTier::Diamond, 30))->toBe([0, 5]);
});

test('a finished week moves the top up and the bottom down the next time they play', function () {
    $players = collect(range(1, 12))->map(fn (int $i) => User::factory()->withUsername("hafta.{$i}")->create());
    foreach ($players as $i => $player) {
        leagueRun($this, $player, 12000 - $i * 1000);
    }
    LeagueGroup::query()->update(['tier' => LeagueTier::Silver->value]);
    LeagueMember::query()->update(['tier' => LeagueTier::Silver->value]);

    Carbon::setTestNow(Carbon::parse('2026-09-29 10:00', 'Europe/Istanbul')); // Tuesday, 2026-W40
    leagueRun($this, $players[0], 500);
    leagueRun($this, $players[5], 500);
    leagueRun($this, $players[11], 500);

    $tier = fn (User $player) => LeagueMember::query()->where('user_id', $player->id)->where('week_key', '2026-W40')->sole()->tier;
    expect($tier($players[0]))->toBe(LeagueTier::Gold)
        ->and($tier($players[5]))->toBe(LeagueTier::Silver)
        ->and($tier($players[11]))->toBe(LeagueTier::Bronze);
    expect(LeagueMember::query()->where('week_key', '2026-W39')->whereNull('settled_at')->count())->toBe(0)
        ->and(LeagueMember::query()->where('week_key', '2026-W39')->where('user_id', $players[1]->id)->sole()->outcome)->toBe(LeagueOutcome::Promoted);

    $this->signIn($players[0]);
    $this->getJson('/api/v1/leagues/current')
        ->assertJsonPath('tier', 'gold')
        ->assertJsonPath('lastWeek', [
            'weekKey' => '2026-W39',
            'tier' => 'silver',
            'rank' => 1,
            'members' => 12,
            'outcome' => 'promoted',
            'newTier' => 'gold',
        ]);
});

test('a week is never settled while it is still on', function () {
    $player = User::factory()->withUsername('erken')->create();
    leagueRun($this, $player, 1000);

    app(LeagueService::class)->settle(LeagueGroup::query()->sole());

    expect(LeagueMember::query()->sole()->settled_at)->toBeNull();
});

test('skipping a week keeps where the last league left the player', function () {
    $player = User::factory()->withUsername('ara.veren')->create();
    leagueRun($this, $player, 1000);
    foreach (range(1, 5) as $i) {
        leagueRun($this, User::factory()->withUsername("rakip.{$i}")->create(), 100 + $i);
    }

    Carbon::setTestNow(Carbon::parse('2026-10-08 10:00', 'Europe/Istanbul')); // two weeks on
    leagueRun($this, $player, 2000);

    expect(LeagueMember::query()->where('user_id', $player->id)->where('week_key', '2026-W41')->sole()->tier)->toBe(LeagueTier::Silver);
});

test('a flagged run seats nobody, and banned players drop out of the standings', function () {
    $this->signIn();
    $fixture = replayFixture('pro-42');
    $this->finishRun($this->startRunFor($fixture, startedSecondsAgo: 3), $fixture['actions'], $fixture['summary']['score'], $fixture['summary']['reels'])
        ->assertJsonPath('run.status', 'flagged')
        ->assertJsonPath('league', null);
    expect(LeagueMember::query()->count())->toBe(0);

    $cheat = User::factory()->withUsername('hileci')->create();
    $honest = User::factory()->withUsername('durust')->create();
    leagueRun($this, $cheat, 9000);
    leagueRun($this, $honest, 1000);
    $cheat->forceFill(['banned_at' => now()])->save();
    $this->signIn($honest);

    $this->getJson('/api/v1/leagues/current')->assertJsonPath('members.*.username', ['durust']);
});

test('the league needs a player and is throttled', function () {
    $this->assertApiError($this->getJson('/api/v1/leagues/current'), 401, 'unauthenticated');

    $this->signIn();
    for ($i = 0; $i < 60; $i++) {
        $this->getJson('/api/v1/leagues/current')->assertOk();
    }
    $this->assertApiError($this->getJson('/api/v1/leagues/current'), 429, 'too_many_requests');
});
