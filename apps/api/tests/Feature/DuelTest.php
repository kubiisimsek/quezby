<?php

use App\Enums\DuelStatus;
use App\Enums\MessageKind;
use App\Enums\RunStatus;
use App\Models\Duel;
use App\Models\LeaderboardEntry;
use App\Models\LeagueMember;
use App\Models\Message;
use App\Models\PlayerStat;
use App\Models\Run;
use App\Models\User;
use App\Services\ModerationService;
use App\Support\Actor;
use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-24 12:00', 'Europe/Istanbul'));
    $this->me = User::factory()->withUsername('ben')->create();
    $this->ekin = User::factory()->withUsername('ekin')->create();
    $this->befriend($this->me, $this->ekin);
});

/** The challenger's run against `ekin`, played for `$reels` reels. */
function challengeEkin(int $reels = 60): TestResponse
{
    test()->signIn(test()->me);

    return test()->playFeed('vs', $reels, body: ['opponent' => 'ekin']);
}

/** Ekin's answer to the VS, played for `$reels` reels. */
function answerAsEkin(string $duelId, int $reels = 40): TestResponse
{
    test()->signIn(test()->ekin);

    return test()->playFeed('vs', $reels, body: ['duel' => $duelId]);
}

test('the challenger plays first; the friend is told without the score; the higher clean score wins', function () {
    $sent = challengeEkin(60)->assertOk();
    $myScore = $sent->json('run.score');
    $duelId = $sent->json('duel.id');

    $sent->assertJsonPath('run.mode', 'vs')
        ->assertJsonPath('run.status', 'played')
        ->assertJsonPath('duel.status', 'waiting')
        ->assertJsonPath('duel.sent', true)
        ->assertJsonPath('duel.turn', 'them')
        ->assertJsonPath('duel.you', ['score' => $myScore, 'valid' => true])
        ->assertJsonPath('duel.them', null)
        ->assertJsonPath('duel.outcome', null)
        ->assertJsonPath('duel.expiresAt', '2026-09-26T09:00:00.000Z')
        ->assertJsonPath('duel.opponent.username', 'ekin')
        ->assertJsonPath('duel.opponent.relation', 'friend')
        ->assertJsonPath('shareText', null)
        ->assertJsonPath('passed', [])
        ->assertJsonPath('isNewBest', false)
        ->assertJsonPath('league', null)
        ->assertJsonPath('leagueUnlock', null)
        ->assertJsonPath('daily', null);
    $invite = Message::query()->sole();
    expect($invite->kind)->toBe(MessageKind::VsInvite)
        ->and($invite->sender_id)->toBe($this->me->id)
        ->and($invite->duel_id)->toBe($duelId);

    // Ekin sees whose turn it is — and nothing of the score.
    $this->signIn($this->ekin);
    $this->getJson('/api/v1/me/inbox')->assertExactJson(['requests' => 0, 'threads' => 1, 'yourTurn' => 1]);
    $this->getJson('/api/v1/me/threads/ben')
        ->assertJsonPath('duel.turn', 'you')
        ->assertJsonPath('duel.sent', false)
        ->assertJsonPath('duel.you', null)
        ->assertJsonPath('duel.them', null)
        ->assertJsonPath('messages.0.kind', 'vs_invite')
        ->assertJsonPath('messages.0.duel.them', null);
    $this->getJson('/api/v1/me/friends')->assertJsonPath('friends.0.duel.turn', 'you');

    $answer = answerAsEkin($duelId, 40)->assertOk();
    $theirScore = $answer->json('run.score');
    expect($theirScore)->toBeLessThan($myScore);
    $answer->assertJsonPath('duel.status', 'finished')
        ->assertJsonPath('duel.outcome', 'lost')
        ->assertJsonPath('duel.you', ['score' => $theirScore, 'valid' => true])
        ->assertJsonPath('duel.them', ['score' => $myScore, 'valid' => true])
        ->assertJsonPath('duel.h2h', ['wins' => 0, 'losses' => 1, 'draws' => 0]);
    expect(Message::query()->latest('id')->first()->kind)->toBe(MessageKind::VsResult);

    $this->signIn($this->me);
    $this->getJson("/api/v1/duels/{$duelId}")
        ->assertOk()
        ->assertJsonPath('duel.outcome', 'won')
        ->assertJsonPath('duel.them.score', $theirScore)
        ->assertJsonPath('duel.h2h', ['wins' => 1, 'losses' => 0, 'draws' => 0]);
    $this->getJson('/api/v1/users/ekin')->assertJsonPath('player.relation', 'friend');
});

test('a VS never counts: no board, league, stat, record or step towards the league', function () {
    $duelId = challengeEkin()->json('duel.id');
    answerAsEkin($duelId);

    expect(Run::query()->where('mode', 'vs')->pluck('status')->map->value->all())->toBe(['played', 'played'])
        ->and(LeaderboardEntry::query()->count())->toBe(0)
        ->and(PlayerStat::query()->count())->toBe(0)
        ->and(LeagueMember::query()->count())->toBe(0);
    $this->getJson('/api/v1/me')->assertJsonPath('user.best', null)->assertJsonPath('ranks', ['weekly' => null, 'monthly' => null, 'all' => null]);
    $this->getJson('/api/v1/leagues/current')->assertJsonPath('unlock', ['required' => 20, 'remaining' => 20]);
});

test('a tie is a draw', function () {
    $duelId = challengeEkin(50)->json('duel.id');

    answerAsEkin($duelId, 50)->assertJsonPath('duel.outcome', 'draw')->assertJsonPath('duel.h2h.draws', 1);
});

test('only a friend can be challenged', function () {
    User::factory()->withUsername('yabanci')->create();
    $this->signIn($this->me);

    $this->assertApiError($this->startRun(['mode' => 'vs', 'opponent' => 'yabanci']), 422, 'not_friends');
    $this->assertApiError($this->startRun(['mode' => 'vs', 'opponent' => 'ben']), 422, 'not_friends');
    $this->assertApiError($this->startRun(['mode' => 'vs', 'opponent' => 'kimse.yok']), 404, 'not_found');
    expect(Duel::query()->count())->toBe(0);
});

test('two friends have one open VS at a time, whoever sent it', function () {
    challengeEkin()->assertOk();

    $this->assertApiError($this->startRun(['mode' => 'vs', 'opponent' => 'ekin']), 409, 'duel_unavailable');
    $this->signIn($this->ekin);
    $this->assertApiError($this->startRun(['mode' => 'vs', 'opponent' => 'ben']), 409, 'duel_unavailable');
});

test('a VS nobody answered in time runs out and counts for nobody', function () {
    $duelId = challengeEkin()->json('duel.id');

    Carbon::setTestNow(now()->addHours(49));
    $this->signIn($this->ekin);
    $this->getJson('/api/v1/me/inbox')->assertJsonPath('yourTurn', 0);
    $this->assertApiError($this->startRun(['mode' => 'vs', 'duel' => $duelId]), 409, 'duel_unavailable');

    expect(Duel::query()->find($duelId)->status)->toBe(DuelStatus::Expired)
        ->and(Message::query()->latest('id')->first()->kind)->toBe(MessageKind::VsExpired);
    $this->signIn($this->me);
    $this->getJson("/api/v1/duels/{$duelId}")->assertJsonPath('duel.status', 'expired')->assertJsonPath('duel.outcome', null)->assertJsonPath('duel.h2h', ['wins' => 0, 'losses' => 0, 'draws' => 0]);
    // A new one can be sent now.
    challengeEkin()->assertOk()->assertJsonPath('duel.status', 'waiting');
});

test('the friend can turn a VS down, but not play it then', function () {
    $duelId = challengeEkin()->json('duel.id');
    $this->signIn($this->ekin);

    $this->postJson("/api/v1/duels/{$duelId}/decline")->assertOk()->assertJsonPath('duel.status', 'declined');
    $this->assertApiError($this->startRun(['mode' => 'vs', 'duel' => $duelId]), 409, 'duel_unavailable');
    $this->assertApiError($this->postJson("/api/v1/duels/{$duelId}/decline"), 409, 'duel_unavailable');
    expect(Message::query()->latest('id')->first()->kind)->toBe(MessageKind::VsDeclined);
});

test('a challenger\'s run that is not clean never sends the VS', function () {
    $this->signIn($this->me);
    $start = $this->startRun(['mode' => 'vs', 'opponent' => 'ekin'])->assertCreated();
    $actions = playedLog($start->json('seed'), 80, 430, 110);
    $summary = App\Game\Run::replay($start->json('seed'), $actions)->summary;

    // Finished the moment it started: faster than any phone can play it.
    $this->finishRun($start->json('runId'), $actions, $summary->score, $summary->reels)
        ->assertOk()
        ->assertJsonPath('run.status', 'flagged')
        ->assertJsonPath('duel.status', 'void')
        ->assertJsonPath('duel.you.valid', false);

    expect(Message::query()->count())->toBe(0);
    $this->signIn($this->ekin);
    $this->getJson('/api/v1/me/inbox')->assertJsonPath('yourTurn', 0);
    $this->getJson('/api/v1/me/threads/ben')->assertJsonPath('duel', null);
});

test('a friend who leaves their run unfinished loses the VS', function () {
    $duelId = challengeEkin()->json('duel.id');
    $this->signIn($this->ekin);
    $this->startRun(['mode' => 'vs', 'duel' => $duelId])->assertCreated();
    // Another run abandons the VS run.
    $this->startRun()->assertCreated();

    $this->getJson("/api/v1/duels/{$duelId}")
        ->assertJsonPath('duel.status', 'finished')
        ->assertJsonPath('duel.outcome', 'lost')
        ->assertJsonPath('duel.you', ['score' => null, 'valid' => false]);
});

test('ending the friendship cancels the open VS', function () {
    $duelId = challengeEkin()->json('duel.id');

    $this->deleteJson('/api/v1/users/ekin/friend')->assertOk();

    expect(Duel::query()->find($duelId)->status)->toBe(DuelStatus::Cancelled)
        ->and(Duel::query()->find($duelId)->open_pair)->toBeNull();
});

test('VS waiting for an answer stop at the limit', function () {
    config(['quezby.duels.waiting_limit' => 1]);
    $other = User::factory()->withUsername('deniz')->create();
    $this->befriend($this->me, $other);
    challengeEkin()->assertOk();

    $this->assertApiError($this->startRun(['mode' => 'vs', 'opponent' => 'deniz']), 422, 'duel_limit');
});

test('a VS start names a friend or a VS, not both and not neither', function (array $body) {
    $this->signIn($this->me);

    $this->assertApiError($this->startRun(['mode' => 'vs'] + $body), 422, 'validation_failed');
})->with([
    'neither' => [[]],
    'both' => [['opponent' => 'ekin', 'duel' => '01jduel0000000000000000000']],
    'a duel that is no id' => [['duel' => 'not-a-duel']],
]);

test('nobody else can answer, see or turn down a VS', function () {
    $duelId = challengeEkin()->json('duel.id');
    $this->signIn(User::factory()->withUsername('baska')->create());

    $this->assertApiError($this->startRun(['mode' => 'vs', 'duel' => $duelId]), 404, 'not_found');
    $this->assertApiError($this->getJson("/api/v1/duels/{$duelId}"), 404, 'not_found');
    $this->assertApiError($this->postJson("/api/v1/duels/{$duelId}/decline"), 404, 'not_found');
});

test('the friend does not see a VS before it was sent', function () {
    $this->signIn($this->me);
    $duelId = $this->startRun(['mode' => 'vs', 'opponent' => 'ekin'])->assertCreated()->json('duelId');

    $this->signIn($this->ekin);
    $this->assertApiError($this->getJson("/api/v1/duels/{$duelId}"), 404, 'not_found');
    $this->getJson('/api/v1/me/threads/ben')->assertJsonPath('duel', null);
});

test('a moderator has nothing to throw out of a VS run', function () {
    challengeEkin();
    $run = Run::query()->where('mode', 'vs')->sole();
    $run->forceFill(['status' => RunStatus::Flagged])->save();

    expect(app(ModerationService::class)->reject($run, 'deneme', Actor::system('test')))->toBeFalse();
});
