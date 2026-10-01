<?php

use App\Enums\AdminRole;
use App\Enums\LogLevel;
use App\Enums\LogSource;
use App\Models\SystemLog;
use App\Models\User;
use App\Services\Logs\SystemLogger;
use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-10-01 12:00', 'Europe/Istanbul'));
    config(['quezby.logs.prune_odds' => 0]);
});

/**
 * @param  array<string, string|int>  $query
 */
function adminLogList(array $query = []): TestResponse
{
    return test()->getJson('/api/v1/admin/logs?'.http_build_query($query));
}

test('lists the logs newest first, with the player and everything a row holds', function () {
    $this->signInAdmin(AdminRole::Moderator);
    $ayse = User::factory()->withUsername('ayse')->create();
    $logger = app(SystemLogger::class);
    $logger->write(LogLevel::Info, LogSource::Push, 'push.sent', 'Firebase bildirimi kabul etti.', ['userId' => $ayse->id, 'platform' => 'ios', 'context' => ['kind' => 'vs_invite']]);
    Carbon::setTestNow(now()->addMinute());
    $logger->write(LogLevel::Error, LogSource::External, 'firebase', '403 PERMISSION_DENIED', [
        'status' => 403, 'method' => 'POST', 'path' => 'fcm.googleapis.com/v1/projects/q/messages:send', 'durationMs' => 120, 'userId' => $ayse->id,
    ]);

    adminLogList(['perPage' => 1])
        ->assertOk()
        ->assertJsonMissingPath('total')
        ->assertJsonPath('hasMore', true)
        ->assertJsonPath('events', ['firebase', 'push.sent'])
        ->assertJsonPath('items.0', [
            'id' => SystemLog::query()->max('id'),
            'at' => '2026-10-01T09:01:00.000Z',
            'level' => 'error',
            'source' => 'external',
            'event' => 'firebase',
            'message' => '403 PERMISSION_DENIED',
            'status' => 403,
            'method' => 'POST',
            'path' => 'fcm.googleapis.com/v1/projects/q/messages:send',
            'durationMs' => 120,
            'player' => ['id' => $ayse->id, 'username' => 'ayse'],
            'platform' => null,
            'appVersion' => null,
            'context' => null,
        ]);
    adminLogList(['page' => 2, 'perPage' => 1])
        ->assertJsonPath('items.0.context', ['kind' => 'vs_invite'])
        ->assertJsonPath('hasMore', false);
});

test('filters by level, source, event, player and status', function () {
    $this->signInAdmin(AdminRole::Owner);
    $ayse = User::factory()->withUsername('ayse')->create();
    $logger = app(SystemLogger::class);
    $logger->write(LogLevel::Warning, LogSource::Push, 'push.no_device', 'Cihaz yok', ['userId' => $ayse->id]);
    $logger->write(LogLevel::Warning, LogSource::Api, 'validation_failed', 'Platform gerekli.', ['status' => 422]);
    $logger->write(LogLevel::Error, LogSource::App, 'push.token', 'messaging/unregistered');

    adminLogList(['level' => 'error'])->assertJsonPath('items.*.event', ['push.token']);
    adminLogList(['source' => 'push'])->assertJsonPath('items.*.event', ['push.no_device'])->assertJsonPath('events', ['push.no_device']);
    adminLogList(['event' => 'validation_failed'])->assertJsonPath('items.*.status', [422]);
    adminLogList(['player' => strtoupper($ayse->id)])->assertJsonPath('items.*.event', ['push.no_device']);
    adminLogList(['status' => 422])->assertJsonCount(1, 'items');
});

test('a player deleted since is an id without a name', function () {
    $this->signInAdmin(AdminRole::Moderator);
    app(SystemLogger::class)->write(LogLevel::Info, LogSource::App, 'a', 'b', ['userId' => '01k6bjb5z3n4m3x0p1yq2r3s4t']);

    adminLogList()->assertJsonPath('items.0.player', ['id' => '01k6bjb5z3n4m3x0p1yq2r3s4t', 'username' => null]);
});

test('rejects filters it does not know', function (array $query) {
    $this->signInAdmin(AdminRole::Moderator);
    $this->assertApiError(adminLogList($query), 422, 'validation_failed');
})->with([
    'level' => [['level' => 'fatal']],
    'source' => [['source' => 'cron']],
    'player' => [['player' => 'ayse']],
    'status' => [['status' => 42]],
]);

test('the events a filter offers come from the kept days, whatever the rows', function () {
    $this->signInAdmin(AdminRole::Moderator);
    config(['quezby.logs.per_minute' => ['error' => 0, 'warning' => 0, 'info' => 0]]);
    app(SystemLogger::class)->write(LogLevel::Error, LogSource::External, 'apple', 'b');

    adminLogList()->assertJsonPath('items', [])->assertJsonPath('events', ['apple']);
});

/* ----------------------------------------------------------- summary -- */

test('sums the kept counts a day for thirty days, with the events seen most', function () {
    $this->signInAdmin(AdminRole::Moderator);
    $logger = app(SystemLogger::class);
    Carbon::setTestNow(Carbon::parse('2026-09-20 12:00', 'Europe/Istanbul'));
    $logger->write(LogLevel::Error, LogSource::External, 'firebase', 'b');
    // Before the thirty days: not counted.
    Carbon::setTestNow(Carbon::parse('2026-08-01 12:00', 'Europe/Istanbul'));
    $logger->write(LogLevel::Error, LogSource::External, 'firebase', 'b');
    Carbon::setTestNow(Carbon::parse('2026-10-01 12:00', 'Europe/Istanbul'));
    $logger->write(LogLevel::Info, LogSource::Push, 'push.sent', 'b');
    $logger->write(LogLevel::Info, LogSource::Push, 'push.sent', 'b');
    $logger->write(LogLevel::Warning, LogSource::Push, 'push.no_device', 'b');
    SystemLog::query()->delete();

    $response = $this->getJson('/api/v1/admin/logs/summary')->assertOk()
        ->assertJsonPath('range', '30d')
        ->assertJsonCount(30, 'buckets')
        ->assertJsonPath('buckets.0', ['key' => '2026-09-02', 'error' => 0, 'warning' => 0, 'info' => 0])
        ->assertJsonPath('buckets.18', ['key' => '2026-09-20', 'error' => 1, 'warning' => 0, 'info' => 0])
        ->assertJsonPath('buckets.29', ['key' => '2026-10-01', 'error' => 0, 'warning' => 1, 'info' => 2])
        ->assertJsonPath('totals', ['error' => 1, 'warning' => 1, 'info' => 2]);
    expect($response->json('top'))->toBe([
        ['source' => 'push', 'event' => 'push.sent', 'level' => 'info', 'total' => 2],
        ['source' => 'external', 'event' => 'firebase', 'level' => 'error', 'total' => 1],
        ['source' => 'push', 'event' => 'push.no_device', 'level' => 'warning', 'total' => 1],
    ]);
});

test('sums them a month for twelve months', function () {
    $this->signInAdmin(AdminRole::Owner);
    $logger = app(SystemLogger::class);
    Carbon::setTestNow(Carbon::parse('2025-11-30 12:00', 'Europe/Istanbul'));
    $logger->write(LogLevel::Error, LogSource::Api, 'exception', 'b');
    Carbon::setTestNow(Carbon::parse('2026-10-01 12:00', 'Europe/Istanbul'));
    $logger->write(LogLevel::Error, LogSource::Api, 'exception', 'b');

    $this->getJson('/api/v1/admin/logs/summary?range=12m')->assertOk()
        ->assertJsonCount(12, 'buckets')
        ->assertJsonPath('buckets.0', ['key' => '2025-11', 'error' => 1, 'warning' => 0, 'info' => 0])
        ->assertJsonPath('buckets.11', ['key' => '2026-10', 'error' => 1, 'warning' => 0, 'info' => 0])
        ->assertJsonPath('totals.error', 2);
});

test('a summary takes only the ranges it knows', function () {
    $this->signInAdmin(AdminRole::Moderator);
    $this->assertApiError($this->getJson('/api/v1/admin/logs/summary?range=10y'), 422, 'validation_failed');
});
