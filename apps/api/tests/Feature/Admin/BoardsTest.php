<?php

use App\Enums\AdminRole;
use App\Enums\RunStatus;
use App\Game\Rules;
use App\Models\LeaderboardEntry;
use App\Models\Run;
use App\Models\User;
use App\Services\LeaderboardService;
use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-25 12:00', 'Europe/Istanbul'));
    $this->signInAdmin(AdminRole::Viewer);
});

/**
 * @param  array<string, string|int>  $query
 */
function adminBoard(array $query): TestResponse
{
    return test()->getJson('/api/v1/admin/boards?'.http_build_query($query));
}

/** A row of `$board` for a new player, without a run. */
function adminBoardRow(string $board, string $key, int $score, string $achievedAt = '2026-09-25 08:00:00.000', int $season = Rules::ENGINE_VERSION): LeaderboardEntry
{
    return LeaderboardEntry::query()->create([
        'season' => $season,
        'period' => $board,
        'period_key' => $key,
        'user_id' => User::factory()->withUsername()->create()->id,
        'score' => $score,
        'reels' => 100,
        'achieved_at' => Carbon::parse($achievedAt, 'UTC'),
    ]);
}

test('ranks a board the way the game does, ties shared', function () {
    adminBoardRow('challenge', '2026-09-25', 900);
    adminBoardRow('challenge', '2026-09-25', 500, '2026-09-25 07:00:00.000');
    adminBoardRow('challenge', '2026-09-25', 500, '2026-09-25 07:00:00.000');
    adminBoardRow('challenge', '2026-09-25', 500, '2026-09-25 09:00:00.000');

    adminBoard(['board' => 'challenge'])
        ->assertOk()
        ->assertJsonPath('key', '2026-09-25')
        ->assertJsonPath('season', Rules::ENGINE_VERSION)
        ->assertJsonPath('startsAt', '2026-09-24T21:00:00.000Z')
        ->assertJsonPath('endsAt', '2026-09-25T21:00:00.000Z')
        ->assertJsonPath('items.*.rank', [1, 2, 2, 4])
        ->assertJsonPath('items.*.score', [900, 500, 500, 500]);
});

test('carries the rank across pages, a tie included', function () {
    foreach (range(1, 24) as $i) {
        adminBoardRow('all', 'all', 10_000 - $i);
    }
    adminBoardRow('all', 'all', 100, '2026-09-25 07:00:00.000');
    adminBoardRow('all', 'all', 100, '2026-09-25 07:00:00.000');
    adminBoardRow('all', 'all', 50);

    adminBoard(['board' => 'all', 'page' => 2])
        ->assertJsonPath('total', 27)
        ->assertJsonPath('items.*.rank', [25, 27]);
});

test('shows the run behind a row and the signals it carries', function () {
    $player = User::factory()->withUsername('kerem.35')->create();
    $run = Run::factory()->for($player)->ranked(4000)->create(['flags' => [['code' => 'device_unverified', 'severity' => 'soft']]]);
    app(LeaderboardService::class)->record($run);

    adminBoard(['board' => 'weekly'])
        ->assertJsonPath('key', '2026-W39')
        ->assertJsonPath('items.0.player.username', 'kerem.35')
        ->assertJsonPath('items.0.run.id', $run->id)
        ->assertJsonPath('items.0.run.status', 'ranked')
        ->assertJsonPath('items.0.run.flags.0.code', 'device_unverified');
});

test('opens another period and another season', function () {
    adminBoardRow('monthly', '2026-08', 777);
    adminBoardRow('all', 'all', 555, season: 1);
    adminBoardRow('all', 'all', 666);

    adminBoard(['board' => 'monthly', 'key' => '2026-08'])->assertJsonPath('items.0.score', 777)->assertJsonPath('startsAt', '2026-07-31T21:00:00.000Z');
    adminBoard(['board' => 'all', 'season' => 1])->assertJsonPath('items.*.score', [555])->assertJsonPath('seasons', [Rules::ENGINE_VERSION, 1])->assertJsonPath('startsAt', null);
});

test('numbers a day of Günün akışı', function () {
    adminBoardRow('challenge', '2026-09-26', 300);

    adminBoard(['board' => 'challenge', 'key' => '2026-09-26'])->assertJsonPath('number', 3);
    adminBoard(['board' => 'weekly'])->assertJsonPath('number', null);
});

test('leaves a day before the first Günün akışı unnumbered', function () {
    adminBoardRow('challenge', '2026-09-23', 300);
    adminBoardRow('challenge', '2026-09-24', 400);

    adminBoard(['board' => 'challenge', 'key' => '2026-09-23'])->assertJsonPath('number', null);
    $this->getJson('/api/v1/admin/boards/keys?board=challenge')
        ->assertJsonPath('keys.*.key', ['2026-09-25', '2026-09-24', '2026-09-23'])
        ->assertJsonPath('keys.*.number', [2, 1, null]);
});

test('refuses a period that does not fit the board', function (array $query, string $field) {
    $this->assertApiError(adminBoard($query), 422, 'validation_failed')->assertJsonStructure(['error' => ['fields' => [$field]]]);
})->with([
    [['board' => 'weekly', 'key' => '2026-09-25'], 'key'],
    [['board' => 'challenge', 'key' => '2026-W39'], 'key'],
    // A day names no board.
    [['board' => 'daily'], 'board'],
    [['board' => 'all', 'key' => '2026'], 'key'],
    [['board' => 'yearly'], 'board'],
    [[], 'board'],
]);

test('lists the periods of a board, newest first, with their leader', function () {
    adminBoardRow('weekly', '2026-W38', 100);
    adminBoardRow('weekly', '2026-W38', 900);
    adminBoardRow('weekly', '2026-W39', 50);

    $this->getJson('/api/v1/admin/boards/keys?board=weekly')
        ->assertOk()
        ->assertJsonPath('keys.*.key', ['2026-W39', '2026-W38'])
        ->assertJsonPath('keys.1.players', 2)
        ->assertJsonPath('keys.1.topScore', 900)
        ->assertJsonPath('keys.1.number', null)
        ->assertJsonPath('keys.1.attempts', null);
});

test('lists Günün akışı with today first, even before anyone played', function () {
    adminBoardRow('challenge', '2026-09-24', 400);
    Run::factory()->daily('2026-09-24')->create(['status' => RunStatus::Abandoned]);
    Run::factory()->daily('2026-09-24')->ranked(400)->create();

    $this->getJson('/api/v1/admin/boards/keys?board=challenge')
        ->assertJsonPath('keys.*.key', ['2026-09-25', '2026-09-24'])
        ->assertJsonPath('keys.0.players', 0)
        ->assertJsonPath('keys.0.number', 2)
        ->assertJsonPath('keys.0.topPlayer', null)
        ->assertJsonPath('keys.1.number', 1)
        ->assertJsonPath('keys.1.attempts', 2);
});

test('lists no day board', function () {
    $this->assertApiError($this->getJson('/api/v1/admin/boards/keys?board=daily'), 422, 'validation_failed');
});
