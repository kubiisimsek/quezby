<?php

use App\Enums\AdminRole;
use App\Enums\RunStatus;
use App\Models\Run;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-25 12:00', 'Europe/Istanbul'));
    $this->signInAdmin(AdminRole::Viewer);
});

/**
 * @param  array<string, string|int>  $query
 */
function adminSuspects(array $query = []): TestResponse
{
    return test()->getJson('/api/v1/admin/suspects?'.http_build_query($query));
}

/**
 * A run of `$player` with `$codes` on it, played `$daysAgo` days ago.
 *
 * @param  list<string>  $codes
 */
function adminSuspectRun(User $player, RunStatus $status, array $codes, int $daysAgo = 1, int $score = 1000): Run
{
    return Run::factory()->for($player)->ranked($score)->create([
        'status' => $status,
        'started_at' => now()->subDays($daysAgo),
        'flags' => array_map(fn (string $code) => ['code' => $code, 'severity' => 'hard'], $codes),
    ]);
}

test('puts the riskiest player first, and says what makes them risky', function () {
    $bot = User::factory()->withUsername('bot')->create();
    $borderline = User::factory()->withUsername('sinirda')->create();
    adminSuspectRun($bot, RunStatus::Flagged, ['checkpoint_forged', 'wall_clock'], score: 9000);
    adminSuspectRun($bot, RunStatus::Flagged, ['wall_clock']);
    adminSuspectRun($borderline, RunStatus::Review, ['reaction_cv', 'score_jump']);

    adminSuspects()
        ->assertOk()
        ->assertJsonPath('days', 30)
        ->assertJsonPath('items.*.player.username', ['bot', 'sinirda'])
        ->assertJsonPath('items.0.risk', 10 + 6 + 6)
        ->assertJsonPath('items.0.runs', ['flagged' => 2, 'review' => 0, 'rejected' => 0, 'signalled' => 0])
        ->assertJsonPath('items.0.codes', [
            ['code' => 'wall_clock', 'severity' => 'hard', 'count' => 2],
            ['code' => 'checkpoint_forged', 'severity' => 'hard', 'count' => 1],
        ])
        ->assertJsonPath('items.0.topScore', 9000)
        ->assertJsonPath('items.1.risk', 2 + 2)
        ->assertJsonPath('items.1.runs.review', 1)
        ->assertJsonPath('items.1.codes.0.severity', 'soft');
});

test('counts a ranked run\'s soft signal as signalled', function () {
    $player = User::factory()->withUsername('yumusak')->create();
    adminSuspectRun($player, RunStatus::Ranked, ['daily_shared_install']);

    adminSuspects()->assertJsonPath('items.0.runs.signalled', 1)->assertJsonPath('items.0.risk', 3);
});

test('leaves out a player below the threshold', function () {
    $player = User::factory()->withUsername('tek.sinyal')->create();
    adminSuspectRun($player, RunStatus::Ranked, ['slow_timing']);

    adminSuspects()->assertJsonPath('total', 0);
});

test('looks only as far back as asked', function () {
    $player = User::factory()->withUsername('eski')->create();
    adminSuspectRun($player, RunStatus::Flagged, ['wall_clock'], daysAgo: 10);

    adminSuspects(['days' => 7])->assertJsonPath('total', 0)->assertJsonPath('days', 7);
    adminSuspects(['days' => 30])->assertJsonPath('total', 1);
});

test('counts failed device checks and other accounts on the install', function () {
    $player = User::factory()->withUsername('rootlu')->create(['install_id' => 'install-1']);
    User::factory()->withUsername('ikinci')->create(['install_id' => 'install-1']);
    foreach (range(1, 5) as $ignored) {
        $player->deviceChecks()->create(['platform' => 'android', 'verdict' => 'fail', 'reason' => 'device', 'checked_at' => now()->subDay(), 'expires_at' => now()]);
    }

    adminSuspects()
        ->assertJsonPath('items.0.player.username', 'rootlu')
        ->assertJsonPath('items.0.deviceFails', 5)
        ->assertJsonPath('items.0.sharedInstall', 1)
        ->assertJsonPath('items.0.risk', 3 * 4 + 3)
        ->assertJsonPath('items.0.codes', []);
});

test('leaves banned players out unless asked for them', function () {
    $banned = User::factory()->withUsername('yasakli')->create(['banned_at' => now(), 'ban_reason' => 'Bot']);
    adminSuspectRun($banned, RunStatus::Flagged, ['wall_clock']);

    adminSuspects()->assertJsonPath('total', 0);
    adminSuspects(['includeBanned' => 1])->assertJsonPath('items.0.player.bannedAt', '2026-09-25T09:00:00.000Z');
});

test('pages its list', function () {
    foreach (range(1, 3) as $i) {
        adminSuspectRun(User::factory()->withUsername("bot{$i}")->create(), RunStatus::Flagged, ['wall_clock']);
    }

    adminSuspects(['perPage' => 2, 'page' => 2])->assertJsonPath('total', 3)->assertJsonPath('page', 2)->assertJsonCount(1, 'items');
});

test('looks back 7 or 30 days, nothing else', function (array $query, string $field) {
    $this->assertApiError(adminSuspects($query), 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => [$field]]]);
})->with([
    [['days' => 14], 'days'],
    [['includeBanned' => 'evet'], 'includeBanned'],
]);
