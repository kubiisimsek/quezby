<?php

use App\Enums\AdminRole;
use App\Enums\RunMode;
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
function adminRunsList(array $query = []): TestResponse
{
    return test()->getJson('/api/v1/admin/runs?'.http_build_query($query));
}

test('lists runs newest first, with their player and signals but not their log', function () {
    $player = User::factory()->withUsername('kerem.35')->create();
    $old = Run::factory()->for($player)->ranked(100)->create(['started_at' => now()->subHour(), 'actions' => [[1, 400, 0]]]);
    $new = Run::factory()->for($player)->ranked(900)->create([
        'status' => RunStatus::Flagged,
        'flags' => [['code' => 'wall_clock', 'elapsedMs' => 1000, 'neededMs' => 9000, 'severity' => 'hard']],
    ]);

    $response = adminRunsList()
        ->assertOk()
        ->assertJsonPath('items.*.id', [$new->id, $old->id])
        ->assertJsonPath('items.0.player', ['id' => $player->id, 'username' => 'kerem.35', 'bannedAt' => null])
        ->assertJsonPath('items.0.status', 'flagged')
        ->assertJsonPath('items.0.flags.0.code', 'wall_clock')
        ->assertJsonPath('items.0.flags.0.details', ['elapsedMs' => 1000, 'neededMs' => 9000])
        ->assertJsonPath('counts', ['flagged' => 1, 'ranked' => 1]);

    expect($response->json('items.1'))->not->toHaveKey('actions')->not->toHaveKey('stats');
});

test('filters by status, mode, flag and player', function () {
    $kerem = User::factory()->withUsername('kerem.35')->create();
    $ekin = User::factory()->withUsername('ekin')->create();
    Run::factory()->for($kerem)->ranked(100)->create(['flags' => [['code' => 'slow_timing', 'severity' => 'soft']]]);
    Run::factory()->for($kerem)->ranked(100)->daily('2026-09-25')->create(['status' => RunStatus::Review, 'flags' => [['code' => 'reaction_cv', 'severity' => 'soft']]]);
    Run::factory()->for($ekin)->ranked(100)->create(['status' => RunStatus::Flagged, 'flags' => [['code' => 'slow_motion', 'severity' => 'hard']]]);

    adminRunsList(['status' => 'review'])->assertJsonPath('total', 1)->assertJsonPath('items.0.status', 'review');
    adminRunsList(['mode' => 'daily'])->assertJsonPath('total', 1)->assertJsonPath('items.0.dailyKey', '2026-09-25');
    adminRunsList(['flag' => 'slow_timing'])->assertJsonPath('total', 1)->assertJsonPath('items.0.flags.0.code', 'slow_timing');
    adminRunsList(['player' => $ekin->id])->assertJsonPath('total', 1)->assertJsonPath('items.0.player.username', 'ekin');
    adminRunsList(['player' => $kerem->id])->assertJsonPath('counts', ['ranked' => 1, 'review' => 1]);
});

test('filters by the game\'s days: Istanbul midnight turns them', function () {
    $player = User::factory()->withUsername('kerem.35')->create();
    $late = Run::factory()->for($player)->ranked(1)->create(['started_at' => Carbon::parse('2026-09-24 20:59:59.999', 'UTC')]);
    $early = Run::factory()->for($player)->ranked(2)->create(['started_at' => Carbon::parse('2026-09-24 21:00:00.000', 'UTC')]);

    adminRunsList(['from' => '2026-09-25'])->assertJsonPath('items.*.id', [$early->id]);
    adminRunsList(['to' => '2026-09-24'])->assertJsonPath('items.*.id', [$late->id]);
    adminRunsList(['from' => '2026-09-24', 'to' => '2026-09-25'])->assertJsonPath('total', 2);
});

test('sorts by score, the unfinished last', function () {
    $player = User::factory()->withUsername('kerem.35')->create();
    Run::factory()->for($player)->create();
    Run::factory()->for($player)->ranked(500)->create();
    Run::factory()->for($player)->ranked(9000)->create();

    adminRunsList(['sort' => 'score'])->assertJsonPath('items.*.score', [9000, 500, null]);
});

test('refuses a filter it does not know', function (array $query, string $field) {
    $this->assertApiError(adminRunsList($query), 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => [$field]]]);
})->with([
    [['status' => 'cheated'], 'status'],
    [['mode' => 'ranked'], 'mode'],
    [['flag' => 'wall'], 'flag'],
    [['player' => 'kerem.35'], 'player'],
    [['from' => '25.09.2026'], 'from'],
    [['sort' => 'random'], 'sort'],
]);

test('knows a daily run by its mode', function () {
    Run::factory()->ranked(100)->daily('2026-09-25')->create();

    adminRunsList()->assertJsonPath('items.0.mode', RunMode::Daily->value);
});
