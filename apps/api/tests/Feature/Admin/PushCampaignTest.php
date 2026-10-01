<?php

use App\Enums\AdminRole;
use App\Enums\AuditAction;
use App\Enums\RunMode;
use App\Models\AuditEntry;
use App\Models\PushCampaign;
use App\Models\PushToken;
use App\Models\Run;
use App\Models\User;
use App\Services\DailyService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-10-01 12:00', 'Europe/Istanbul'));
    config(['quezby.logs.prune_odds' => 0]);
    $key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
    openssl_pkey_export($key, $pem);
    $path = sys_get_temp_dir().'/quezby-fcm-campaign-'.getmypid().'.json';
    file_put_contents($path, json_encode(['client_email' => 'push@quezby.iam.gserviceaccount.com', 'private_key' => $pem, 'private_key_id' => 'k1']));
    config(['quezby.push.project_id' => 'quezby-test', 'quezby.push.credentials' => $path, 'quezby.push.enabled' => true]);
    $this->fcmAnswers = [];
    Http::fake([
        'oauth2.googleapis.com/*' => Http::response(['access_token' => 'fcm-token', 'expires_in' => 3600]),
        'fcm.googleapis.com/*' => fn (Request $request) => ($this->fcmAnswers[$request['message']['token']] ?? fn () => Http::response(['name' => 'projects/quezby-test/messages/1']))(),
    ]);
});

function campaignPlayer(string $name, string $platform = 'ios', array $attributes = []): User
{
    $player = User::factory()->withUsername($name)->create($attributes);
    PushToken::query()->create(['user_id' => $player->id, 'token' => 'fcm:'.str_pad($name, 40, 'x'), 'platform' => $platform]);

    return $player;
}

/**
 * @param  array<string, mixed>  $filters
 */
function audienceOf(array $filters): TestResponse
{
    return test()->postJson('/api/v1/admin/push/audience', ['filters' => $filters]);
}

/** @return list<string> the tokens Firebase was asked to push to */
function pushedTokens(): array
{
    return collect(Http::recorded())->map(fn (array $pair) => $pair[0])
        ->filter(fn (Request $request) => str_contains($request->url(), 'fcm.googleapis.com'))
        ->map(fn (Request $request) => $request['message']['token'])->values()->all();
}

test('counts the players a filter picks, those with a phone, and the phones', function () {
    $this->signInAdmin(AdminRole::Owner);
    campaignPlayer('ayse', 'ios');
    $deniz = campaignPlayer('deniz', 'android');
    PushToken::query()->create(['user_id' => $deniz->id, 'token' => 'fcm:'.str_repeat('d', 40), 'platform' => 'ios']);
    User::factory()->withUsername('telefonsuz')->create();
    campaignPlayer('yasakli', 'ios', ['banned_at' => now()]);

    audienceOf([])->assertOk()->assertExactJson(['players' => 3, 'reachable' => 2, 'devices' => 3, 'ios' => 2, 'android' => 1, 'locales' => ['tr' => 3]]);
    audienceOf(['platform' => 'android'])->assertJsonPath('reachable', 1)->assertJsonPath('devices', 1);
    audienceOf(['username' => '@Deniz'])->assertJsonPath('players', 1)->assertJsonPath('devices', 2);
});

test('picks by league, a league none yet included', function () {
    $this->signInAdmin(AdminRole::Owner);
    $this->rate(campaignPlayer('elmas'), 4500);
    $this->rate(campaignPlayer('altin'), 2500);
    campaignPlayer('ligsiz');

    audienceOf(['tiers' => ['diamond']])->assertJsonPath('players', 1);
    audienceOf(['tiers' => ['diamond', 'gold']])->assertJsonPath('players', 2);
    audienceOf(['tiers' => ['none']])->assertJsonPath('players', 1);
    audienceOf(['tiers' => ['diamond', 'none']])->assertJsonPath('players', 2);
});

test('picks by today’s Günün akışı, by when they last played and by when they joined', function () {
    $this->signInAdmin(AdminRole::Owner);
    $today = app(DailyService::class)->dayKey(now());
    $oynadi = campaignPlayer('oynadi', 'ios', ['created_at' => now()->subDays(40)]);
    Run::factory()->for($oynadi)->create(['mode' => RunMode::Daily, 'daily_key' => $today, 'started_at' => now()->subHour()]);
    $eski = campaignPlayer('eski', 'ios', ['created_at' => now()->subDays(40)]);
    Run::factory()->for($eski)->create(['mode' => RunMode::Free, 'started_at' => now()->subDays(10)]);
    campaignPlayer('yeni', 'ios', ['created_at' => now()->subDays(2)]);

    audienceOf(['daily' => 'played'])->assertJsonPath('players', 1);
    audienceOf(['daily' => 'not_played'])->assertJsonPath('players', 2);
    audienceOf(['playedWithinDays' => 7])->assertJsonPath('players', 1);
    audienceOf(['notPlayedForDays' => 7])->assertJsonPath('players', 2);
    audienceOf(['joinedWithinDays' => 7])->assertJsonPath('players', 1);
    audienceOf(['daily' => 'not_played', 'notPlayedForDays' => 3, 'joinedWithinDays' => 30])->assertJsonPath('players', 1);
});

test('picks by language and by account', function () {
    $this->signInAdmin(AdminRole::Owner);
    campaignPlayer('turk', 'ios', ['locale' => 'tr', 'email' => 'turk@quezby.test']);
    $alman = campaignPlayer('alman', 'ios', ['locale' => 'de']);
    $alman->identities()->create(['provider' => 'google', 'subject' => 'g-alman', 'email' => null, 'email_verified' => false]);
    campaignPlayer('misafir', 'ios', ['locale' => 'tr']);

    audienceOf(['locales' => ['de', 'ja']])->assertJsonPath('players', 1);
    audienceOf(['account' => 'guest'])->assertJsonPath('players', 1);
    audienceOf(['account' => 'registered'])->assertJsonPath('players', 2);
});

test('sends a campaign a batch at a time, tallies what Firebase said, and is on record', function () {
    config(['quezby.push.campaign_batch' => 2]);
    $owner = $this->signInAdmin(AdminRole::Owner, ['name' => 'Kubilay']);
    $this->rate(campaignPlayer('a1'), 4500);
    $this->rate(campaignPlayer('a2'), 4600);
    $this->rate(campaignPlayer('a3', 'android'), 4700);
    $this->rate(campaignPlayer('altin'), 2500);
    $this->fcmAnswers['fcm:'.str_pad('a2', 40, 'x')] = fn () => Http::response(['error' => ['status' => 'NOT_FOUND', 'details' => [['errorCode' => 'UNREGISTERED']]]], 404);

    $created = $this->postJson('/api/v1/admin/push/campaigns', ['messages' => ['tr' => ['title' => 'Elmas', 'body' => 'Bu hafta çift qb!']], 'fallback' => 'tr', 'filters' => ['tiers' => ['diamond'], 'username' => '']])
        ->assertCreated()
        ->assertJsonPath('campaign.status', 'sending')
        ->assertJsonPath('campaign.players', 3)
        ->assertJsonPath('campaign.devices', 3)
        ->assertJsonPath('campaign.sent', 0)
        ->assertJsonPath('campaign.filters', ['tiers' => ['diamond']])
        ->assertJsonPath('campaign.admin', 'Kubilay');
    $id = $created->json('campaign.id');
    expect(pushedTokens())->toBe([]);

    $this->postJson("/api/v1/admin/push/campaigns/{$id}/step")->assertOk()
        ->assertJsonPath('campaign.status', 'sending')
        ->assertJsonPath('campaign.sent', 1)
        ->assertJsonPath('campaign.failed', 1)
        ->assertJsonPath('campaign.dropped', 1)
        ->assertJsonPath('campaign.errors', [['error' => 'NOT_FOUND · UNREGISTERED', 'count' => 1]]);
    $this->postJson("/api/v1/admin/push/campaigns/{$id}/step")->assertOk()
        ->assertJsonPath('campaign.status', 'done')
        ->assertJsonPath('campaign.sent', 2);
    $this->postJson("/api/v1/admin/push/campaigns/{$id}/step")->assertOk()->assertJsonPath('campaign.sent', 2);

    expect(pushedTokens())->toHaveCount(3)
        ->and(collect(Http::recorded())->map(fn (array $pair) => $pair[0])->last(fn (Request $request) => str_contains($request->url(), 'fcm'))['message']['data'])->toBe(['kind' => 'admin']);
    $entry = AuditEntry::query()->sole();
    expect($entry->action)->toBe(AuditAction::PushCampaign)
        ->and($entry->admin_id)->toBe($owner->id)
        ->and($entry->subject_type)->toBe('system')
        ->and($entry->details)->toMatchArray(['campaign' => $id, 'messages' => ['tr' => ['title' => 'Elmas', 'body' => 'Bu hafta çift qb!']], 'fallback' => 'tr', 'filters' => ['tiers' => ['diamond']], 'players' => 3, 'devices' => 3]);

    $this->getJson('/api/v1/admin/push/campaigns')->assertOk()->assertJsonPath('campaigns.0.id', $id)->assertJsonPath('campaigns.0.status', 'done');
});

test('a campaign nobody can get is done at once; a stopped one sends no more', function () {
    $this->signInAdmin(AdminRole::Owner);
    $this->postJson('/api/v1/admin/push/campaigns', ['messages' => ['tr' => ['title' => 'Q', 'body' => 'Kimse']], 'fallback' => 'tr', 'filters' => ['tiers' => ['master']]])
        ->assertCreated()->assertJsonPath('campaign.status', 'done')->assertJsonPath('campaign.devices', 0);

    campaignPlayer('ayse');
    $id = $this->postJson('/api/v1/admin/push/campaigns', ['messages' => ['tr' => ['title' => 'Q', 'body' => 'Herkes']], 'fallback' => 'tr', 'filters' => []])->json('campaign.id');
    $this->postJson("/api/v1/admin/push/campaigns/{$id}/stop")->assertOk()->assertJsonPath('campaign.status', 'stopped');
    $this->postJson("/api/v1/admin/push/campaigns/{$id}/step")->assertOk()->assertJsonPath('campaign.sent', 0);

    expect(pushedTokens())->toBe([])
        ->and(AuditEntry::query()->pluck('action')->map->value->all())->toBe(['push.campaign', 'push.campaign', 'push.campaign_stop']);
});

test('cron steps every campaign still going out', function () {
    $this->signInAdmin(AdminRole::Owner);
    campaignPlayer('ayse');
    $this->postJson('/api/v1/admin/push/campaigns', ['messages' => ['tr' => ['title' => 'Q', 'body' => 'Herkes']], 'fallback' => 'tr', 'filters' => []])->assertCreated();

    $this->artisan('quezby:push:campaigns')->assertSuccessful();

    expect(PushCampaign::query()->sole()->status)->toBe('done')
        ->and(pushedTokens())->toHaveCount(1);
});

test('a campaign needs words and filters it knows', function (array $body) {
    $this->signInAdmin(AdminRole::Owner);
    $this->assertApiError($this->postJson('/api/v1/admin/push/campaigns', $body), 422, 'validation_failed');
    expect(PushCampaign::query()->count())->toBe(0);
})->with([
    'no words' => [['fallback' => 'tr', 'filters' => []]],
    'no filters' => [['messages' => ['tr' => ['title' => 'Q', 'body' => 'b']], 'fallback' => 'tr']],
    'no fallback' => [['messages' => ['tr' => ['title' => 'Q', 'body' => 'b']], 'filters' => []]],
    'a fallback with no words' => [['messages' => ['tr' => ['title' => 'Q', 'body' => 'b']], 'fallback' => 'en', 'filters' => []]],
    'a language of its own' => [['messages' => ['xx' => ['title' => 'Q', 'body' => 'b']], 'fallback' => 'tr', 'filters' => []]],
    'a language without words' => [['messages' => ['tr' => ['title' => 'Q', 'body' => 'b'], 'en' => ['title' => 'Q']], 'fallback' => 'tr', 'filters' => []]],
    'a long title' => [['messages' => ['tr' => ['title' => str_repeat('a', 61), 'body' => 'b']], 'fallback' => 'tr', 'filters' => []]],
    'an unknown league' => [['messages' => ['tr' => ['title' => 'Q', 'body' => 'b']], 'fallback' => 'tr', 'filters' => ['tiers' => ['wood']]]],
    'an unknown filter' => [['messages' => ['tr' => ['title' => 'Q', 'body' => 'b']], 'fallback' => 'tr', 'filters' => ['rich' => true]]],
    'zero days' => [['messages' => ['tr' => ['title' => 'Q', 'body' => 'b']], 'fallback' => 'tr', 'filters' => ['notPlayedForDays' => 0]]],
]);

test('each player gets the words of their own language, the rest the fallback’s', function () {
    $this->signInAdmin(AdminRole::Owner);
    campaignPlayer('turk', 'ios', ['locale' => 'tr']);
    campaignPlayer('ingiliz', 'android', ['locale' => 'en']);
    campaignPlayer('alman', 'ios', ['locale' => 'de']);
    campaignPlayer('japon', 'ios', ['locale' => 'ja']);

    audienceOf([])->assertJsonPath('locales', ['de' => 1, 'en' => 1, 'ja' => 1, 'tr' => 1]);

    $this->postJson('/api/v1/admin/push/campaigns', [
        'messages' => [
            'tr' => ['title' => 'Quezby', 'body' => 'Günün akışı seni bekliyor!'],
            'en' => ['title' => 'Quezby', 'body' => 'Today’s feed is waiting!'],
            'de' => ['title' => 'Quezby', 'body' => 'Der Feed des Tages wartet!'],
        ],
        'fallback' => 'en',
        'filters' => [],
    ])->assertCreated()
        ->assertJsonPath('campaign.fallback', 'en')
        ->assertJsonPath('campaign.messages.de.body', 'Der Feed des Tages wartet!');
    $this->artisan('quezby:push:campaigns')->assertSuccessful();

    $bodies = collect(Http::recorded())->map(fn (array $pair) => $pair[0])
        ->filter(fn (Request $request) => str_contains($request->url(), 'fcm.googleapis.com'))
        ->mapWithKeys(fn (Request $request) => [substr($request['message']['token'], 4, 6) => $request['message']['notification']['body']])
        ->all();
    expect($bodies)->toEqual([
        'turkxx' => 'Günün akışı seni bekliyor!',
        'ingili' => 'Today’s feed is waiting!',
        'almanx' => 'Der Feed des Tages wartet!',
        'japonx' => 'Today’s feed is waiting!',
    ]);
    expect(PushCampaign::query()->sole())->status->toBe('done')->sent->toBe(4);
});
