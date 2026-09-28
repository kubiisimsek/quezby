<?php

use App\Enums\LeagueTier;
use App\Enums\RunStatus;
use App\Models\LeagueGroup;
use App\Models\LeagueMember;
use App\Models\Run;
use App\Models\User;
use App\Services\LeaderboardService;
use App\Services\LeagueService;
use Illuminate\Support\Carbon;

/*
| The league opens to a new player after twenty counted runs — ranked, and
| scoring (`leagues.unlock_runs`). The first-launch practice run never
| reaches the API and a VS never ranks, so neither counts. Once a player has
| sat in a league, it stays open to them.
*/

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-23 12:00', 'Europe/Istanbul')); // Wednesday, 2026-W39
});

test('the twentieth counted run opens the league', function () {
    $user = $this->signIn();
    $this->getJson('/api/v1/leagues/current')->assertOk()
        ->assertJsonPath('joined', false)
        ->assertJsonPath('unlock', ['required' => 20, 'remaining' => 20]);

    $this->playFeed()->assertOk()
        ->assertJsonPath('league', null)
        ->assertJsonPath('leagueUnlock', ['required' => 20, 'remaining' => 19]);
    Run::factory()->for($user)->ranked(100)->count(17)->create();
    $this->playFeed()->assertOk()
        ->assertJsonPath('league', null)
        ->assertJsonPath('leagueUnlock', ['required' => 20, 'remaining' => 1]);
    $this->getJson('/api/v1/leagues/current')
        ->assertJsonPath('joined', false)
        ->assertJsonPath('unlock', ['required' => 20, 'remaining' => 1]);

    $twentieth = $this->playFeed()->assertOk();

    $twentieth->assertJsonPath('league.tier', 'bronze')
        ->assertJsonPath('league.rank', 1)
        ->assertJsonPath('leagueUnlock', null);
    $this->getJson('/api/v1/leagues/current')
        ->assertJsonPath('joined', true)
        ->assertJsonPath('unlock', null)
        ->assertJsonPath('me.isMe', true);
});

test('runs that scored nothing, were flagged or are held do not count', function () {
    $user = $this->signIn();
    Run::factory()->for($user)->ranked(0)->create();
    Run::factory()->for($user)->ranked(5000)->create(['status' => RunStatus::Flagged]);
    Run::factory()->for($user)->ranked(5000)->create(['status' => RunStatus::Review]);
    Run::factory()->for($user)->create();

    $this->getJson('/api/v1/leagues/current')->assertJsonPath('unlock', ['required' => 20, 'remaining' => 20]);

    Run::factory()->for($user)->ranked(10)->create();
    $this->getJson('/api/v1/leagues/current')->assertJsonPath('unlock', ['required' => 20, 'remaining' => 19]);
});

test('only the player\'s own runs count', function () {
    $user = $this->signIn();
    Run::factory()->ranked(5000)->count(3)->create();

    $this->getJson('/api/v1/leagues/current')->assertJsonPath('unlock', ['required' => 20, 'remaining' => 20]);
    expect(app(LeagueService::class)->unlock($user))->toBe(['required' => 20, 'remaining' => 20]);
});

test('a player who has sat in a league before is seated on their first run', function () {
    $user = $this->signIn();
    $season = app(LeaderboardService::class)->season();
    $group = LeagueGroup::query()->create(['season' => $season, 'week_key' => '2026-W38', 'tier' => LeagueTier::Bronze, 'members' => 1]);
    LeagueMember::query()->create([
        'group_id' => $group->id,
        'user_id' => $user->id,
        'season' => $season,
        'week_key' => '2026-W38',
        'tier' => LeagueTier::Bronze,
        'joined_at' => now()->subWeek(),
    ]);

    $this->getJson('/api/v1/leagues/current')->assertJsonPath('unlock', null);
    $this->playFeed()->assertOk()
        ->assertJsonPath('league.tier', 'bronze')
        ->assertJsonPath('leagueUnlock', null);
});

test('the player who opens the league mid-week brings the week\'s earlier bests', function () {
    config(['quezby.leagues.unlock_runs' => 3]);
    $player = User::factory()->withUsername('hafta.ici')->create();
    $leagues = app(LeagueService::class);

    Carbon::setTestNow(Carbon::parse('2026-09-21 12:00', 'Europe/Istanbul')); // Monday
    expect($leagues->join($this->recordRanked($player, 1000)))->toBeNull();
    Carbon::setTestNow(Carbon::parse('2026-09-22 12:00', 'Europe/Istanbul'));
    expect($leagues->join($this->recordRanked($player, 2000)))->toBeNull();
    Carbon::setTestNow(Carbon::parse('2026-09-23 12:00', 'Europe/Istanbul'));

    $standing = $leagues->join($this->recordRanked($player, 3000));

    expect($standing)->toBe(['tier' => 'bronze', 'rank' => 1, 'members' => 1, 'zone' => 'stay', 'points' => 6000]);
});

test('how many runs open the league is read from config', function () {
    config(['quezby.leagues.unlock_runs' => 5]);
    $user = $this->signIn();
    Run::factory()->for($user)->ranked(100)->create();

    $this->getJson('/api/v1/leagues/current')->assertJsonPath('unlock', ['required' => 5, 'remaining' => 4]);
});
