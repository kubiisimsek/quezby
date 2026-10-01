<?php

use App\Models\PushToken;
use App\Models\SystemLog;
use App\Models\User;
use App\Services\Push\PushService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-24 12:00', 'Europe/Istanbul'));
    $key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
    openssl_pkey_export($key, $pem);
    $path = sys_get_temp_dir().'/quezby-fcm-'.getmypid().'.json';
    file_put_contents($path, json_encode(['client_email' => 'push@quezby.iam.gserviceaccount.com', 'private_key' => $pem, 'private_key_id' => 'k1']));
    config(['quezby.push.project_id' => 'quezby-test', 'quezby.push.credentials' => $path, 'quezby.push.enabled' => true]);
    // What Firebase answers a push; a test may change it.
    $this->fcmAnswer = fn () => Http::response(['name' => 'projects/quezby-test/messages/1']);
    $this->oauthAnswer = fn () => Http::response(['access_token' => 'fcm-token', 'expires_in' => 3600]);
    Http::fake([
        'oauth2.googleapis.com/*' => fn () => ($this->oauthAnswer)(),
        'fcm.googleapis.com/*' => fn () => ($this->fcmAnswer)(),
    ]);
});

/** A token of the right shape. */
function pushToken(string $tail = 'a'): string
{
    return 'fcm:'.str_repeat($tail, 40);
}

/** @return list<array{token: string, body: string, data: array<string, string>}> */
function sentPushes(): array
{
    return collect(Http::recorded())
        ->map(fn (array $pair) => $pair[0])
        ->filter(fn (Request $request) => str_starts_with($request->url(), 'https://fcm.googleapis.com/'))
        ->map(fn (Request $request) => [
            'token' => $request['message']['token'],
            'body' => $request['message']['notification']['body'],
            'data' => $request['message']['data'],
        ])->values()->all();
}

test('a phone registers its token, and it moves with the phone to another account', function () {
    $first = $this->signIn();
    $this->putJson('/api/v1/me/push-token', ['token' => pushToken(), 'platform' => 'ios'])->assertNoContent();
    $this->putJson('/api/v1/me/push-token', ['token' => pushToken(), 'platform' => 'ios'])->assertNoContent();

    $second = $this->signIn();
    $this->putJson('/api/v1/me/push-token', ['token' => pushToken(), 'platform' => 'ios'])->assertNoContent();

    expect(PushToken::query()->sole()->user_id)->toBe($second->id)
        ->and($first->pushTokens()->count())->toBe(0);
});

test('signing out takes the token off; a player keeps only so many phones', function () {
    config(['quezby.push.tokens_per_player' => 2]);
    $me = $this->signIn();
    foreach (['a', 'b', 'c'] as $i => $tail) {
        Carbon::setTestNow(now()->addMinute());
        $this->putJson('/api/v1/me/push-token', ['token' => pushToken($tail), 'platform' => 'android'])->assertNoContent();
    }
    expect($me->pushTokens()->pluck('token')->sort()->values()->all())->toBe([pushToken('b'), pushToken('c')]);

    $this->deleteJson('/api/v1/me/push-token', ['token' => pushToken('c')])->assertNoContent();
    $this->deleteJson('/api/v1/me/push-token', ['token' => pushToken('c')])->assertNoContent();
    expect($me->pushTokens()->pluck('token')->all())->toBe([pushToken('b')]);
});

test('a token must look like one', function (array $body) {
    $this->signIn();

    $this->assertApiError($this->putJson('/api/v1/me/push-token', $body), 422, 'validation_failed');
})->with([
    'short' => [['token' => 'abc', 'platform' => 'ios']],
    'spaces' => [['token' => str_repeat('a b', 10), 'platform' => 'ios']],
    'another platform' => [['token' => pushToken(), 'platform' => 'web']],
]);

test('a friend request pushes to the phones of the one asked, in their language', function () {
    $ayse = User::factory()->withUsername('ayse')->locale('en')->create();
    PushToken::query()->create(['user_id' => $ayse->id, 'token' => pushToken(), 'platform' => 'ios']);
    $this->signIn(User::factory()->withUsername('ben')->create());

    $this->putJson('/api/v1/users/ayse/friend')->assertJsonPath('relation', 'requested');

    expect(sentPushes())->toBe([[
        'token' => pushToken(),
        'body' => '@ben sent you a friend request.',
        'data' => ['kind' => 'friend_request', 'username' => 'ben'],
    ]]);
});

test('a VS invite and its result push; turning one down does not', function () {
    $me = User::factory()->withUsername('ben')->create();
    $ekin = User::factory()->withUsername('ekin')->create();
    $this->befriend($me, $ekin);
    PushToken::query()->create(['user_id' => $me->id, 'token' => pushToken('m'), 'platform' => 'ios']);
    PushToken::query()->create(['user_id' => $ekin->id, 'token' => pushToken('e'), 'platform' => 'android']);

    $this->signIn($me);
    $duelId = $this->playFeed('vs', 60, body: ['opponent' => 'ekin'])->json('duel.id');
    expect(sentPushes())->toHaveCount(1)
        ->and(sentPushes()[0]['token'])->toBe(pushToken('e'))
        ->and(sentPushes()[0]['body'])->toBe("@ben seni VS'e çağırdı! Onun skorunu, oynayınca görürsün.")
        ->and(sentPushes()[0]['data'])->toBe(['kind' => 'vs_invite', 'username' => 'ben', 'duelId' => $duelId]);

    $this->signIn($ekin);
    $this->playFeed('vs', 40, body: ['duel' => $duelId]);
    $result = sentPushes()[1];
    expect($result['token'])->toBe(pushToken('m'))
        ->and($result['body'])->toStartWith('VS bitti, kazandın!')
        ->and($result['data']['kind'])->toBe('vs_result');
});

test('phrases push once in a while from one friend; the rest wait in the inbox', function () {
    $me = $this->signIn(User::factory()->withUsername('ben')->create());
    $friend = User::factory()->withUsername('kanka')->create();
    $this->befriend($me, $friend);
    PushToken::query()->create(['user_id' => $friend->id, 'token' => pushToken(), 'platform' => 'ios']);

    $this->postJson('/api/v1/me/threads/kanka/messages', ['phrase' => 'rematch'])->assertCreated();
    $this->postJson('/api/v1/me/threads/kanka/messages', ['phrase' => 'gg'])->assertCreated();

    expect(sentPushes())->toHaveCount(1)
        ->and(sentPushes()[0]['body'])->toBe('@ben: Rövanş? 🔥');
});

test('a player who turned a kind off gets none of it, and a banned player pushes nothing', function () {
    $ayse = User::factory()->withUsername('ayse')->create(['settings' => ['haptics' => true, 'pushFriends' => false]]);
    PushToken::query()->create(['user_id' => $ayse->id, 'token' => pushToken(), 'platform' => 'ios']);
    $deniz = User::factory()->withUsername('deniz')->create();
    PushToken::query()->create(['user_id' => $deniz->id, 'token' => pushToken('d'), 'platform' => 'ios']);

    $this->signIn();
    $this->putJson('/api/v1/users/ayse/friend')->assertOk();
    $this->signIn(User::factory()->withUsername('yasakli')->create(['banned_at' => now()]));
    $this->putJson('/api/v1/users/deniz/friend')->assertOk();

    expect(sentPushes())->toBe([]);
});

test('a token Firebase no longer knows is dropped', function () {
    $this->fcmAnswer = fn () => Http::response(['error' => ['status' => 'NOT_FOUND', 'details' => [['errorCode' => 'UNREGISTERED']]]], 404);
    $ayse = User::factory()->withUsername('ayse')->create();
    PushToken::query()->create(['user_id' => $ayse->id, 'token' => pushToken(), 'platform' => 'ios']);

    $this->signIn();
    $this->putJson('/api/v1/users/ayse/friend')->assertOk();

    expect(PushToken::query()->count())->toBe(0);
});

test('without the Firebase project or its key, nothing is sent and nothing breaks', function () {
    config(['quezby.push.credentials' => null]);
    $ayse = User::factory()->withUsername('ayse')->create();
    PushToken::query()->create(['user_id' => $ayse->id, 'token' => pushToken(), 'platform' => 'ios']);

    $this->signIn();
    $this->putJson('/api/v1/users/ayse/friend')->assertOk();

    expect(sentPushes())->toBe([])
        ->and(app(PushService::class)->isConfigured())->toBeFalse();
});

test('push tokens need a player, and are throttled', function () {
    $this->assertApiError($this->putJson('/api/v1/me/push-token', ['token' => pushToken(), 'platform' => 'ios']), 401, 'unauthenticated');

    $this->signIn();
    foreach (range(1, 20) as $i) {
        $this->putJson('/api/v1/me/push-token', ['token' => pushToken(), 'platform' => 'ios'])->assertNoContent();
    }
    $this->assertApiError($this->putJson('/api/v1/me/push-token', ['token' => pushToken(), 'platform' => 'ios']), 429, 'too_many_requests');
});

/** @return list<array{event: string, level: string, user: string|null, platform: string|null}> */
function pushLogs(): array
{
    return SystemLog::query()->where('source', 'push')->orderBy('id')->get()
        ->map(fn (SystemLog $row) => ['event' => $row->event, 'level' => $row->level->value, 'user' => $row->user_id, 'platform' => $row->platform])
        ->all();
}

test('every push decision is on the Loglar page, under the player it was for', function () {
    $ayse = User::factory()->withUsername('ayse')->create();
    PushToken::query()->create(['user_id' => $ayse->id, 'token' => pushToken(), 'platform' => 'android', 'app_version' => '1.0.0']);
    $deniz = User::factory()->withUsername('deniz')->create();
    $sessiz = User::factory()->withUsername('sessiz')->create(['settings' => ['haptics' => true, 'pushFriends' => false]]);

    $this->signIn(User::factory()->withUsername('ben')->create());
    $this->putJson('/api/v1/users/ayse/friend')->assertOk();
    $this->putJson('/api/v1/users/deniz/friend')->assertOk();
    $this->putJson('/api/v1/users/sessiz/friend')->assertOk();

    expect(pushLogs())->toBe([
        ['event' => 'push.sent', 'level' => 'info', 'user' => $ayse->id, 'platform' => 'android'],
        ['event' => 'push.no_device', 'level' => 'warning', 'user' => $deniz->id, 'platform' => null],
        ['event' => 'push.muted', 'level' => 'info', 'user' => $sessiz->id, 'platform' => null],
    ]);
    $sent = SystemLog::query()->where('event', 'push.sent')->sole();
    expect($sent->context)->toBe(['to' => '@ayse', 'kind' => 'friend_request', 'device' => '…aaaaaaaa', 'appVersion' => '1.0.0'])
        ->and(json_encode($sent->context))->not->toContain(pushToken());
});

test('a push Firebase refuses is on the Loglar page with what Firebase said', function () {
    $this->fcmAnswer = fn () => Http::response(['error' => ['code' => 403, 'status' => 'PERMISSION_DENIED', 'message' => 'Permission denied.']], 403);
    $ayse = User::factory()->withUsername('ayse')->create();
    PushToken::query()->create(['user_id' => $ayse->id, 'token' => pushToken(), 'platform' => 'ios']);

    $this->signIn();
    $this->putJson('/api/v1/users/ayse/friend')->assertOk();

    $row = SystemLog::query()->where('source', 'external')->sole();
    expect($row->event)->toBe('firebase')
        ->and($row->level->value)->toBe('error')
        ->and($row->status)->toBe(403)
        ->and($row->message)->toBe('403 PERMISSION_DENIED: Permission denied.')
        ->and($row->path)->toBe('fcm.googleapis.com/v1/projects/quezby-test/messages:send')
        ->and($row->user_id)->toBe($ayse->id)
        ->and($row->platform)->toBe('ios')
        ->and($row->context['kind'])->toBe('friend_request')
        ->and($row->context['device'])->toBe('…aaaaaaaa')
        ->and(json_encode($row->context))->not->toContain(pushToken());
    expect(pushLogs())->toBe([]);
});

test('a dropped token says so', function () {
    $this->fcmAnswer = fn () => Http::response(['error' => ['status' => 'NOT_FOUND', 'details' => [['errorCode' => 'UNREGISTERED']]]], 404);
    $ayse = User::factory()->withUsername('ayse')->create();
    PushToken::query()->create(['user_id' => $ayse->id, 'token' => pushToken(), 'platform' => 'ios']);

    $this->signIn();
    $this->putJson('/api/v1/users/ayse/friend')->assertOk();

    expect(pushLogs())->toBe([['event' => 'push.token_dropped', 'level' => 'warning', 'user' => $ayse->id, 'platform' => 'ios']]);
});

test('a missing key says so', function () {
    config(['quezby.push.credentials' => null]);
    $ayse = User::factory()->withUsername('ayse')->create();
    PushToken::query()->create(['user_id' => $ayse->id, 'token' => pushToken(), 'platform' => 'ios']);

    $this->signIn();
    $this->putJson('/api/v1/users/ayse/friend')->assertOk();

    expect(pushLogs())->toBe([['event' => 'push.not_configured', 'level' => 'error', 'user' => $ayse->id, 'platform' => null]]);
});

test('an access token Google will not give says so, with what Google said', function () {
    $this->oauthAnswer = fn () => Http::response(['error' => 'invalid_grant', 'error_description' => 'Invalid JWT Signature.'], 400);
    $ayse = User::factory()->withUsername('ayse')->create();
    PushToken::query()->create(['user_id' => $ayse->id, 'token' => pushToken(), 'platform' => 'ios']);

    $this->signIn();
    $this->putJson('/api/v1/users/ayse/friend')->assertOk();

    expect(pushLogs())->toBe([['event' => 'push.no_access_token', 'level' => 'error', 'user' => $ayse->id, 'platform' => null]]);
    $google = SystemLog::query()->where('source', 'external')->sole();
    expect($google->event)->toBe('google_oauth')
        ->and($google->message)->toBe('400 invalid_grant: Invalid JWT Signature.')
        ->and($google->path)->toBe('oauth2.googleapis.com/token');
});

test('a registered phone is on the Loglar page when something changed — not on every launch', function () {
    $me = $this->signIn();
    $register = fn (string $version) => $this->withHeaders(['X-App-Version' => $version])
        ->putJson('/api/v1/me/push-token', ['token' => pushToken('z'), 'platform' => 'android'])
        ->assertNoContent();

    $register('1.0.4');
    $register('1.0.4');
    $register('1.0.5');
    $other = $this->signIn();
    $register('1.0.5');

    $rows = SystemLog::query()->orderBy('id')->get();
    expect($rows->map(fn (SystemLog $row) => [$row->context['change'], $row->user_id, $row->app_version])->all())->toBe([
        ['new', $me->id, '1.0.4'],
        ['version', $me->id, '1.0.5'],
        ['account', $other->id, '1.0.5'],
    ]);
    expect($rows[0]->event)->toBe('push.registered')
        ->and($rows[0]->platform)->toBe('android')
        ->and($rows[0]->context['device'])->toBe('…zzzzzzzz')
        ->and(json_encode($rows->pluck('context')))->not->toContain(pushToken('z'));
});
