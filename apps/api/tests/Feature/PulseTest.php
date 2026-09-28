<?php

use App\Enums\DuelStatus;
use App\Enums\MessageKind;
use App\Models\Duel;
use App\Models\Message;
use App\Models\User;
use Illuminate\Support\Carbon;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-24 12:00', 'Europe/Istanbul'));
    $this->me = User::factory()->withUsername('ben')->create();
    $this->ekin = User::factory()->withUsername('ekin')->create();
});

/** Where `$player`'s pulse stands, asked the way their phone asks. */
function pulseOf(User $player): int
{
    test()->signIn($player);

    return test()->getJson('/api/v1/me/pulse')->assertOk()->json('stamp');
}

test('a pulse starts still, and only a signed-in player has one', function () {
    $this->assertApiError($this->getJson('/api/v1/me/pulse'), 401, 'unauthenticated');

    $this->signIn($this->me);
    $this->getJson('/api/v1/me/pulse')->assertOk()->assertExactJson(['stamp' => 0]);
});

test('a friend request moves both pulses, and so does its answer', function () {
    $this->signIn($this->me);
    $this->putJson('/api/v1/users/ekin/friend')->assertJsonPath('relation', 'requested');
    expect(pulseOf($this->ekin))->toBe(1)->and(pulseOf($this->me))->toBe(1);

    // Asking again changes nothing, so nothing moves.
    $this->signIn($this->me);
    $this->putJson('/api/v1/users/ekin/friend')->assertJsonPath('relation', 'requested');
    expect(pulseOf($this->ekin))->toBe(1);

    $this->signIn($this->ekin);
    $this->putJson('/api/v1/users/ben/friend')->assertJsonPath('relation', 'friend');
    expect(pulseOf($this->me))->toBe(2)->and(pulseOf($this->ekin))->toBe(2);
});

test('a phrase moves both pulses; reading it moves none', function () {
    $this->befriend($this->me, $this->ekin);
    $this->signIn($this->me);
    $this->postJson('/api/v1/me/threads/ekin/messages', ['phrase' => 'gg'])->assertCreated();

    expect(pulseOf($this->ekin))->toBe(1);
    $this->signIn($this->ekin);
    $this->postJson('/api/v1/me/threads/ben/read')->assertNoContent();
    expect(pulseOf($this->ekin))->toBe(1)->and(pulseOf($this->me))->toBe(1);
});

test('a VS moves the friend when it is sent, and both when it is answered', function () {
    $this->befriend($this->me, $this->ekin);
    $this->signIn($this->me);
    $duelId = $this->playFeed('vs', 60, body: ['opponent' => 'ekin'])->assertOk()->json('duel.id');

    expect(pulseOf($this->ekin))->toBe(1);
    $this->signIn($this->ekin);
    $this->playFeed('vs', 40, body: ['duel' => $duelId])->assertOk()->assertJsonPath('duel.status', 'finished');

    expect(pulseOf($this->me))->toBe(2)->and(pulseOf($this->ekin))->toBe(2);
});

test('turning a VS down moves both pulses', function () {
    $this->befriend($this->me, $this->ekin);
    $this->signIn($this->me);
    $duelId = $this->playFeed('vs', 60, body: ['opponent' => 'ekin'])->json('duel.id');

    $this->signIn($this->ekin);
    $this->postJson("/api/v1/duels/{$duelId}/decline")->assertOk();

    expect(pulseOf($this->me))->toBe(2)->and(pulseOf($this->ekin))->toBe(2);
});

test('a VS whose time ran out is settled by the pulse itself, and both hear of it', function () {
    $this->befriend($this->me, $this->ekin);
    $this->signIn($this->me);
    $duelId = $this->playFeed('vs', 60, body: ['opponent' => 'ekin'])->json('duel.id');
    expect(pulseOf($this->ekin))->toBe(1);

    Carbon::setTestNow(now()->addHours(47));
    expect(pulseOf($this->ekin))->toBe(1)
        ->and(Duel::query()->find($duelId)->status)->toBe(DuelStatus::Waiting);

    Carbon::setTestNow(now()->addHours(2));
    expect(pulseOf($this->ekin))->toBe(2)
        ->and(Duel::query()->find($duelId)->status)->toBe(DuelStatus::Expired)
        ->and(Message::query()->latest('id')->first()->kind)->toBe(MessageKind::VsExpired)
        ->and(pulseOf($this->me))->toBe(2);
});

test('ending a friendship moves both pulses; ending nothing moves none', function () {
    $this->befriend($this->me, $this->ekin);
    $this->signIn($this->me);

    $this->deleteJson('/api/v1/users/ekin/friend')->assertJsonPath('relation', 'none');
    expect(pulseOf($this->ekin))->toBe(1)->and(pulseOf($this->me))->toBe(1);

    $this->signIn($this->me);
    $this->deleteJson('/api/v1/users/ekin/friend')->assertJsonPath('relation', 'none');
    expect(pulseOf($this->ekin))->toBe(1)->and(pulseOf($this->me))->toBe(1);
});

test('a block moves the blocker, and the friend it parted too; lifting it moves the blocker', function () {
    $this->befriend($this->me, $this->ekin);
    $this->signIn($this->me);

    $this->putJson('/api/v1/users/ekin/block')->assertJsonPath('relation', 'blocked');
    expect(pulseOf($this->me))->toBe(2)->and(pulseOf($this->ekin))->toBe(1);

    $this->signIn($this->me);
    $this->deleteJson('/api/v1/users/ekin/block')->assertJsonPath('relation', 'none');
    expect(pulseOf($this->me))->toBe(3)->and(pulseOf($this->ekin))->toBe(1);
});

test('the pulse has a budget of its own, apart from the other reads', function () {
    $this->signIn($this->me);
    foreach (range(1, 60) as $ask) {
        $this->getJson('/api/v1/me/pulse')->assertOk();
    }

    $this->assertApiError($this->getJson('/api/v1/me/pulse'), 429, 'too_many_requests');
    $this->getJson('/api/v1/me/inbox')->assertOk();
});
