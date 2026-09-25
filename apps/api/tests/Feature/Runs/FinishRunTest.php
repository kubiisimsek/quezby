<?php

use App\Content\ContentPicker;
use App\Enums\RunStatus;
use App\Game\ReelKind;
use App\Game\Run as Engine;
use App\Models\LeaderboardEntry;
use App\Models\PlayerStat;
use App\Models\Run;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

test('a finished run is replayed, ranked and recorded on every board', function () {
    $user = $this->signIn();
    $fixture = replayFixture('pro-7919');
    $summary = $fixture['summary'];
    $runId = $this->startRunFor($fixture);

    $response = $this->finishRun($runId, $fixture['actions'], $summary['score'], $summary['reels'])->assertOk();

    $response->assertJson([
        'run' => [
            'runId' => $runId,
            'mode' => 'free',
            'status' => 'ranked',
            'score' => $summary['score'],
            'reels' => $summary['reels'],
            'hits' => $summary['hits'],
            'misses' => $summary['misses'],
            'perfects' => $summary['perfects'],
            'maxStreak' => $summary['maxStreak'],
            'level' => $summary['level'],
            'accuracy' => $summary['accuracy'],
            'avgReactionMs' => $summary['avgReactionMs'],
            'activeMs' => $summary['activeMs'],
            'endedBy' => $summary['endedBy'],
            'maxCombo' => $summary['maxCombo'],
            'breakdown' => [
                'reelPoints' => $summary['score'] - $summary['bonusPoints'],
                'bonusPoints' => $summary['bonusPoints'],
            ],
        ],
        'best' => ['score' => $summary['score'], 'reels' => $summary['reels']],
        'isNewBest' => true,
        'ranks' => ['daily' => 1, 'weekly' => 1, 'monthly' => 1, 'all' => 1],
        'rankChanges' => [
            'daily' => ['before' => null, 'after' => 1],
            'weekly' => ['before' => null, 'after' => 1],
            'monthly' => ['before' => null, 'after' => 1],
            'all' => ['before' => null, 'after' => 1],
        ],
        'passed' => [],
        'daily' => null,
        // A new player's first counted run: the league opens two runs later.
        'league' => null,
        'leagueUnlock' => ['required' => 3, 'remaining' => 2],
    ]);

    $bonuses = $response->json('run.breakdown.bonuses');
    expect(array_map(fn (array $bonus) => $bonus['count'], $bonuses))->toBe($summary['bonuses'])
        ->and(array_sum(array_column($bonuses, 'points')))->toBe($summary['bonusPoints'])
        ->and($response->json('shareText'))->toBe("Quezby'de ".number_format($summary['score'], 0, ',', '.')." puan yaptım! {$summary['reels']} post · bugün #1. Sen kaç yaparsın?");

    $stats = $response->json('run.stats');
    expect($stats['swipes'] + $stats['likes'] + $stats['holds'] + $stats['freezes'])->toBe($summary['hits'])
        ->and(array_sum($stats['misses']))->toBe($summary['misses'])
        ->and(array_sum($stats['levelMisses']))->toBe($summary['misses'])
        ->and(count($stats['levelMisses']))->toBe(intdiv(count($fixture['actions']) - 1, 20) + 1)
        ->and($stats['perfects'])->toBe($summary['perfects'])
        ->and($stats['avgReactionMs'])->toBe($summary['avgReactionMs'])
        ->and($stats['bestReactionMs'])->toBeLessThanOrEqual($summary['avgReactionMs']);

    $run = Run::query()->findOrFail($runId);
    expect($run->status)->toBe(RunStatus::Ranked)
        ->and($run->flags)->toBeNull()
        ->and($run->actions)->toBe($fixture['actions'])
        ->and($run->open_user_id)->toBeNull()
        ->and($run->stats['swipes'])->toBe($stats['swipes']);
    expect(LeaderboardEntry::query()->where('user_id', $user->id)->where('season', 2)->pluck('period')->map->value->all())
        ->toEqualCanonicalizing(['daily', 'weekly', 'monthly', 'all']);
});

test('a run finishes once', function () {
    $this->signIn();
    $fixture = replayFixture('casual-42');
    $runId = $this->startRunFor($fixture);

    $this->finishRun($runId, $fixture['actions'], $fixture['summary']['score'], $fixture['summary']['reels'])->assertOk();

    $this->assertApiError(
        $this->finishRun($runId, $fixture['actions'], $fixture['summary']['score'], $fixture['summary']['reels']),
        409,
        'run_already_finished',
    );
});

test('a run left too long expires', function () {
    $this->signIn();
    $runId = $this->startRun()->json('runId');

    $this->travel(121)->minutes();

    $this->assertApiError($this->finishRun($runId, [], 0, 0), 410, 'run_expired');
    $run = Run::query()->findOrFail($runId);
    expect($run->status)->toBe(RunStatus::Expired)->and($run->open_user_id)->toBeNull();
});

test("another player's run is not found", function () {
    $theirs = Run::factory()->create();
    $this->signIn();

    $this->assertApiError($this->finishRun($theirs->id, [], 0, 0), 404, 'not_found');
    $this->assertApiError($this->finishRun('01jzzzzzzzzzzzzzzzzzzzzzzz', [], 0, 0), 404, 'not_found');
});

test('a log the engine refuses is rejected and stored', function () {
    $user = $this->signIn();
    $runId = $this->startRun()->json('runId');

    $this->assertApiError($this->finishRun($runId, [[1, 400.5, 0]], 999, 1), 422, 'run_rejected');

    $run = Run::query()->findOrFail($runId);
    expect($run->status)->toBe(RunStatus::Rejected)
        ->and($run->flags)->toBe([['code' => 'engine_error', 'error' => 'malformed_action', 'reelIndex' => 0, 'severity' => 'hard']])
        ->and($run->client_score)->toBe(999)
        ->and($run->score)->toBeNull()
        ->and($run->open_user_id)->toBeNull()
        ->and(LeaderboardEntry::query()->count())->toBe(0);
    $this->getJson('/api/v1/me')->assertJsonPath('user.best', null);

    $this->assertApiError($this->finishRun($runId, [], 0, 0), 409, 'run_already_finished');
});

test('the log envelope is validated before the engine sees it', function () {
    $this->signIn();
    $runId = $this->startRun()->json('runId');

    $this->assertApiError($this->postJson("/api/v1/runs/{$runId}/finish", ['clientScore' => 0, 'clientReels' => 0]), 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => ['actions']]]);
    $this->assertApiError($this->finishRun($runId, ['a' => [1, 400, 0]], 0, 0), 422, 'validation_failed');
    $this->assertApiError($this->postJson("/api/v1/runs/{$runId}/finish", ['actions' => [], 'clientScore' => -1]), 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => ['clientScore', 'clientReels']]]);
    $this->assertApiError($this->finishRun($runId, array_fill(0, 5001, [0, 0, 0]), 0, 0), 422, 'validation_failed');

    expect(Run::query()->findOrFail($runId)->status)->toBe(RunStatus::Started);
});

test('a lower run keeps the best and the rows', function () {
    $user = $this->signIn();
    $high = replayFixture('pro-7919');
    $low = replayFixture('casual-42');

    $this->finishRun($this->startRunFor($high), $high['actions'], $high['summary']['score'], $high['summary']['reels']);
    $this->finishRun($this->startRunFor($low), $low['actions'], $low['summary']['score'], $low['summary']['reels'])
        ->assertOk()
        ->assertJsonPath('run.status', 'ranked')
        ->assertJsonPath('isNewBest', false)
        ->assertJsonPath('best.score', $high['summary']['score'])
        ->assertJsonPath('rankChanges.daily', ['before' => 1, 'after' => 1]);

    expect(LeaderboardEntry::query()->where('user_id', $user->id)->pluck('score')->unique()->values()->all())
        ->toBe([$high['summary']['score']]);
});

test('a log that stops before the first reel is a quit that places nobody', function () {
    $this->signIn();
    $runId = $this->startRun()->json('runId');
    $this->travel(2)->seconds(); // The app's 3-2-1 always runs first.

    $this->finishRun($runId, [], 0, 0)
        ->assertOk()
        ->assertJsonPath('run.status', 'ranked')
        ->assertJsonPath('run.reels', 0)
        ->assertJsonPath('run.endedBy', 'quit')
        ->assertJsonPath('isNewBest', false)
        ->assertJsonPath('best', null)
        ->assertJsonPath('league', null)
        ->assertJsonPath('ranks', ['daily' => null, 'weekly' => null, 'monthly' => null, 'all' => null]);

    expect(LeaderboardEntry::query()->count())->toBe(0);
    $this->getJson('/api/v1/leaderboards/daily')->assertJsonPath('entries', [])->assertJsonPath('me', null);
});

test('a run started on another engine cannot be verified', function () {
    $this->signIn();
    $runId = $this->startRun()->json('runId');
    Run::query()->whereKey($runId)->update(['engine_version' => 1]);

    $this->assertApiError($this->finishRun($runId, [], 0, 0), 422, 'engine_outdated');
});

test('the result names the players the run overtook today, closest first', function () {
    $me = $this->signIn();
    $fixture = replayFixture('average-42');
    $score = $fixture['summary']['score'];
    $friend = User::factory()->withUsername('kanka')->create();
    $this->recordRanked($friend, $score - 10);
    $this->recordRanked(User::factory()->withUsername('uzak')->create(), $score - 5000);
    $this->recordRanked(User::factory()->withUsername('zirve')->create(), $score + 1);
    DB::table('follows')->insert(['follower_id' => $me->id, 'followee_id' => $friend->id, 'created_at' => now()]);

    $this->finishRun($this->startRunFor($fixture), $fixture['actions'], $score, $fixture['summary']['reels'])
        ->assertOk()
        ->assertJsonPath('passed', [
            ['username' => 'kanka', 'score' => $score - 10, 'isFollowing' => true],
            ['username' => 'uzak', 'score' => $score - 5000, 'isFollowing' => false],
        ])
        ->assertJsonPath('ranks.daily', 2)
        ->assertJsonPath('rankChanges.daily', ['before' => null, 'after' => 2]);
});

test('lifetime numbers add up ranked runs only', function () {
    $user = $this->signIn();
    $first = replayFixture('good-42');
    $second = replayFixture('casual-42');

    $this->finishRun($this->startRunFor($first), $first['actions'], $first['summary']['score'], $first['summary']['reels']);
    $this->finishRun($this->startRunFor($second), $second['actions'], $second['summary']['score'], $second['summary']['reels']);
    $flagged = replayFixture('pro-42');
    $this->finishRun($this->startRunFor($flagged, startedSecondsAgo: 5), $flagged['actions'], $flagged['summary']['score'], $flagged['summary']['reels'])
        ->assertJsonPath('run.status', 'flagged');

    $stats = PlayerStat::query()->findOrFail($user->id);
    expect($stats->runs)->toBe(2)
        ->and($stats->reels)->toBe($first['summary']['reels'] + $second['summary']['reels'])
        ->and($stats->misses)->toBe($first['summary']['misses'] + $second['summary']['misses'])
        ->and($stats->perfects)->toBe($first['summary']['perfects'] + $second['summary']['perfects'])
        ->and($stats->max_combo)->toBe(max($first['summary']['maxCombo'], $second['summary']['maxCombo']))
        ->and($stats->flawless)->toBe($first['summary']['bonuses']['flawless'] + $second['summary']['bonuses']['flawless']);

    $this->getJson('/api/v1/me/stats')->assertOk()
        ->assertJsonPath('stats.runs', 2)
        ->assertJsonPath('stats.reels', $stats->reels);
});

test('likes are credited to the posts the seed showed', function () {
    $user = $this->signIn();
    $fixture = replayFixture('average-7919');
    $this->finishRun($this->startRunFor($fixture), $fixture['actions'], $fixture['summary']['score'], $fixture['summary']['reels'])->assertOk();

    $expected = [];
    foreach (Engine::replay($fixture['seed'], $fixture['actions'])->steps as $step) {
        if ($step->reel->kind === ReelKind::Like && $step->verdict->isHit()) {
            $id = ContentPicker::postId(1, $fixture['seed'], $step->reel->index, ReelKind::Like);
            $expected[$id] = ($expected[$id] ?? 0) + 1;
        }
    }
    arsort($expected);

    expect($expected)->not->toBeEmpty();
    foreach ($expected as $id => $likes) {
        expect((int) DB::table('player_content')->where('user_id', $user->id)->where('content_id', $id)->value('likes'))->toBe($likes)
            ->and((int) DB::table('content_stats')->where('content_id', $id)->value('likes'))->toBe($likes);
    }
    expect((int) DB::table('content_stats')->sum('shows'))->toBe(count($fixture['actions']));

    $top = $this->getJson('/api/v1/me/stats')->assertOk()->json('topLiked');
    expect($top[0]['likes'])->toBe(max($expected))
        ->and(count($top))->toBe(min(5, count($expected)));
});

test('finishing is throttled per player', function () {
    $this->signIn();
    for ($i = 0; $i < 20; $i++) {
        $this->finishRun('01jzzzzzzzzzzzzzzzzzzzzzzz', [], 0, 0)->assertNotFound();
    }

    $this->assertApiError($this->finishRun('01jzzzzzzzzzzzzzzzzzzzzzzz', [], 0, 0), 429, 'too_many_requests');
});

test('runs keep the time they were finished to the millisecond', function () {
    $this->signIn();
    Carbon::setTestNow(Carbon::parse('2026-09-24 10:00:00.250'));
    $fixture = replayFixture('casual-1');
    $runId = $this->startRunFor($fixture);

    $this->finishRun($runId, $fixture['actions'], $fixture['summary']['score'], $fixture['summary']['reels'])->assertOk();

    expect(Run::query()->findOrFail($runId)->getRawOriginal('finished_at'))->toBe('2026-09-24 10:00:00.250');
});
