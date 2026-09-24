<?php

use App\Enums\RunStatus;
use App\Game\Run as Engine;
use App\Models\LeaderboardEntry;
use App\Models\Run;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;

const MODERATION_ENDPOINT_TOKEN = 'a-long-random-moderation-token';

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-24 12:00', 'Europe/Istanbul'));
    config(['quezby.moderation_token' => MODERATION_ENDPOINT_TOKEN]);
});

/**
 * A top score held back for review, with the log an approval replays.
 */
function moderationEndpointHeldRun(User $player, int $seed = 4242, int $reels = 100): Run
{
    $actions = playedLog($seed, $reels, 400);
    $summary = Engine::replay($seed, $actions)->summary;

    return Run::factory()->for($player)->ranked($summary->score, $summary->reels)->create([
        'seed' => $seed,
        'status' => RunStatus::Review,
        'actions' => $actions,
        'flags' => [['code' => 'reaction_cv', 'cv' => 0, 'samples' => 60, 'severity' => 'soft']],
    ]);
}

/**
 * @param  array<string, mixed>  $body
 */
function postModeration(array $body, string $token = MODERATION_ENDPOINT_TOKEN): TestResponse
{
    return test()->postJson('/api/v1/ops/moderate', $body, ['X-Moderation-Token' => $token]);
}

test('the moderation route does not exist without a token', function () {
    config(['quezby.moderation_token' => '']);

    $this->assertApiError($this->postJson('/api/v1/ops/moderate', ['action' => 'held']), 404, 'not_found');
    $this->assertApiError(postModeration(['action' => 'held'], ''), 404, 'not_found');
});

test('a wrong or missing token is refused', function () {
    $this->assertApiError(postModeration(['action' => 'held'], 'guess'), 401, 'unauthenticated');
    $this->assertApiError($this->postJson('/api/v1/ops/moderate', ['action' => 'held']), 401, 'unauthenticated');
});

test('held lists the runs waiting for review, best first', function () {
    $low = moderationEndpointHeldRun(User::factory()->withUsername('dusuk')->create(), reels: 60);
    $high = moderationEndpointHeldRun(User::factory()->withUsername('yuksek')->create(), reels: 120);
    $this->recordRanked(User::factory()->withUsername()->create(), 5000);

    postModeration(['action' => 'held'])
        ->assertOk()
        ->assertJsonPath('runs.*.runId', [$high->id, $low->id])
        ->assertJsonPath('runs.0.username', 'yuksek')
        ->assertJsonPath('runs.0.score', $high->score)
        ->assertJsonPath('runs.0.reels', $high->reels)
        ->assertJsonPath('runs.0.flags.0.code', 'reaction_cv');
});

test('approve lets a held run rank', function () {
    $player = User::factory()->withUsername('kerem.35')->create();
    $run = moderationEndpointHeldRun($player);

    postModeration(['action' => 'approve', 'runId' => $run->id])->assertOk()->assertExactJson(['done' => true]);

    expect($run->fresh()->status)->toBe(RunStatus::Ranked)
        ->and(LeaderboardEntry::query()->where('user_id', $player->id)->where('period', 'all')->value('score'))->toBe($run->score);

    postModeration(['action' => 'approve', 'runId' => $run->id])->assertOk()->assertExactJson(['done' => false]);
});

test("reject throws a run out and rebuilds the player's boards", function () {
    $player = User::factory()->withUsername('kerem.35')->create();
    $this->recordRanked($player, 3000);
    $cheated = $this->recordRanked($player, 9000);

    postModeration(['action' => 'reject', 'runId' => $cheated->id, 'reason' => 'Bot gibi'])->assertOk()->assertExactJson(['done' => true]);

    expect($cheated->fresh()->status)->toBe(RunStatus::Rejected)
        ->and(LeaderboardEntry::query()->where('user_id', $player->id)->pluck('score')->unique()->values()->all())->toBe([3000]);
});

test('ban takes a player off the boards and unban puts them back', function () {
    $player = User::factory()->withUsername('hileci')->create();
    $this->recordRanked($player, 5000);

    postModeration(['action' => 'ban', 'username' => 'Hileci', 'reason' => 'Hız hilesi'])->assertOk()->assertExactJson(['done' => true]);
    expect($player->fresh()->isBanned())->toBeTrue()
        ->and(LeaderboardEntry::query()->where('user_id', $player->id)->count())->toBe(0);

    postModeration(['action' => 'unban', 'username' => 'hileci'])->assertOk()->assertExactJson(['done' => true]);
    expect($player->fresh()->isBanned())->toBeFalse()
        ->and(LeaderboardEntry::query()->where('user_id', $player->id)->where('period', 'all')->value('score'))->toBe(5000);
});

test('an unknown run or player is not found', function () {
    $this->assertApiError(postModeration(['action' => 'approve', 'runId' => '01jzzzzzzzzzzzzzzzzzzzzzzz']), 404, 'not_found');
    $this->assertApiError(postModeration(['action' => 'reject', 'runId' => '01jzzzzzzzzzzzzzzzzzzzzzzz', 'reason' => 'Hile']), 404, 'not_found');
    $this->assertApiError(postModeration(['action' => 'ban', 'username' => 'kimse.yok', 'reason' => 'Hile']), 404, 'not_found');
    $this->assertApiError(postModeration(['action' => 'unban', 'username' => 'kimse.yok']), 404, 'not_found');
});

test('each action asks for what it needs', function (array $body, string $field) {
    $this->assertApiError(postModeration($body), 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => [$field]]]);
})->with([
    'no action' => [[], 'action'],
    'an unknown action' => [['action' => 'delete'], 'action'],
    'approve without a run' => [['action' => 'approve'], 'runId'],
    'reject without a reason' => [['action' => 'reject', 'runId' => '01jzzzzzzzzzzzzzzzzzzzzzzz'], 'reason'],
    'ban without a player' => [['action' => 'ban', 'reason' => 'Hile'], 'username'],
    'ban without a reason' => [['action' => 'ban', 'username' => 'hileci'], 'reason'],
    'a reason too long' => [['action' => 'ban', 'username' => 'hileci', 'reason' => str_repeat('x', 192)], 'reason'],
]);
