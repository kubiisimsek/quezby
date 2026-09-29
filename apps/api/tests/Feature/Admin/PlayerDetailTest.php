<?php

use App\Enums\AdminRole;
use App\Enums\AuditAction;
use App\Enums\RunStatus;
use App\Models\AuditEntry;
use App\Models\Run;
use App\Models\User;
use App\Services\Admin\AuditLog;
use App\Support\Actor;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-25 12:00', 'Europe/Istanbul'));
});

function adminPlayerDetail(User $player): TestResponse
{
    return test()->getJson("/api/v1/admin/players/{$player->id}");
}

test('shows everything about a player on one page', function () {
    $this->signInAdmin(AdminRole::Viewer);
    $player = User::factory()->withUsername('kerem.35')->linked('kerem@quezby.com')->locale('ar')->create(['platform' => 'ios', 'install_id' => 'install-1']);
    $player->identities()->create(['provider' => 'apple', 'subject' => 'a-1', 'email' => 'k@privaterelay.appleid.com', 'email_verified' => true, 'apple_refresh_token' => 'secret-refresh']);
    $twin = User::factory()->withUsername('kerem.yedek')->create(['install_id' => 'install-1']);
    $best = $this->recordRanked($player, 9000);
    $best->forceFill(['started_at' => now()->subHour()])->save();
    Run::factory()->for($player)->ranked(300)->create([
        'status' => RunStatus::Flagged,
        'flags' => [['code' => 'wall_clock', 'elapsedMs' => 1000, 'neededMs' => 90000, 'severity' => 'hard']],
    ]);
    $player->deviceChecks()->create(['platform' => 'ios', 'verdict' => 'fail', 'reason' => 'counter', 'details' => ['keyId' => 'k'], 'checked_at' => now(), 'expires_at' => now()->addHours(12)]);
    $player->createToken('ios');
    $this->befriend($twin, $player);
    $this->block(User::factory()->withUsername('rahatsiz')->create(), $player);

    $response = adminPlayerDetail($player)->assertOk();

    $response
        ->assertJsonPath('player.username', 'kerem.35')
        ->assertJsonPath('player.email', 'kerem@quezby.com')
        ->assertJsonPath('player.identities', ['apple'])
        ->assertJsonPath('player.locale', 'ar')
        ->assertJsonPath('player.identityDetails.0.provider', 'apple')
        ->assertJsonPath('player.identityDetails.0.emailVerified', true)
        ->assertJsonPath('player.installId', 'install-1')
        ->assertJsonPath('player.sessions', 1)
        ->assertJsonPath('player.isGuest', false)
        ->assertJsonPath('season', 2)
        ->assertJsonPath('best.score', 9000)
        ->assertJsonPath('best.runId', $best->id)
        ->assertJsonPath('ranks.all', 1)
        ->assertJsonPath('runs', ['flagged' => 1, 'ranked' => 1])
        ->assertJsonPath('recentRuns.0.status', 'flagged')
        ->assertJsonPath('recentRuns.0.flags.0', ['code' => 'wall_clock', 'severity' => 'hard', 'details' => ['elapsedMs' => 1000, 'neededMs' => 90000]])
        ->assertJsonPath('flags', [['code' => 'wall_clock', 'severity' => 'hard', 'count' => 1]])
        ->assertJsonPath('devices.0.verdict', 'fail')
        ->assertJsonPath('devices.0.reason', 'counter')
        ->assertJsonPath('sameInstall.0.username', 'kerem.yedek')
        ->assertJsonPath('social', ['friends' => 1, 'blockedBy' => 1]);

    expect($response->getContent())->not->toContain('secret-refresh')
        ->and($response->json('recentRuns.0'))->not->toHaveKey('actions');
});

test('shows the phones the player used, with the other accounts seen on them, and the consent', function () {
    $this->signInAdmin(AdminRole::Viewer);
    $player = User::factory()->withUsername('kerem.35')->consenting()->create();
    $other = User::factory()->withUsername('kerem.yedek')->create();
    $seen = fn (int $daysAgo) => now()->subDays($daysAgo)->utc()->format('Y-m-d H:i:s');
    DB::table('player_devices')->insert([
        ['user_id' => $player->id, 'install_id' => 'install-old', 'platform' => 'ios', 'os_version' => '17.5', 'model' => 'iPhone 12', 'app_version' => '0.9.0', 'app_build' => '30', 'first_seen_at' => $seen(40), 'last_seen_at' => $seen(20)],
        ['user_id' => $player->id, 'install_id' => 'install-new', 'platform' => 'ios', 'os_version' => '18.2', 'model' => 'iPhone 15 Pro', 'app_version' => '1.0.0', 'app_build' => '42', 'first_seen_at' => $seen(3), 'last_seen_at' => $seen(0)],
        ['user_id' => $other->id, 'install_id' => 'install-new', 'platform' => 'ios', 'os_version' => '18.2', 'model' => 'iPhone 15 Pro', 'app_version' => '1.0.0', 'app_build' => '42', 'first_seen_at' => $seen(1), 'last_seen_at' => $seen(1)],
    ]);

    $response = adminPlayerDetail($player)->assertOk()
        ->assertJsonPath('player.analyticsAt', '2026-09-25T09:00:00.000Z');

    expect(array_column($response->json('installs'), 'installId'))->toBe(['install-new', 'install-old'])
        ->and($response->json('installs.0'))->toMatchArray([
            'platform' => 'ios',
            'osVersion' => '18.2',
            'model' => 'iPhone 15 Pro',
            'appVersion' => '1.0.0',
            'appBuild' => '42',
            'firstSeenAt' => '2026-09-22T09:00:00.000Z',
            'lastSeenAt' => '2026-09-25T09:00:00.000Z',
        ])
        ->and($response->json('installs.0.others'))->toBe([['id' => $other->id, 'username' => 'kerem.yedek', 'bannedAt' => null]])
        ->and($response->json('installs.1.others'))->toBe([]);
});

test('a player who has not said yes shows no consent', function () {
    $this->signInAdmin(AdminRole::Viewer);
    $player = User::factory()->withUsername()->create();

    adminPlayerDetail($player)->assertOk()->assertJsonPath('player.analyticsAt', null)->assertJsonPath('installs', []);
});

test('a banned player shows why', function () {
    $this->signInAdmin(AdminRole::Viewer);
    $player = User::factory()->withUsername('hileci')->create(['banned_at' => now(), 'ban_reason' => 'Hız hilesi']);

    adminPlayerDetail($player)
        ->assertOk()
        ->assertJsonPath('player.banReason', 'Hız hilesi')
        ->assertJsonPath('player.bannedAt', '2026-09-25T09:00:00.000Z')
        ->assertJsonMissingPath('league');
});

test('only an owner sees where an action on the player came from', function (AdminRole $role, ?string $ip) {
    $player = User::factory()->withUsername('kerem.35')->create();
    app(AuditLog::class)->record(Actor::cli(), AuditAction::PlayerBan, $player, 'Bot');
    AuditEntry::query()->update(['ip' => '10.0.0.7']);
    $this->signInAdmin($role);

    adminPlayerDetail($player)
        ->assertJsonPath('audit.0.action', 'player.ban')
        ->assertJsonPath('audit.0.reason', 'Bot')
        ->assertJsonPath('audit.0.ip', $ip);
})->with([
    'an owner' => [AdminRole::Owner, '10.0.0.7'],
    'a moderator' => [AdminRole::Moderator, null],
]);

test('an unknown player is not found', function () {
    $this->signInAdmin(AdminRole::Viewer);

    $this->assertApiError($this->getJson('/api/v1/admin/players/01jzzzzzzzzzzzzzzzzzzzzzzz'), 404, 'not_found');
    $this->assertApiError($this->getJson('/api/v1/admin/players/kerem.35'), 404, 'not_found');
});
