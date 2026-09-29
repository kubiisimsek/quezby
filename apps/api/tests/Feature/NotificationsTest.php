<?php

use App\Content\Catalog;
use App\Enums\DuelStatus;
use App\Enums\MessageKind;
use App\Models\Duel;
use App\Models\Message;
use App\Models\User;
use App\Support\Timestamp;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-24 12:00', 'Europe/Istanbul'));
    $this->me = User::factory()->withUsername('ben')->create();
});

/** `$player`'s bell, asked the way their phone asks. */
function bellOf(User $player): TestResponse
{
    test()->signIn($player);

    return test()->getJson('/api/v1/me/notifications')->assertOk();
}

/** The notification id of the line of `$kind` that `$from` sent `$to`. */
function bellLine(User $from, User $to, MessageKind $kind): string
{
    return 'message:'.Message::query()->where('sender_id', $from->id)->where('recipient_id', $to->id)->where('kind', $kind)->sole()->id;
}

/** A VS `$challenger` played and sent `$opponent`, waiting for them for two days. */
function bellDuel(User $challenger, User $opponent): Duel
{
    return Duel::query()->create([
        'challenger_id' => $challenger->id,
        'opponent_id' => $opponent->id,
        'seed' => 4242,
        'engine_version' => config('quezby.engine_version'),
        'content_version' => Catalog::LATEST,
        'status' => DuelStatus::Waiting,
        'challenger_score' => 1000,
        'challenger_valid' => true,
        'open_pair' => Duel::pairOf($challenger->id, $opponent->id),
        'sent_at' => now(),
        'expires_at' => now()->addHours(48),
    ]);
}

/** A friend of the player, as the list shows them. */
function bellPlayer(string $username, string $relation = 'friend'): array
{
    return ['username' => $username, 'avatarUrl' => null, 'best' => null, 'league' => null, 'relation' => $relation];
}

test('a new player\'s bell is empty', function () {
    bellOf($this->me)->assertExactJson(['notifications' => [], 'unseen' => 0]);
});

test('the bell lists what happened among friends, newest first, as the player sees it', function () {
    $me = $this->me;
    $users = [];
    foreach (['ada', 'bora', 'cem', 'deniz', 'ekin', 'fikret'] as $name) {
        $users[$name] = User::factory()->withUsername($name)->create();
    }
    ['ada' => $ada, 'bora' => $bora, 'cem' => $cem, 'deniz' => $deniz, 'ekin' => $ekin, 'fikret' => $fikret] = $users;
    foreach ([$cem, $deniz, $ekin, $fikret] as $friend) {
        $this->befriend($me, $friend);
    }

    // A VS ben sent fikret, who let it run out.
    $this->signIn($me);
    $expired = $this->playFeed('vs', 50, body: ['opponent' => 'fikret'])->assertOk();
    Carbon::setTestNow(now()->addHours(49));
    $this->getJson('/api/v1/me/pulse')->assertOk();

    // One ekin played, and lost.
    Carbon::setTestNow(now()->addMinute());
    $played = $this->playFeed('vs', 60, body: ['opponent' => 'ekin'])->assertOk();
    $this->signIn($ekin);
    $answer = $this->playFeed('vs', 40, body: ['duel' => $played->json('duel.id')])->assertOk();

    // One deniz turned down.
    Carbon::setTestNow(now()->addMinute());
    $this->signIn($me);
    $declined = $this->playFeed('vs', 55, body: ['opponent' => 'deniz'])->assertOk();
    $this->signIn($deniz);
    $this->postJson("/api/v1/duels/{$declined->json('duel.id')}/decline")->assertOk();

    // One cem sent ben.
    Carbon::setTestNow(now()->addMinute());
    $this->signIn($cem);
    $invite = $this->playFeed('vs', 45, body: ['opponent' => 'ben'])->assertOk();

    // bora said yes to ben's request.
    Carbon::setTestNow(now()->addMinute());
    $this->signIn($me);
    $this->putJson('/api/v1/users/bora/friend')->assertJsonPath('relation', 'requested');
    $this->signIn($bora);
    $this->putJson('/api/v1/users/ben/friend')->assertJsonPath('relation', 'friend');

    // Phrases are the inbox's, either way.
    Carbon::setTestNow(now()->addMinute());
    $this->postJson('/api/v1/me/threads/ben/messages', ['phrase' => 'gg'])->assertCreated();
    $this->signIn($me);
    $this->postJson('/api/v1/me/threads/bora/messages', ['phrase' => 'wow'])->assertCreated();

    // ada asks.
    Carbon::setTestNow(now()->addMinute());
    $this->signIn($ada);
    $this->putJson('/api/v1/users/ben/friend')->assertJsonPath('relation', 'requested');

    $mine = fn (TestResponse $run) => ['score' => $run->json('run.score'), 'valid' => true];
    bellOf($me)->assertExactJson([
        'notifications' => [
            [
                'id' => 'request:ada',
                'kind' => 'friend_request',
                'player' => bellPlayer('ada', 'incoming'),
                'duel' => null,
                'createdAt' => '2026-09-26T10:06:00.000Z',
                'unseen' => true,
            ],
            [
                'id' => bellLine($bora, $me, MessageKind::Friends),
                'kind' => 'friends',
                'player' => bellPlayer('bora'),
                'duel' => null,
                'createdAt' => '2026-09-26T10:04:00.000Z',
                'unseen' => true,
            ],
            [
                'id' => bellLine($cem, $me, MessageKind::VsInvite),
                'kind' => 'vs_invite',
                'player' => bellPlayer('cem'),
                'duel' => [
                    'id' => $invite->json('duel.id'),
                    'status' => 'waiting',
                    'turn' => 'you',
                    'you' => null,
                    'them' => null,
                    'outcome' => null,
                    'expiresAt' => '2026-09-28T10:03:00.000Z',
                ],
                'createdAt' => '2026-09-26T10:03:00.000Z',
                'unseen' => true,
            ],
            [
                'id' => bellLine($deniz, $me, MessageKind::VsDeclined),
                'kind' => 'vs_declined',
                'player' => bellPlayer('deniz'),
                'duel' => [
                    'id' => $declined->json('duel.id'),
                    'status' => 'declined',
                    'turn' => null,
                    'you' => $mine($declined),
                    'them' => null,
                    'outcome' => null,
                    'expiresAt' => null,
                ],
                'createdAt' => '2026-09-26T10:02:00.000Z',
                'unseen' => true,
            ],
            [
                'id' => bellLine($ekin, $me, MessageKind::VsResult),
                'kind' => 'vs_result',
                'player' => bellPlayer('ekin'),
                'duel' => [
                    'id' => $played->json('duel.id'),
                    'status' => 'finished',
                    'turn' => null,
                    'you' => $mine($played),
                    'them' => $mine($answer),
                    'outcome' => 'won',
                    'expiresAt' => null,
                ],
                'createdAt' => '2026-09-26T10:01:00.000Z',
                'unseen' => true,
            ],
            [
                'id' => bellLine($fikret, $me, MessageKind::VsExpired),
                'kind' => 'vs_expired',
                'player' => bellPlayer('fikret'),
                'duel' => [
                    'id' => $expired->json('duel.id'),
                    'status' => 'expired',
                    'turn' => null,
                    'you' => $mine($expired),
                    'them' => null,
                    'outcome' => null,
                    'expiresAt' => null,
                ],
                'createdAt' => '2026-09-26T10:00:00.000Z',
                'unseen' => true,
            ],
        ],
        'unseen' => 6,
    ]);
    $this->getJson('/api/v1/me/inbox')->assertJsonPath('notifications', 6);

    // The other side of the same VS: ekin was sent it, and it stands finished now.
    bellOf($ekin)
        ->assertJsonPath('notifications.*.id', [bellLine($me, $ekin, MessageKind::VsInvite)])
        ->assertJsonPath('notifications.0.duel.outcome', 'lost')
        ->assertJsonPath('notifications.0.duel.turn', null);
});

test('a player is never told of their own lines', function () {
    $me = $this->me;
    $ekin = User::factory()->withUsername('ekin')->create();
    $this->befriend($me, $ekin);
    $this->signIn($me);
    $duelId = $this->playFeed('vs', 60, body: ['opponent' => 'ekin'])->assertOk()->json('duel.id');
    $this->postJson('/api/v1/me/threads/ekin/messages', ['phrase' => 'your_turn'])->assertCreated();

    bellOf($me)->assertExactJson(['notifications' => [], 'unseen' => 0]);
    bellOf($ekin)
        ->assertJsonPath('notifications.*.kind', ['vs_invite'])
        ->assertJsonPath('notifications.0.player.username', 'ben')
        ->assertJsonPath('notifications.0.duel.id', $duelId)
        ->assertJsonPath('notifications.0.duel.turn', 'you')
        ->assertJsonPath('unseen', 1);
});

test('a VS whose time ran out is settled before the list is read', function () {
    $me = $this->me;
    $ekin = User::factory()->withUsername('ekin')->create();
    $this->befriend($me, $ekin);
    $duel = bellDuel($me, $ekin);

    Carbon::setTestNow(now()->addHours(49));
    bellOf($me)
        ->assertJsonPath('notifications.*.kind', ['vs_expired'])
        ->assertJsonPath('notifications.0.duel.id', $duel->id)
        ->assertJsonPath('notifications.0.duel.status', 'expired')
        ->assertJsonPath('notifications.0.createdAt', '2026-09-26T10:00:00.000Z');
    expect($duel->fresh()->status)->toBe(DuelStatus::Expired);
});

test('opening the list sees everything so far; what comes after is new again', function () {
    $me = $this->me;
    $this->requestFriend(User::factory()->withUsername('ada')->create(), $me);
    Carbon::setTestNow(now()->addMinute());
    $this->requestFriend(User::factory()->withUsername('bora')->create(), $me);

    bellOf($me)->assertJsonPath('notifications.*.unseen', [true, true])->assertJsonPath('unseen', 2);
    $this->getJson('/api/v1/me/inbox')->assertJsonPath('notifications', 2);

    Carbon::setTestNow(now()->addMinute());
    $this->postJson('/api/v1/me/notifications/seen')->assertNoContent();
    expect(DB::table('users')->where('id', $me->id)->value('notifications_seen_at'))->toBe('2026-09-24 09:02:00.000');

    bellOf($me)
        ->assertJsonPath('notifications.*.id', ['request:bora', 'request:ada'])
        ->assertJsonPath('notifications.*.unseen', [false, false])
        ->assertJsonPath('unseen', 0);
    $this->getJson('/api/v1/me/inbox')->assertJsonPath('notifications', 0);

    Carbon::setTestNow(now()->addMinute());
    $this->requestFriend(User::factory()->withUsername('cem')->create(), $me);

    // Another phone of the same player reads the same moment back.
    bellOf($me->fresh())
        ->assertJsonPath('notifications.*.id', ['request:cem', 'request:bora', 'request:ada'])
        ->assertJsonPath('notifications.*.unseen', [true, false, false])
        ->assertJsonPath('unseen', 1);
    $this->getJson('/api/v1/me/inbox')->assertJsonPath('notifications', 1);
});

test('what was seen is kept to the millisecond', function () {
    $me = $this->me;
    Carbon::setTestNow(now()->addMilliseconds(400));
    $this->requestFriend(User::factory()->withUsername('ada')->create(), $me);
    Carbon::setTestNow(now()->addMilliseconds(100));
    $this->signIn($me);
    $this->postJson('/api/v1/me/notifications/seen')->assertNoContent();
    Carbon::setTestNow(now()->addMilliseconds(100));
    $this->requestFriend(User::factory()->withUsername('bora')->create(), $me);

    bellOf($me->fresh())
        ->assertJsonPath('notifications.*.id', ['request:bora', 'request:ada'])
        ->assertJsonPath('notifications.*.createdAt', ['2026-09-24T09:00:00.600Z', '2026-09-24T09:00:00.400Z'])
        ->assertJsonPath('notifications.*.unseen', [true, false])
        ->assertJsonPath('unseen', 1);
});

test('opening the list clears the badge on every phone: the pulse moves when something was unseen', function () {
    $me = $this->me;
    $ada = User::factory()->withUsername('ada')->create();
    $this->signIn($ada);
    $this->putJson('/api/v1/users/ben/friend')->assertJsonPath('relation', 'requested');

    $this->signIn($me);
    $this->getJson('/api/v1/me/pulse')->assertExactJson(['stamp' => 1]);
    $this->postJson('/api/v1/me/notifications/seen')->assertNoContent();
    $this->getJson('/api/v1/me/pulse')->assertExactJson(['stamp' => 2]);

    // Nothing new since: opening it again moves nothing.
    Carbon::setTestNow(now()->addMinute());
    $this->postJson('/api/v1/me/notifications/seen')->assertNoContent();
    $this->getJson('/api/v1/me/pulse')->assertExactJson(['stamp' => 2]);
    expect(DB::table('users')->where('id', $me->id)->value('notifications_seen_at'))->toBe('2026-09-24 09:01:00.000');

    // Only the player's own.
    $this->signIn($ada);
    $this->getJson('/api/v1/me/pulse')->assertExactJson(['stamp' => 1]);
});

test('banned players and anyone on either side of a block are left out', function () {
    $me = $this->me;
    $this->requestFriend(User::factory()->withUsername('acik')->create(), $me);
    $this->requestFriend(User::factory()->withUsername('yasakli')->create(['banned_at' => now()]), $me);
    $blocked = User::factory()->withUsername('engelli')->create();
    $this->requestFriend($blocked, $me);
    $this->block($me, $blocked);
    $blocker = User::factory()->withUsername('engelleyen')->create();
    $this->requestFriend($blocker, $me);
    $this->block($blocker, $me);
    // A friend banned since they sent a VS.
    $banned = User::factory()->withUsername('eski')->create();
    $this->befriend($me, $banned);
    Message::query()->create(['sender_id' => $banned->id, 'recipient_id' => $me->id, 'kind' => MessageKind::VsInvite, 'duel_id' => bellDuel($banned, $me)->id, 'created_at' => now()]);
    $banned->forceFill(['banned_at' => now()])->save();
    // A friend the player blocks through the app: everything between them goes.
    $parted = User::factory()->withUsername('kanka')->create();
    $this->befriend($me, $parted);
    Message::query()->create(['sender_id' => $parted->id, 'recipient_id' => $me->id, 'kind' => MessageKind::Friends, 'created_at' => now()]);
    $this->signIn($me);
    $this->putJson('/api/v1/users/kanka/block')->assertJsonPath('relation', 'blocked');

    bellOf($me)->assertJsonPath('notifications.*.id', ['request:acik'])->assertJsonPath('unseen', 1);
    $this->getJson('/api/v1/me/inbox')->assertJsonPath('notifications', 1);
});

test('the bell shows the newest fifty, and counts every one unseen', function () {
    $me = $this->me;
    $players = User::factory()->withUsername()->count(55)->create()->values();
    foreach ($players as $i => $player) {
        DB::table('friend_requests')->insert([
            'sender_id' => $player->id,
            'recipient_id' => $me->id,
            'created_at' => now()->addSeconds($i)->format(Timestamp::STORAGE_FORMAT),
        ]);
    }

    $response = bellOf($me)->assertJsonCount(50, 'notifications')->assertJsonPath('unseen', 55);
    expect($response->json('notifications.0.id'))->toBe('request:'.$players[54]->username)
        ->and($response->json('notifications.49.id'))->toBe('request:'.$players[5]->username);
    $this->getJson('/api/v1/me/inbox')->assertJsonPath('notifications', 55);
});

test('the number of queries does not grow with the notifications', function () {
    $me = $this->me;
    $count = function () use ($me): int {
        $this->signIn($me);
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/me/notifications')->assertOk();

        return count(DB::getQueryLog());
    };
    $grow = function (int $each) use ($me) {
        foreach (User::factory()->withUsername()->count($each)->create() as $player) {
            $this->recordRanked($player, 1000);
            $this->requestFriend($player, $me);
        }
        foreach (User::factory()->withUsername()->count($each)->create() as $friend) {
            $this->recordRanked($friend, 2000);
            $this->befriend($me, $friend);
            Message::query()->create(['sender_id' => $friend->id, 'recipient_id' => $me->id, 'kind' => MessageKind::Friends, 'created_at' => now()]);
            Message::query()->create(['sender_id' => $friend->id, 'recipient_id' => $me->id, 'kind' => MessageKind::VsInvite, 'duel_id' => bellDuel($friend, $me)->id, 'created_at' => now()]);
        }
    };

    $grow(1);
    $count();
    $few = $count();

    $grow(15);
    expect($count())->toBe($few);
    bellOf($me)->assertJsonCount(48, 'notifications')->assertJsonPath('unseen', 48);
});

test('the bell needs a player', function () {
    $this->assertApiError($this->getJson('/api/v1/me/notifications'), 401, 'unauthenticated');
    $this->assertApiError($this->postJson('/api/v1/me/notifications/seen'), 401, 'unauthenticated');
});
