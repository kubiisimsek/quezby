<?php

use App\Enums\AdminRole;
use App\Enums\LeagueTier;
use App\Models\LeaderboardEntry;
use App\Models\LeagueGroup;
use App\Models\LeagueMember;
use App\Models\User;
use Illuminate\Support\Carbon;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-23 12:00', 'Europe/Istanbul')); // Wednesday, 2026-W39
    $this->signInAdmin(AdminRole::Viewer);
});

/**
 * A group of `$tier` in `$week` with a member per points total, in order of
 * joining; each gets a daily board row worth their points.
 *
 * @param  array<string, int>  $points  username → points
 */
function adminLeagueGroup(string $week, LeagueTier $tier, array $points, string $day = '2026-09-22'): LeagueGroup
{
    $group = LeagueGroup::query()->create(['season' => 2, 'week_key' => $week, 'tier' => $tier, 'members' => count($points)]);
    $joined = 0;
    foreach ($points as $username => $score) {
        $player = User::factory()->withUsername($username)->create();
        LeagueMember::query()->create([
            'group_id' => $group->id, 'user_id' => $player->id, 'season' => 2, 'week_key' => $week, 'tier' => $tier,
            'joined_at' => Carbon::parse('2026-09-21 10:00', 'UTC')->addMinutes($joined++),
        ]);
        if ($score > 0) {
            LeaderboardEntry::query()->create(['season' => 2, 'period' => 'daily', 'period_key' => $day, 'user_id' => $player->id, 'score' => $score, 'reels' => 10, 'achieved_at' => now()]);
        }
    }

    return $group;
}

test('lists this week\'s groups, the highest tier first, and who sits in each tier', function () {
    $gold = adminLeagueGroup('2026-W39', LeagueTier::Gold, ['a1' => 10, 'a2' => 5]);
    $bronze = adminLeagueGroup('2026-W39', LeagueTier::Bronze, ['b1' => 1]);
    adminLeagueGroup('2026-W38', LeagueTier::Gold, ['c1' => 3], '2026-09-15');

    $this->getJson('/api/v1/admin/leagues')
        ->assertOk()
        ->assertJsonPath('weekKey', '2026-W39')
        ->assertJsonPath('weeks', ['2026-W39', '2026-W38'])
        ->assertJsonPath('items.*.id', [$gold->id, $bronze->id])
        ->assertJsonPath('items.0.tier', 'gold')
        ->assertJsonPath('items.0.members', 2)
        ->assertJsonPath('items.0.settled', false)
        ->assertJsonPath('tiers', ['bronze' => 1, 'silver' => 0, 'gold' => 2, 'platinum' => 0, 'diamond' => 0]);

    $this->getJson('/api/v1/admin/leagues?tier=bronze')->assertJsonPath('items.*.id', [$bronze->id]);
    $this->getJson('/api/v1/admin/leagues?week=2026-W38')->assertJsonPath('total', 1);
});

test('shows a group\'s table with zones, and its banned members apart', function () {
    // Eleven stand once the banned one sits out: ⌊11 × 5 / 30⌋ = 1 goes up and 1 down.
    $points = [];
    foreach (range(1, 12) as $i) {
        $points["p{$i}"] = 1000 - $i;
    }
    $group = adminLeagueGroup('2026-W39', LeagueTier::Silver, $points);
    User::query()->where('username', 'p1')->update(['banned_at' => now()]);

    $this->getJson("/api/v1/admin/leagues/groups/{$group->id}")
        ->assertOk()
        ->assertJsonPath('group.tier', 'silver')
        ->assertJsonPath('group.weekKey', '2026-W39')
        ->assertJsonPath('group.startsAt', '2026-09-20T21:00:00.000Z')
        ->assertJsonPath('promoteCount', 1)
        ->assertJsonPath('demoteCount', 1)
        ->assertJsonPath('standings.0.player.username', 'p2')
        ->assertJsonPath('standings.0.points', 998)
        ->assertJsonPath('standings.0.zone', 'promote')
        ->assertJsonPath('standings.1.zone', 'stay')
        ->assertJsonPath('standings.10.zone', 'demote')
        ->assertJsonCount(11, 'standings')
        ->assertJsonPath('standings.0.finalRank', null)
        ->assertJsonPath('banned.0.username', 'p1');
});

test('settles a finished week when it is looked at', function () {
    $group = adminLeagueGroup('2026-W38', LeagueTier::Gold, ['once' => 900, 'sonra' => 100], '2026-09-15');

    $this->getJson("/api/v1/admin/leagues/groups/{$group->id}")
        ->assertJsonPath('group.settled', true)
        ->assertJsonPath('standings.0.finalRank', 1)
        ->assertJsonPath('standings.0.outcome', 'stayed');
});

test('an unknown group is not found, and a malformed week is refused', function () {
    $this->assertApiError($this->getJson('/api/v1/admin/leagues/groups/999'), 404, 'not_found');
    $this->assertApiError($this->getJson('/api/v1/admin/leagues?week=2026-39'), 422, 'validation_failed');
    $this->assertApiError($this->getJson('/api/v1/admin/leagues?tier=wood'), 422, 'validation_failed');
});
