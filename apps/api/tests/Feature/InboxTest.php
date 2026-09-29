<?php

use App\Content\Catalog;
use App\Enums\DuelStatus;
use App\Enums\MessageKind;
use App\Models\Duel;
use App\Models\Message;
use App\Models\User;
use App\Services\Social\InboxService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-24 12:00', 'Europe/Istanbul'));
});

test('accepting a request opens the conversation with "friends now", unread for the one who asked', function () {
    $asker = User::factory()->withUsername('soran')->create();
    $me = $this->signIn(User::factory()->withUsername('kabul')->create());
    $this->requestFriend($asker, $me);

    $this->putJson('/api/v1/users/soran/friend')->assertJsonPath('relation', 'friend');

    $message = Message::query()->sole();
    expect($message->kind)->toBe(MessageKind::Friends)
        ->and($message->sender_id)->toBe($me->id)
        ->and($message->recipient_id)->toBe($asker->id);
    $this->getJson('/api/v1/me/inbox')->assertExactJson(['requests' => 0, 'threads' => 0, 'yourTurn' => 0, 'friends' => 1, 'waiting' => [], 'notifications' => 0, 'serverTime' => '2026-09-24T09:00:00.000Z']);

    $this->signIn($asker);
    $this->getJson('/api/v1/me/inbox')->assertExactJson(['requests' => 0, 'threads' => 1, 'yourTurn' => 0, 'friends' => 1, 'waiting' => [], 'notifications' => 1, 'serverTime' => '2026-09-24T09:00:00.000Z']);
    $this->getJson('/api/v1/me/friends')
        ->assertJsonPath('friends.0.player.username', 'kabul')
        ->assertJsonPath('friends.0.unread', 1)
        ->assertJsonPath('friends.0.last.kind', 'friends')
        ->assertJsonPath('friends.0.last.mine', false)
        ->assertJsonPath('friends.0.duel', null);
});

test('a request waiting counts on the badge', function () {
    $me = $this->signIn();
    $this->requestFriend(User::factory()->withUsername('bir')->create(), $me);
    $this->requestFriend(User::factory()->withUsername('iki')->create(), $me);
    $this->requestFriend(User::factory()->withUsername('yasakli')->create(['banned_at' => now()]), $me);

    $this->getJson('/api/v1/me/inbox')->assertExactJson(['requests' => 2, 'threads' => 0, 'yourTurn' => 0, 'friends' => 0, 'waiting' => [], 'notifications' => 2, 'serverTime' => '2026-09-24T09:00:00.000Z']);
});

test('a phrase goes to a friend, and reading the conversation clears it', function () {
    $me = $this->signIn(User::factory()->withUsername('ben')->create());
    $friend = User::factory()->withUsername('kanka')->create();
    $this->befriend($me, $friend);

    $this->postJson('/api/v1/me/threads/kanka/messages', ['phrase' => 'rematch'])
        ->assertCreated()
        ->assertJsonPath('message.kind', 'phrase')
        ->assertJsonPath('message.phrase', 'rematch')
        ->assertJsonPath('message.mine', true)
        ->assertJsonPath('message.createdAt', '2026-09-24T09:00:00.000Z');

    $this->signIn($friend);
    $this->getJson('/api/v1/me/inbox')->assertJsonPath('threads', 1);
    $this->getJson('/api/v1/me/threads/ben')
        ->assertOk()
        ->assertJsonPath('player.username', 'ben')
        ->assertJsonPath('h2h', ['wins' => 0, 'losses' => 0, 'draws' => 0])
        ->assertJsonPath('duel', null)
        ->assertJsonPath('messages.0.phrase', 'rematch')
        ->assertJsonPath('messages.0.mine', false)
        ->assertJsonPath('nextBefore', null);
    $this->postJson('/api/v1/me/threads/ben/read')->assertNoContent();

    $this->getJson('/api/v1/me/inbox')->assertJsonPath('threads', 0);
    $this->getJson('/api/v1/me/friends')->assertJsonPath('friends.0.unread', 0);
});

test('the game\'s banter goes too: greetings and GG WP, EZ and rage quits', function (string $phrase) {
    $me = $this->signIn();
    $this->befriend($me, User::factory()->withUsername('kanka')->create());

    $this->postJson('/api/v1/me/threads/kanka/messages', ['phrase' => $phrase])
        ->assertCreated()
        ->assertJsonPath('message.phrase', $phrase);
})->with(['whats_up', 'gg_wp', 'ready', 'clutch', 'ez', 'bot', 'nerf', 'lucky', 'lag', 'warming_up', 'rage_quit', 'respect', 'afk', 'bye']);

test('a phrase is one of the list, never typed words', function (mixed $phrase) {
    $me = $this->signIn();
    $this->befriend($me, User::factory()->withUsername('kanka')->create());

    $this->assertApiError($this->postJson('/api/v1/me/threads/kanka/messages', ['phrase' => $phrase]), 422, 'validation_failed');
    expect(Message::query()->count())->toBe(0);
})->with([['selam nasılsın'], ['GG'], [null], [['gg']]]);

test('only friends talk: a stranger has no conversation, a banned or unknown player none either', function () {
    $this->signIn();
    User::factory()->withUsername('yabanci')->create();
    User::factory()->withUsername('yasakli')->create(['banned_at' => now()]);

    $this->assertApiError($this->postJson('/api/v1/me/threads/yabanci/messages', ['phrase' => 'hi']), 422, 'not_friends');
    $this->assertApiError($this->getJson('/api/v1/me/threads/yabanci'), 404, 'not_found');
    $this->assertApiError($this->getJson('/api/v1/me/threads/yasakli'), 404, 'not_found');
    $this->assertApiError($this->getJson('/api/v1/me/threads/kimse.yok'), 404, 'not_found');
});

test('a friend gets at most so many phrases a day', function () {
    config(['quezby.inbox.phrases_per_day' => 2]);
    $me = $this->signIn();
    $this->befriend($me, User::factory()->withUsername('kanka')->create());

    $this->postJson('/api/v1/me/threads/kanka/messages', ['phrase' => 'hi'])->assertCreated();
    $this->postJson('/api/v1/me/threads/kanka/messages', ['phrase' => 'gg'])->assertCreated();
    $this->assertApiError($this->postJson('/api/v1/me/threads/kanka/messages', ['phrase' => 'wow']), 422, 'message_limit')
        ->assertJsonPath('error.message', 'Bu arkadaşına bugün en fazla 2 mesaj gönderebilirsin.');

    // A new Istanbul day, a new allowance.
    Carbon::setTestNow(Carbon::parse('2026-09-25 00:05', 'Europe/Istanbul'));
    $this->postJson('/api/v1/me/threads/kanka/messages', ['phrase' => 'wow'])->assertCreated();
});

test('a conversation pages thirty lines at a time, oldest first on each page', function () {
    $me = $this->signIn();
    $friend = User::factory()->withUsername('kanka')->create();
    $this->befriend($me, $friend);
    foreach (range(1, 35) as $i) {
        Message::query()->create(['sender_id' => $i % 2 ? $me->id : $friend->id, 'recipient_id' => $i % 2 ? $friend->id : $me->id, 'kind' => MessageKind::Phrase, 'phrase' => 'hi', 'created_at' => now()->addSeconds($i)]);
    }

    $first = $this->getJson('/api/v1/me/threads/kanka')->assertOk();
    $ids = $first->json('messages.*.id');
    expect($ids)->toHaveCount(30)->and($ids)->toBe(collect($ids)->sort()->values()->all());
    $older = $this->getJson('/api/v1/me/threads/kanka?before='.$first->json('nextBefore'))->assertOk()->assertJsonPath('nextBefore', null);
    expect($older->json('messages'))->toHaveCount(5)
        ->and(max($older->json('messages.*.id')))->toBeLessThan(min($ids));
});

test('the friends list puts the one last heard from on top', function () {
    $me = $this->signIn();
    [$a, $b] = User::factory()->withUsername()->count(2)->create()->all();
    $this->befriend($me, $a);
    Carbon::setTestNow(now()->addMinute());
    $this->befriend($me, $b);

    Carbon::setTestNow(now()->addMinute());
    $this->signIn($a);
    $this->postJson("/api/v1/me/threads/{$me->username}/messages", ['phrase' => 'hi'])->assertCreated();

    $this->signIn($me);
    $this->getJson('/api/v1/me/friends')->assertJsonPath('friends.*.player.username', [$a->username, $b->username]);
});

test('ending a friendship forgets the conversation', function () {
    $me = $this->signIn();
    $friend = User::factory()->withUsername('kanka')->create();
    $this->befriend($me, $friend);
    $this->postJson('/api/v1/me/threads/kanka/messages', ['phrase' => 'hi'])->assertCreated();

    $this->deleteJson('/api/v1/users/kanka/friend')->assertOk();

    expect(Message::query()->count())->toBe(0);
});

test('lines older than the keep are pruned, a chunk at a time', function () {
    $me = User::factory()->withUsername()->create();
    $friend = User::factory()->withUsername()->create();
    Message::query()->create(['sender_id' => $me->id, 'recipient_id' => $friend->id, 'kind' => MessageKind::Phrase, 'phrase' => 'hi', 'created_at' => now()->subDays(91)]);
    Message::query()->create(['sender_id' => $me->id, 'recipient_id' => $friend->id, 'kind' => MessageKind::Phrase, 'phrase' => 'gg', 'created_at' => now()->subDays(89)]);

    expect(app(InboxService::class)->pruneNow())->toBe(1)
        ->and(Message::query()->pluck('phrase')->map->value->all())->toBe(['gg']);
});

test('the inbox needs a player', function () {
    $this->assertApiError($this->getJson('/api/v1/me/inbox'), 401, 'unauthenticated');
    $this->assertApiError($this->getJson('/api/v1/me/threads/kanka'), 401, 'unauthenticated');
    $this->assertApiError($this->postJson('/api/v1/me/threads/kanka/messages', ['phrase' => 'hi']), 401, 'unauthenticated');
});

test('phrases are throttled', function () {
    config(['quezby.inbox.phrases_per_day' => 1000]);
    $me = $this->signIn();
    $this->befriend($me, User::factory()->withUsername('kanka')->create());
    foreach (range(1, 30) as $i) {
        $this->postJson('/api/v1/me/threads/kanka/messages', ['phrase' => 'hi'])->assertCreated();
    }

    $this->assertApiError($this->postJson('/api/v1/me/threads/kanka/messages', ['phrase' => 'hi']), 429, 'too_many_requests');
    expect(DB::table('messages')->count())->toBe(30);
});

/** A VS `$from` played and sent `$to`, waiting for them to play it until `$hours` from now. */
function vsWaitingFor(User $to, User $from, int $hours): Duel
{
    return Duel::query()->create([
        'challenger_id' => $from->id,
        'opponent_id' => $to->id,
        'seed' => 4242,
        'engine_version' => config('quezby.engine_version'),
        'content_version' => Catalog::LATEST,
        'status' => DuelStatus::Waiting,
        'challenger_score' => 1000,
        'challenger_valid' => true,
        'open_pair' => Duel::pairOf($from->id, $to->id),
        'sent_at' => now(),
        'expires_at' => now()->addHours($hours),
    ]);
}

test('the summary counts the friends who are not banned', function () {
    $me = $this->signIn();
    foreach (User::factory()->withUsername()->count(3)->create() as $friend) {
        $this->befriend($me, $friend);
    }
    $this->befriend($me, User::factory()->withUsername()->create(['banned_at' => now()]));
    $this->requestFriend(User::factory()->withUsername()->create(), $me);

    $this->getJson('/api/v1/me/inbox')->assertOk()->assertJsonPath('friends', 3)->assertJsonPath('requests', 1);
});

test('the summary names the VS waiting for the player, the one running out first first, three at most', function () {
    $me = $this->signIn();
    $friends = [];
    foreach (['ada', 'bora', 'cem', 'deniz'] as $name) {
        $friends[$name] = User::factory()->withUsername($name)->create();
        $this->befriend($me, $friends[$name]);
    }
    $this->recordRanked($friends['bora'], 4200);
    $ada = vsWaitingFor($me, $friends['ada'], 30);
    $bora = vsWaitingFor($me, $friends['bora'], 2);
    vsWaitingFor($me, $friends['cem'], 47);
    $deniz = vsWaitingFor($me, $friends['deniz'], 10);
    // Not the player's to play: one they sent, and one from a friend who is banned now.
    $sent = User::factory()->withUsername('eren')->create();
    $this->befriend($me, $sent);
    vsWaitingFor($sent, $me, 5);
    $banned = User::factory()->withUsername('fikret')->create();
    $this->befriend($me, $banned);
    vsWaitingFor($me, $banned, 1);
    $banned->forceFill(['banned_at' => now()])->save();

    $this->getJson('/api/v1/me/inbox')
        ->assertOk()
        ->assertJsonPath('yourTurn', 4)
        ->assertJsonPath('threads', 4)
        ->assertJsonPath('friends', 5)
        ->assertJsonPath('serverTime', '2026-09-24T09:00:00.000Z')
        ->assertJsonPath('waiting', [
            [
                'id' => $bora->id,
                'opponent' => ['username' => 'bora', 'avatarUrl' => null, 'best' => 4200, 'league' => null, 'relation' => 'friend'],
                'expiresAt' => '2026-09-24T11:00:00.000Z',
            ],
            [
                'id' => $deniz->id,
                'opponent' => ['username' => 'deniz', 'avatarUrl' => null, 'best' => null, 'league' => null, 'relation' => 'friend'],
                'expiresAt' => '2026-09-24T19:00:00.000Z',
            ],
            [
                'id' => $ada->id,
                'opponent' => ['username' => 'ada', 'avatarUrl' => null, 'best' => null, 'league' => null, 'relation' => 'friend'],
                'expiresAt' => '2026-09-25T15:00:00.000Z',
            ],
        ]);
});

test('a waiting VS leaves the summary once it is declined, started or run out', function () {
    $me = $this->signIn();
    $friends = User::factory()->withUsername()->count(3)->create()->all();
    foreach ($friends as $friend) {
        $this->befriend($me, $friend);
    }
    $declined = vsWaitingFor($me, $friends[0], 1);
    $started = vsWaitingFor($me, $friends[1], 2);
    $expiring = vsWaitingFor($me, $friends[2], 3);
    $this->getJson('/api/v1/me/inbox')->assertJsonPath('yourTurn', 3)->assertJsonPath('waiting.*.id', [$declined->id, $started->id, $expiring->id]);

    $this->postJson("/api/v1/duels/{$declined->id}/decline")->assertOk();
    $this->getJson('/api/v1/me/inbox')->assertJsonPath('yourTurn', 2)->assertJsonPath('waiting.*.id', [$started->id, $expiring->id]);

    $this->startRun(['mode' => 'vs', 'duel' => $started->id])->assertCreated();
    $this->getJson('/api/v1/me/inbox')->assertJsonPath('yourTurn', 1)->assertJsonPath('waiting.*.id', [$expiring->id]);

    Carbon::setTestNow(now()->addHours(4));
    $this->getJson('/api/v1/me/inbox')
        ->assertJsonPath('yourTurn', 0)
        ->assertJsonPath('waiting', [])
        ->assertJsonPath('serverTime', '2026-09-24T13:00:00.000Z');
    expect(Duel::query()->find($expiring->id)->status)->toBe(DuelStatus::Expired);
});
