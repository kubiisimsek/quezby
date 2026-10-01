<?php

use App\Enums\LogLevel;
use App\Enums\LogSource;
use App\Models\PushToken;
use App\Models\SystemLog;
use App\Models\User;
use App\Services\AccountDeletion;
use App\Services\Logs\SystemLogger;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-10-01 12:00', 'Europe/Istanbul'));
    config(['quezby.logs.prune_odds' => 0]);
});

/** @return list<string> */
function logEvents(?LogSource $source = null): array
{
    return SystemLog::query()
        ->when($source, fn ($query) => $query->where('source', $source))
        ->orderBy('id')->pluck('event')->all();
}

/* ------------------------------------------------------------ the API -- */

test('an API error is a row with its code, message and the fields — never what was sent', function () {
    $me = $this->signIn();

    $this->withHeaders(['X-Device' => deviceHeaderOf(platform: 'android'), 'X-App-Version' => '1.2.3'])
        ->putJson('/api/v1/me/push-token', ['token' => 'kısa', 'platform' => 'android'])
        ->assertStatus(422);

    $row = SystemLog::query()->sole();
    expect($row->source)->toBe(LogSource::Api)
        ->and($row->level)->toBe(LogLevel::Warning)
        ->and($row->event)->toBe('validation_failed')
        ->and($row->status)->toBe(422)
        ->and($row->method)->toBe('PUT')
        ->and($row->path)->toBe('/api/v1/me/push-token')
        ->and($row->user_id)->toBe($me->id)
        ->and($row->platform)->toBe('android')
        ->and($row->app_version)->toBe('1.2.3')
        ->and($row->context['route'])->toBe('api/v1/me/push-token')
        ->and(array_keys($row->context['fields']))->toBe(['token'])
        ->and(json_encode($row->context))->not->toContain('kısa');
});

test('a 401 and a 404 are not kept; a 429 is, as info', function () {
    $this->getJson('/api/v1/me')->assertStatus(401);
    $this->signIn();
    $this->getJson('/api/v1/users/kimseyok')->assertStatus(404);
    expect(SystemLog::query()->count())->toBe(0);

    for ($i = 0; $i < 20; $i++) {
        $this->putJson('/api/v1/me/push-token', ['token' => 'fcm:'.str_repeat('a', 40), 'platform' => 'ios'])->assertNoContent();
    }
    $this->putJson('/api/v1/me/push-token', ['token' => 'fcm:'.str_repeat('a', 40), 'platform' => 'ios'])->assertStatus(429);

    $row = SystemLog::query()->where('source', LogSource::Api)->sole();
    expect($row->event)->toBe('too_many_requests')->and($row->level)->toBe(LogLevel::Info);
});

test('an exception is one row, with where it was thrown', function () {
    Route::middleware('api')->get('/api/v1/test-boom', fn () => throw new RuntimeException('Kaboom'));

    $this->getJson('/api/v1/test-boom')->assertStatus(500);

    $row = SystemLog::query()->sole();
    expect($row->event)->toBe('exception')
        ->and($row->level)->toBe(LogLevel::Error)
        ->and($row->status)->toBe(500)
        ->and($row->message)->toBe('RuntimeException: Kaboom')
        ->and($row->path)->toBe('/api/v1/test-boom')
        ->and($row->context['exception'])->toBe(RuntimeException::class)
        ->and($row->context['at'])->toStartWith('tests/Feature/LogsTest.php:');
});

test('an answer the API meant is not an exception row', function () {
    $this->signIn();
    $this->postJson('/api/v1/me/threads/kimseyok/messages', ['phrase' => 'gg']);

    expect(logEvents())->not->toContain('exception');
});

/* ------------------------------------------------------ outside calls -- */

test('a call to an outside service that cannot connect is a row', function () {
    Http::fake(['appleid.apple.com/*' => Http::failedConnection('cURL error 28: timed out')]);

    try {
        Http::post('https://appleid.apple.com/auth/revoke?client_secret=gizli', ['client_secret' => 'gizli']);
    } catch (ConnectionException) {
    }

    $row = SystemLog::query()->sole();
    expect($row->source)->toBe(LogSource::External)
        ->and($row->event)->toBe('apple')
        ->and($row->status)->toBeNull()
        ->and($row->path)->toBe('appleid.apple.com/auth/revoke')
        ->and($row->message)->toBe('Bağlantı kurulamadı: cURL error 28: timed out');
});

test('a successful outside call is not kept, and an unknown host is named by itself', function () {
    Http::fake(['example.com/*' => Http::sequence()->push('ok')->push('<h1>Bakımda</h1>', 503)]);

    Http::get('https://example.com/a');
    Http::get('https://example.com/b');

    $row = SystemLog::query()->sole();
    expect($row->event)->toBe('example.com')
        ->and($row->message)->toBe('503: Bakımda')
        ->and($row->context['response'])->toBe('Bakımda');
});

test('what a service answers keeps no secrets', function () {
    Http::fake(['oauth2.googleapis.com/*' => Http::response(['error' => 'invalid_grant', 'access_token' => 'sızmasın', 'nested' => ['private_key' => 'x']], 400)]);

    Http::post('https://oauth2.googleapis.com/token');

    $context = SystemLog::query()->sole()->context;
    expect($context['response']['access_token'])->toBe(SystemLogger::REDACTED)
        ->and($context['response']['nested']['private_key'])->toBe(SystemLogger::REDACTED)
        ->and(json_encode($context))->not->toContain('sızmasın');
});

/* --------------------------------------------------------- the phone -- */

test('a phone sends its errors in; they are rows of source app under the player', function () {
    $me = $this->signIn();

    $this->withHeaders(['X-Device' => deviceHeaderOf(platform: 'ios'), 'X-App-Version' => '1.0.4'])
        ->postJson('/api/v1/me/logs', ['entries' => [
            ['level' => 'error', 'event' => 'push.token', 'message' => 'messaging/unregistered', 'context' => ['permission' => 'granted', 'token' => 'fcm:abc'], 'at' => '2026-10-01T08:59:58.000Z'],
            ['level' => 'warning', 'event' => 'network', 'message' => 'Network request failed', 'context' => ['path' => '/me/inbox']],
        ]])
        ->assertNoContent();

    $rows = SystemLog::query()->orderBy('id')->get();
    expect($rows)->toHaveCount(2)
        ->and($rows[0]->source)->toBe(LogSource::App)
        ->and($rows[0]->level)->toBe(LogLevel::Error)
        ->and($rows[0]->event)->toBe('push.token')
        ->and($rows[0]->user_id)->toBe($me->id)
        ->and($rows[0]->platform)->toBe('ios')
        ->and($rows[0]->app_version)->toBe('1.0.4')
        ->and($rows[0]->context)->toBe(['permission' => 'granted', 'token' => SystemLogger::REDACTED, 'phoneAt' => '2026-10-01T08:59:58.000Z'])
        ->and($rows[1]->event)->toBe('network');
});

test('a phone log needs a player, a sound shape and a slow hand', function (array $body) {
    $this->signIn();
    $this->assertApiError($this->postJson('/api/v1/me/logs', $body), 422, 'validation_failed');
})->with([
    'nothing' => [[]],
    'no entries' => [['entries' => []]],
    'too many' => [['entries' => array_fill(0, 21, ['level' => 'info', 'event' => 'a', 'message' => 'b'])]],
    'a level of its own' => [['entries' => [['level' => 'fatal', 'event' => 'a', 'message' => 'b']]]],
    'an event with spaces' => [['entries' => [['level' => 'info', 'event' => 'push token', 'message' => 'b']]]],
    'a deep context' => [['entries' => [['level' => 'info', 'event' => 'a', 'message' => 'b', 'context' => ['x' => ['y' => 1]]]]]],
    'a key of its own' => [['entries' => [['level' => 'info', 'event' => 'a', 'message' => 'b', 'extra' => 1]]]],
]);

test('phone logs are for players, and throttled', function () {
    $body = ['entries' => [['level' => 'info', 'event' => 'a', 'message' => 'b']]];
    $this->assertApiError($this->postJson('/api/v1/me/logs', $body), 401, 'unauthenticated');

    $this->signIn();
    for ($i = 0; $i < 10; $i++) {
        $this->postJson('/api/v1/me/logs', $body)->assertNoContent();
    }
    $this->assertApiError($this->postJson('/api/v1/me/logs', $body), 429, 'too_many_requests');
});

/* -------------------------------------------------------- the logger -- */

test('values are cut to a length and a context to a size', function () {
    app(SystemLogger::class)->write(LogLevel::Info, LogSource::Api, str_repeat('e', 60), str_repeat('m', 600), [
        'path' => str_repeat('p', 300),
        'context' => ['long' => str_repeat('x', 2000), 'many' => array_fill(0, 40, str_repeat('y', 900))],
    ]);

    $row = SystemLog::query()->sole();
    expect(mb_strlen($row->event))->toBe(48)
        ->and(mb_strlen($row->message))->toBe(500)
        ->and(mb_strlen($row->path))->toBe(191)
        ->and(array_keys($row->context))->toBe(['truncated'])
        ->and(strlen($row->context['truncated']))->toBeLessThanOrEqual(8000);
});

/** @return array<string, int> `day|source|event|level` => total */
function logDays(): array
{
    return DB::table('system_log_days')->orderBy('id')->get()
        ->mapWithKeys(fn (object $row) => ["{$row->day}|{$row->source}|{$row->event}|{$row->level}" => (int) $row->total])
        ->all();
}

test('each level has its own budget a minute, so pushes never crowd out an error', function () {
    config(['quezby.logs.per_minute' => ['error' => 2, 'warning' => 2, 'info' => 3]]);
    $logger = app(SystemLogger::class);
    for ($i = 0; $i < 5; $i++) {
        $logger->write(LogLevel::Info, LogSource::Push, 'push.sent', 'b');
    }
    $logger->write(LogLevel::Error, LogSource::External, 'firebase', 'b');
    expect(SystemLog::query()->where('level', 'info')->count())->toBe(3)
        ->and(SystemLog::query()->where('level', 'error')->count())->toBe(1);

    Carbon::setTestNow(now()->addMinute());
    $logger->write(LogLevel::Info, LogSource::Push, 'push.sent', 'b');
    expect(SystemLog::query()->where('level', 'info')->count())->toBe(4);
});

test('every row is counted for good, dropped ones too, on the game’s day', function () {
    config(['quezby.logs.per_minute' => ['error' => 1, 'warning' => 1, 'info' => 1]]);
    $logger = app(SystemLogger::class);
    $logger->write(LogLevel::Info, LogSource::Push, 'push.sent', 'b');
    $logger->write(LogLevel::Info, LogSource::Push, 'push.sent', 'b');
    $logger->write(LogLevel::Error, LogSource::External, 'firebase', 'b');
    // 21:30 UTC is already the next day in Istanbul.
    Carbon::setTestNow(Carbon::parse('2026-10-01 21:30', 'UTC'));
    $logger->write(LogLevel::Info, LogSource::Push, 'push.sent', 'b');

    expect(logDays())->toBe([
        '2026-10-01|push|push.sent|info' => 2,
        '2026-10-01|external|firebase|error' => 1,
        '2026-10-02|push|push.sent|info' => 1,
    ]);
    expect(SystemLog::query()->count())->toBe(3);
});

test('rows go after the days of their level; the counts stay', function () {
    config(['quezby.logs.keep_days' => ['error' => 90, 'warning' => 14, 'info' => 3]]);
    $logger = app(SystemLogger::class);
    $logger->write(LogLevel::Info, LogSource::Push, 'push.sent', 'b');
    $logger->write(LogLevel::Warning, LogSource::Api, 'validation_failed', 'b');
    $logger->write(LogLevel::Error, LogSource::External, 'firebase', 'b');

    Carbon::setTestNow(now()->addDays(4));
    expect($logger->prune())->toBe(1)->and(logEvents())->toBe(['validation_failed', 'firebase']);
    Carbon::setTestNow(now()->addDays(11));
    expect($logger->prune())->toBe(1)->and(logEvents())->toBe(['firebase']);
    Carbon::setTestNow(now()->addDays(76));
    expect($logger->prune())->toBe(1)->and(logEvents())->toBe([]);

    expect(array_sum(logDays()))->toBe(3);
});

test('a write now and then prunes on its own', function () {
    config(['quezby.logs.prune_odds' => 1]);
    $logger = app(SystemLogger::class);
    $logger->write(LogLevel::Info, LogSource::Api, 'eski', 'b');
    Carbon::setTestNow(now()->addDays(4));
    $logger->write(LogLevel::Info, LogSource::Api, 'yeni', 'b');

    expect(logEvents())->toBe(['yeni']);
});

test('a deleted player takes their rows along', function () {
    $player = User::factory()->withUsername('gidiyor')->create();
    $other = User::factory()->withUsername('kaliyor')->create();
    PushToken::query()->create(['user_id' => $player->id, 'token' => 'fcm:'.str_repeat('a', 40), 'platform' => 'ios']);
    $logger = app(SystemLogger::class);
    $logger->write(LogLevel::Info, LogSource::App, 'a', 'b', ['userId' => $player->id]);
    $logger->write(LogLevel::Info, LogSource::App, 'a', 'b', ['userId' => $other->id]);

    app(AccountDeletion::class)->delete($player);

    expect(SystemLog::query()->pluck('user_id')->all())->toBe([$other->id]);
});
