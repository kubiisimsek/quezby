<?php

use App\Enums\RunStatus;
use App\Models\LeaderboardEntry;
use App\Models\Run;
use App\Models\User;
use App\Services\DailyService;
use Illuminate\Support\Carbon;

/*
| "Günün akışı": everyone plays the same feed each Istanbul day, once.
*/

beforeEach(function () {
    config(['quezby.daily.secret' => 'daily-test-secret', 'quezby.daily.epoch' => '2026-09-24']);
    Carbon::setTestNow(Carbon::parse('2026-09-26 12:00', 'Europe/Istanbul'));
});

test('everyone gets the same seed on the same Istanbul day', function () {
    $this->signIn();
    $mine = $this->startRun(['mode' => 'daily'])->assertCreated();
    $this->signIn();
    $theirs = $this->startRun(['mode' => 'daily'])->assertCreated();

    expect($mine->json('seed'))->toBe($theirs->json('seed'))
        ->and($mine->json('mode'))->toBe('daily')
        ->and($mine->json('dayKey'))->toBe('2026-09-26');
});

test('the seed changes at Istanbul midnight', function () {
    $this->signIn();
    $today = $this->startRun(['mode' => 'daily'])->json('seed');

    Carbon::setTestNow(Carbon::parse('2026-09-27 00:01', 'Europe/Istanbul'));
    $this->signIn();
    $tomorrow = $this->startRun(['mode' => 'daily'])->assertCreated();

    expect($tomorrow->json('seed'))->not->toBe($today)->and($tomorrow->json('dayKey'))->toBe('2026-09-27');
});

test('a player gets one attempt a day, finished or not', function () {
    $this->signIn();
    $this->startRun(['mode' => 'daily'])->assertCreated();

    $this->assertApiError($this->startRun(['mode' => 'daily']), 409, 'daily_already_played');
    $this->startRun()->assertCreated();
    $this->assertApiError($this->startRun(['mode' => 'daily']), 409, 'daily_already_played');
});

test('the daily run ranks on the challenge board and on the calendar boards', function () {
    $user = $this->signIn();

    $response = $this->playFeed('daily')->assertOk()->assertJsonPath('run.mode', 'daily')->assertJsonPath('run.status', 'ranked');

    expect(LeaderboardEntry::query()->where('user_id', $user->id)->pluck('period')->map->value->all())
        ->toEqualCanonicalizing(['daily', 'weekly', 'monthly', 'all', 'challenge']);
    $response->assertJsonPath('daily.dayKey', '2026-09-26')
        ->assertJsonPath('daily.number', 3)
        ->assertJsonPath('daily.rank', 1)
        ->assertJsonPath('daily.players', 1);
    expect($response->json('daily.grid'))->toMatch('/^(🟩|🟨|🟥)*⬛$/u')
        ->and($response->json('daily.shareText'))->toContain('Quezby · Günün akışı #3')
        ->toContain($response->json('daily.grid'))
        ->toContain('#1/1');
});

test('today\'s state follows the one attempt from start to result', function () {
    $this->signIn();

    $this->getJson('/api/v1/daily')->assertOk()
        ->assertJsonPath('dayKey', '2026-09-26')
        ->assertJsonPath('number', 3)
        ->assertJsonPath('endsAt', '2026-09-26T21:00:00.000Z')
        ->assertJsonPath('attempt', null)
        ->assertJsonPath('players', 0);

    $run = $this->startRun(['mode' => 'daily'])->json('runId');
    $this->getJson('/api/v1/daily')->assertJsonPath('attempt.status', 'unfinished');

    Run::query()->whereKey($run)->update(['status' => RunStatus::Abandoned->value, 'open_user_id' => null]);
    $this->getJson('/api/v1/daily')->assertJsonPath('attempt.status', 'void');
});

test('a finished attempt shows its rank, grid and share text; others see the top', function () {
    $first = $this->signIn();
    $this->playFeed('daily', reels: 80)->assertOk();
    $second = $this->signIn();
    $this->playFeed('daily', reels: 40)->assertOk();

    $state = $this->getJson('/api/v1/daily')->assertOk();
    $state->assertJsonPath('attempt.status', 'ranked')
        ->assertJsonPath('attempt.rank', 2)
        ->assertJsonPath('players', 2)
        ->assertJsonPath('top.0.username', $first->username)
        ->assertJsonPath('me.username', $second->username);
    expect($state->json('attempt.shareText'))->toContain('#2/2');
});

test('the grid reads each level of the run, the last one black', function () {
    $daily = app(DailyService::class);

    expect($daily->grid([0, 1, 2, 3, 0]))->toBe('🟩🟨🟨🟥⬛')
        ->and($daily->grid([4]))->toBe('⬛')
        ->and($daily->grid([]))->toBe('⬛');
});

test('the challenge is numbered from the first day', function () {
    $daily = app(DailyService::class);

    expect($daily->number('2026-09-24'))->toBe(1)
        ->and($daily->number('2026-10-24'))->toBe(31)
        ->and($daily->number('2026-01-01'))->toBe(1);
});

test('a second account on one phone playing the same feed is a soft signal', function () {
    User::factory()->withUsername('ilk.hesap')->create(['install_id' => 'phone-1'])
        ->runs()->create(['seed' => 1, 'engine_version' => 2, 'status' => RunStatus::Started, 'mode' => 'daily', 'daily_key' => '2026-09-26', 'started_at' => now()]);
    $this->signIn(User::factory()->withUsername('ikinci.hesap')->create(['install_id' => 'phone-1']));

    $response = $this->playFeed('daily')->assertOk();

    expect(collect(Run::query()->findOrFail($response->json('run.runId'))->flags)->pluck('code')->all())->toContain('daily_shared_install');
});

test('daily state needs a player and is throttled', function () {
    $this->assertApiError($this->getJson('/api/v1/daily'), 401, 'unauthenticated');

    $this->signIn();
    for ($i = 0; $i < 60; $i++) {
        $this->getJson('/api/v1/daily')->assertOk();
    }
    $this->assertApiError($this->getJson('/api/v1/daily'), 429, 'too_many_requests');
});
