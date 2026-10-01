<?php

use App\Enums\AdminRole;
use App\Enums\AuditAction;
use App\Models\AuditEntry;
use App\Models\PushToken;
use App\Models\SystemLog;
use App\Models\User;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-10-01 12:00', 'Europe/Istanbul'));
    config(['quezby.logs.prune_odds' => 0]);
    $key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
    openssl_pkey_export($key, $pem);
    $path = sys_get_temp_dir().'/quezby-fcm-admin-'.getmypid().'.json';
    file_put_contents($path, json_encode(['client_email' => 'push@quezby.iam.gserviceaccount.com', 'private_key' => $pem, 'private_key_id' => 'k1']));
    config(['quezby.push.project_id' => 'quezby-test', 'quezby.push.credentials' => $path, 'quezby.push.enabled' => true]);
    $this->fcmAnswers = [];
    $this->oauthAnswer = fn () => Http::response(['access_token' => 'fcm-token', 'expires_in' => 3600]);
    Http::fake([
        'oauth2.googleapis.com/*' => fn () => ($this->oauthAnswer)(),
        'fcm.googleapis.com/*' => fn (Request $request) => ($this->fcmAnswers[$request['message']['token']] ?? fn () => Http::response(['name' => 'projects/quezby-test/messages/1']))(),
    ]);
});

function adminToken(string $tail): string
{
    return 'fcm:'.str_repeat($tail, 40);
}

test('an owner sends a player’s phones a push now, and reads what Firebase said for each', function () {
    $owner = $this->signInAdmin(AdminRole::Owner);
    $ayse = User::factory()->withUsername('ayse')->create(['settings' => ['haptics' => true, 'pushFriends' => false, 'pushVs' => false, 'pushMessages' => false]]);
    PushToken::query()->create(['user_id' => $ayse->id, 'token' => adminToken('i'), 'platform' => 'ios', 'app_version' => '1.0.4']);
    PushToken::query()->create(['user_id' => $ayse->id, 'token' => adminToken('a'), 'platform' => 'android']);
    PushToken::query()->create(['user_id' => $ayse->id, 'token' => adminToken('g'), 'platform' => 'android']);
    $this->fcmAnswers[adminToken('i')] = fn () => Http::response(['error' => ['code' => 401, 'status' => 'UNAUTHENTICATED', 'message' => 'Auth error from APNS or Web Push Service', 'details' => [['errorCode' => 'THIRD_PARTY_AUTH_ERROR']]]], 401);
    $this->fcmAnswers[adminToken('g')] = fn () => Http::response(['error' => ['status' => 'NOT_FOUND', 'details' => [['errorCode' => 'UNREGISTERED']]]], 404);

    $response = $this->postJson("/api/v1/admin/players/{$ayse->id}/push", ['title' => ' Quezby ', 'body' => 'Deneme bildirimi'])->assertOk()
        ->assertJsonPath('problem', null)
        ->assertJsonPath('devices', 3)
        ->assertJsonPath('delivered', 1);

    // The most recently registered first.
    expect(collect($response->json('results'))->keyBy('device')->map(fn (array $result) => [$result['platform'], $result['ok'], $result['status'], $result['error'], $result['dropped']])->all())->toBe([
        '…gggggggg' => ['android', false, 404, 'NOT_FOUND · UNREGISTERED', true],
        '…aaaaaaaa' => ['android', true, 200, null, false],
        '…iiiiiiii' => ['ios', false, 401, 'UNAUTHENTICATED · THIRD_PARTY_AUTH_ERROR · Auth error from APNS or Web Push Service', false],
    ]);
    // Sent whatever the player's settings, with the words as typed, and nothing the app would open.
    $sent = collect(Http::recorded())->map(fn (array $pair) => $pair[0])->filter(fn (Request $request) => str_contains($request->url(), 'fcm.googleapis.com'))->values();
    expect($sent)->toHaveCount(3)
        ->and($sent[0]['message']['notification'])->toBe(['title' => 'Quezby', 'body' => 'Deneme bildirimi'])
        ->and($sent[0]['message']['data'])->toBe(['kind' => 'admin']);
    expect(PushToken::query()->where('token', adminToken('g'))->exists())->toBeFalse();

    $entry = AuditEntry::query()->sole();
    expect($entry->action)->toBe(AuditAction::PlayerPush)
        ->and($entry->admin_id)->toBe($owner->id)
        ->and($entry->subject_id)->toBe($ayse->id)
        ->and($entry->details)->toBe(['title' => 'Quezby', 'body' => 'Deneme bildirimi', 'devices' => 3, 'delivered' => 1, 'problem' => null]);
    expect(SystemLog::query()->where('source', 'external')->where('event', 'firebase')->count())->toBe(2);
});

test('a player with no phone says so, on record', function () {
    $this->signInAdmin(AdminRole::Owner);
    $ayse = User::factory()->withUsername('ayse')->create();

    $this->postJson("/api/v1/admin/players/{$ayse->id}/push", ['title' => 'Quezby', 'body' => 'Deneme'])->assertOk()
        ->assertExactJson(['problem' => 'no_device', 'devices' => 0, 'delivered' => 0, 'results' => []]);

    expect(AuditEntry::query()->sole()->details['problem'])->toBe('no_device')
        ->and(SystemLog::query()->where('event', 'push.no_device')->count())->toBe(1);
});

test('an access token Google will not give says so', function () {
    $this->signInAdmin(AdminRole::Owner);
    $ayse = User::factory()->withUsername('ayse')->create();
    PushToken::query()->create(['user_id' => $ayse->id, 'token' => adminToken('a'), 'platform' => 'android']);
    $this->oauthAnswer = fn () => Http::response(['error' => 'invalid_grant'], 400);

    $this->postJson("/api/v1/admin/players/{$ayse->id}/push", ['title' => 'Quezby', 'body' => 'Deneme'])->assertOk()
        ->assertExactJson(['problem' => 'no_access_token', 'devices' => 1, 'delivered' => 0, 'results' => []]);
});

test('Firebase not set up says so', function () {
    config(['quezby.push.credentials' => null]);
    $this->signInAdmin(AdminRole::Owner);
    $ayse = User::factory()->withUsername('ayse')->create();
    PushToken::query()->create(['user_id' => $ayse->id, 'token' => adminToken('a'), 'platform' => 'android']);

    $this->postJson("/api/v1/admin/players/{$ayse->id}/push", ['title' => 'Quezby', 'body' => 'Deneme'])->assertOk()
        ->assertJsonPath('problem', 'not_configured');
});

test('a push needs a title and words of a sane length', function (array $body) {
    $this->signInAdmin(AdminRole::Owner);
    $ayse = User::factory()->withUsername('ayse')->create();

    $this->assertApiError($this->postJson("/api/v1/admin/players/{$ayse->id}/push", $body), 422, 'validation_failed');
    expect(AuditEntry::query()->count())->toBe(0);
})->with([
    'nothing' => [[]],
    'no title' => [['body' => 'Deneme']],
    'no words' => [['title' => 'Quezby']],
    'a long title' => [['title' => str_repeat('a', 61), 'body' => 'Deneme']],
    'long words' => [['title' => 'Quezby', 'body' => str_repeat('a', 241)]],
]);

test('the player page says which phones can take a push, and what the player turned off', function () {
    $this->signInAdmin(AdminRole::Viewer);
    $ayse = User::factory()->withUsername('ayse')->create(['settings' => ['haptics' => true, 'pushVs' => false]]);
    PushToken::query()->create(['user_id' => $ayse->id, 'token' => adminToken('a'), 'platform' => 'android', 'app_version' => '1.0.4']);

    $this->getJson("/api/v1/admin/players/{$ayse->id}")->assertOk()
        ->assertJsonPath('push.devices', [[
            'device' => '…aaaaaaaa',
            'platform' => 'android',
            'appVersion' => '1.0.4',
            'registeredAt' => '2026-10-01T09:00:00.000Z',
            'updatedAt' => '2026-10-01T09:00:00.000Z',
        ]])
        ->assertJsonPath('push.settings', ['friends' => true, 'vs' => false, 'messages' => true]);
});
