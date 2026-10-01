<?php

use App\Enums\RunStatus;
use App\Game\Checkpoint;
use App\Game\Run as Engine;
use App\Models\LeaderboardEntry;
use App\Models\Run;
use App\Models\User;
use App\Services\RunClock;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/*
| Checkpoints: a few times in a ranked run the app has the API stamp how far
| it got (`POST /runs/{id}/checkpoint`), and the finish brings the receipts
| back. A slowed-down game passes the wall-clock check at the finish; it
| does not pass its checkpoints.
*/

/**
 * A receipt the API signs for `$reel` moves of `$actions`, seen `$afterStartMs` after the run started.
 *
 * @param  array<mixed>  $actions
 */
function checkpointReceipt(string $runId, array $actions, int $reel, int $afterStartMs, ?array $hashOf = null): string
{
    $run = Run::query()->findOrFail($runId);

    return app(Checkpoint::class)->sign($runId, $reel, Checkpoint::prefixHash($hashOf ?? $actions, $reel), $run->started_at->getTimestampMs() + $afterStartMs);
}

/**
 * The least ms after the run's start by which the app has come to the verdict of reel `$reel` —
 * where it checks in, before the pause and slide that follow.
 *
 * @param  array<mixed>  $actions
 */
function checkpointNeeded(int $seed, array $actions, int $reel): int
{
    return app(RunClock::class)->verdicts(Engine::replay($seed, $actions))[$reel - 1];
}

/** A long run, played honestly and started as long ago as it took. */
function longRun(object $test): array
{
    $fixture = replayFixture('pro-7919');

    return [$fixture, $test->startRunFor($fixture)];
}

describe('the endpoint', function () {
    it('stamps a started run with the time it saw it, and writes nothing', function () {
        Carbon::setTestNow('2026-09-24 12:00:00.250');
        $this->signIn();
        $runId = $this->startRun()->json('runId');
        $hash = hash('sha256', '1,412,0;2,530,0');
        Carbon::setTestNow('2026-09-24 12:00:47.125');

        DB::enableQueryLog();
        $response = $this->postJson("/api/v1/runs/{$runId}/checkpoint", ['reel' => 2, 'prefixHash' => $hash])->assertOk();
        $writes = collect(DB::getQueryLog())->pluck('query')->filter(fn (string $sql) => preg_match('/^\s*(insert|update|delete)/i', $sql) === 1);
        DB::disableQueryLog();

        $receipt = app(Checkpoint::class)->open($response->json('receipt'));
        expect($response->json())->toHaveKeys(['receipt'])->toHaveCount(1)
            ->and($receipt?->runId)->toBe($runId)
            ->and($receipt?->reel)->toBe(2)
            ->and($receipt?->prefixHash)->toBe($hash)
            ->and($receipt?->timeMs)->toBe(Carbon::parse('2026-09-24 12:00:47.125')->getTimestampMs())
            // Sanctum's `last_used_at` is not ours to count; the run is untouched.
            ->and($writes->reject(fn (string $sql) => str_contains($sql, 'personal_access_tokens'))->all())->toBe([]);
    });

    it('validates what it signs', function (array $body, array $fields) {
        $this->signIn();
        $runId = $this->startRun()->json('runId');

        $this->assertApiError($this->postJson("/api/v1/runs/{$runId}/checkpoint", $body), 422, 'validation_failed')
            ->assertJsonStructure(['error' => ['fields' => $fields]]);
    })->with([
        'nothing' => [[], ['reel', 'prefixHash']],
        'no reels yet' => [['reel' => 0, 'prefixHash' => str_repeat('a', 64)], ['reel']],
        'more reels than a log holds' => [['reel' => 5001, 'prefixHash' => str_repeat('a', 64)], ['reel']],
        'a fraction' => [['reel' => 1.5, 'prefixHash' => str_repeat('a', 64)], ['reel']],
        'upper-case hex' => [['reel' => 1, 'prefixHash' => str_repeat('A', 64)], ['prefixHash']],
        'a short hash' => [['reel' => 1, 'prefixHash' => str_repeat('a', 63)], ['prefixHash']],
        'not hex' => [['reel' => 1, 'prefixHash' => str_repeat('g', 64)], ['prefixHash']],
    ]);

    it('only stamps the player\'s own started run', function () {
        $theirs = Run::factory()->create();
        $this->signIn();
        $body = ['reel' => 1, 'prefixHash' => str_repeat('a', 64)];

        $this->assertApiError($this->postJson("/api/v1/runs/{$theirs->id}/checkpoint", $body), 404, 'not_found');
        $this->assertApiError($this->postJson('/api/v1/runs/01jzzzzzzzzzzzzzzzzzzzzzzz/checkpoint', $body), 404, 'not_found');

        $first = $this->startRun()->json('runId');
        $this->startRun()->assertCreated();
        $this->assertApiError($this->postJson("/api/v1/runs/{$first}/checkpoint", $body), 409, 'run_already_finished');

        $finished = $this->startRun()->json('runId');
        $this->travel(2)->seconds();
        $this->finishRun($finished, [], 0, 0)->assertOk();
        $this->assertApiError($this->postJson("/api/v1/runs/{$finished}/checkpoint", $body), 409, 'run_already_finished');
    });

    it('does not stamp a run that outlived its time, and leaves it to the finish to close', function () {
        $this->signIn();
        $runId = $this->startRun()->json('runId');
        $this->travel(121)->minutes();

        $this->assertApiError($this->postJson("/api/v1/runs/{$runId}/checkpoint", ['reel' => 1, 'prefixHash' => str_repeat('a', 64)]), 410, 'run_expired');

        expect(Run::query()->findOrFail($runId)->status)->toBe(RunStatus::Started);
    });

    it('is throttled per player', function () {
        $this->signIn();
        $runId = $this->startRun()->json('runId');
        for ($i = 1; $i <= 12; $i++) {
            $this->postJson("/api/v1/runs/{$runId}/checkpoint", ['reel' => $i, 'prefixHash' => str_repeat('a', 64)])->assertOk();
        }

        $this->assertApiError($this->postJson("/api/v1/runs/{$runId}/checkpoint", ['reel' => 13, 'prefixHash' => str_repeat('a', 64)]), 429, 'too_many_requests');
    });
});

describe('at the finish', function () {
    it('ranks an honest run whose receipts check out', function () {
        $this->signIn();
        [$fixture, $runId] = longRun($this);
        $receipts = $this->honestCheckpoints($runId, $fixture['actions']);

        $this->finishRun($runId, $fixture['actions'], $fixture['summary']['score'], $fixture['summary']['reels'], $receipts)
            ->assertOk()
            ->assertJsonPath('run.status', 'ranked')
            ->assertJsonPath('run.flagReason', null);

        expect($receipts)->toHaveCount(3)
            ->and(Run::query()->findOrFail($runId)->flags)->toBeNull();
    });

    it('checks in through the API the way the app does', function () {
        $this->signIn();
        $fixture = replayFixture('pro-7919');
        Carbon::setTestNow('2026-09-24 12:00:00.000');
        $runId = $this->startRunFor($fixture, startedSecondsAgo: 0);
        $clock = app(RunClock::class);

        $receipts = [];
        foreach ($clock->checkIns(Engine::replay($fixture['seed'], $fixture['actions']), config('quezby.plausibility.checkpoints.marks_ms')) as ['reel' => $reel, 'atMs' => $atMs]) {
            Carbon::setTestNow(Carbon::parse('2026-09-24 12:00:00.000')->addMilliseconds($clock->countdownMs() + $atMs + 300));
            $receipts[] = $this->postJson("/api/v1/runs/{$runId}/checkpoint", [
                'reel' => $reel,
                'prefixHash' => Checkpoint::prefixHash($fixture['actions'], $reel),
            ])->assertOk()->json('receipt');
        }
        $needed = $clock->needed(Engine::replay($fixture['seed'], $fixture['actions']));
        Carbon::setTestNow(Carbon::parse('2026-09-24 12:00:00.000')->addMilliseconds(end($needed) + 2000));

        $this->finishRun($runId, $fixture['actions'], $fixture['summary']['score'], $fixture['summary']['reels'], $receipts)
            ->assertOk()
            ->assertJsonPath('run.status', 'ranked');
        expect(array_map(fn (string $receipt) => app(Checkpoint::class)->open($receipt)?->reel, $receipts))
            ->toBe(array_column($clock->checkIns(Engine::replay($fixture['seed'], $fixture['actions']), [45000, 120000, 240000]), 'reel'));
    });

    it('flags a receipt the API did not sign', function (Closure $forge) {
        $this->signIn();
        [$fixture, $runId] = longRun($this);
        $receipts = $this->honestCheckpoints($runId, $fixture['actions']);
        $receipts[1] = $forge($receipts[1], $runId, $fixture);

        $this->finishRun($runId, $fixture['actions'], $fixture['summary']['score'], $fixture['summary']['reels'], $receipts)
            ->assertOk()
            ->assertJsonPath('run.status', 'flagged')
            ->assertJsonPath('run.flagReason', null);

        expect(Run::query()->findOrFail($runId)->flags)->toContain(['code' => 'checkpoint_forged', 'receipt' => 1, 'severity' => 'hard'])
            ->and(LeaderboardEntry::query()->count())->toBe(0);
    })->with([
        'a changed signature' => [fn (string $receipt) => substr($receipt, 0, -2).(str_ends_with($receipt, 'AA') ? 'BB' : 'AA')],
        'a changed payload' => [function (string $receipt) {
            [$payload, $signature] = explode('.', $receipt);
            $data = json_decode((string) base64_decode(strtr($payload, '-_', '+/')), true);
            $data['t'] -= 60_000;

            return rtrim(strtr(base64_encode((string) json_encode($data)), '+/', '-_'), '=').'.'.$signature;
        }],
        'signed with another key' => [function (string $receipt, string $runId, array $fixture) {
            $opened = app(Checkpoint::class)->open($receipt);

            return (new Checkpoint('base64:'.base64_encode(random_bytes(32))))->sign($runId, $opened->reel, $opened->prefixHash, $opened->timeMs);
        }],
        'not a receipt' => [fn () => 'hello'],
        "another run's" => [function (string $receipt) {
            $opened = app(Checkpoint::class)->open($receipt);

            return app(Checkpoint::class)->sign(Run::factory()->create()->id, $opened->reel, $opened->prefixHash, $opened->timeMs);
        }],
    ]);

    it('flags a receipt over other moves than the log', function (Closure $receipt) {
        $this->signIn();
        [$fixture, $runId] = longRun($this);
        $receipts = $this->honestCheckpoints($runId, $fixture['actions']);
        $receipts[0] = $receipt($runId, $fixture);

        $this->finishRun($runId, $fixture['actions'], $fixture['summary']['score'], $fixture['summary']['reels'], $receipts)
            ->assertJsonPath('run.status', 'flagged');

        expect(collect(Run::query()->findOrFail($runId)->flags)->firstWhere('code', 'checkpoint_mismatch'))->toMatchArray(['severity' => 'hard']);
    })->with([
        // The first 150 moves, rewritten after the checkpoint: one decision changed.
        'a rewritten past' => [function (string $runId, array $fixture) {
            $past = $fixture['actions'];
            $past[10] = [$past[10][0], $past[10][1] + 1, $past[10][2]];

            return checkpointReceipt($runId, $fixture['actions'], 150, checkpointNeeded($fixture['seed'], $fixture['actions'], 150), $past);
        }],
        'past the end of the log' => [fn (string $runId, array $fixture) => app(Checkpoint::class)->sign(
            $runId,
            count($fixture['actions']) + 1,
            Checkpoint::prefixHash($fixture['actions'], count($fixture['actions']) + 1),
            Run::query()->findOrFail($runId)->started_at->getTimestampMs() + 60_000,
        )],
    ]);

    it('flags a receipt stamped sooner than those moves can be played', function () {
        $this->signIn();
        [$fixture, $runId] = longRun($this);
        $needed = checkpointNeeded($fixture['seed'], $fixture['actions'], 200);
        $tolerance = config('quezby.plausibility.clock_tolerance_ms');

        $early = checkpointReceipt($runId, $fixture['actions'], 200, $needed - $tolerance - 1);
        $this->finishRun($runId, $fixture['actions'], $fixture['summary']['score'], $fixture['summary']['reels'], [$early, ...$this->honestCheckpoints($runId, $fixture['actions'])])
            ->assertJsonPath('run.status', 'flagged');

        expect(Run::query()->findOrFail($runId)->flags[0])->toBe([
            'code' => 'wall_clock', 'reel' => 200, 'elapsedMs' => $needed - $tolerance - 1, 'neededMs' => $needed - $tolerance, 'severity' => 'hard',
        ]);
    });

    it('takes a receipt stamped right at the verdict, before the pause and slide, with no tolerance at all', function () {
        config(['quezby.plausibility.clock_tolerance_ms' => 0]);
        $this->signIn();
        [$fixture, $runId] = longRun($this);
        $replay = Engine::replay($fixture['seed'], $fixture['actions']);
        // A miss past the first mark: its pause and slide are the longest the app takes.
        $reel = collect($replay->steps)->search(fn ($step, int $i) => $i > 100 && ! $step->verdict->isHit()) + 1;
        $atVerdict = checkpointNeeded($fixture['seed'], $fixture['actions'], $reel);
        expect(app(RunClock::class)->needed($replay)[$reel] - $atVerdict)
            ->toBe(config('quezby.plausibility.pace.exit_ms.miss') + config('quezby.plausibility.pace.slide_ms'));

        $receipts = [...$this->honestCheckpoints($runId, $fixture['actions']), checkpointReceipt($runId, $fixture['actions'], $reel, $atVerdict)];
        $this->finishRun($runId, $fixture['actions'], $fixture['summary']['score'], $fixture['summary']['reels'], $receipts)
            ->assertJsonPath('run.status', 'ranked');

        [$fixture, $second] = longRun($this);
        $receipts = [...$this->honestCheckpoints($second, $fixture['actions']), checkpointReceipt($second, $fixture['actions'], $reel, $atVerdict - 1)];
        $this->finishRun($second, $fixture['actions'], $fixture['summary']['score'], $fixture['summary']['reels'], $receipts)
            ->assertJsonPath('run.status', 'flagged');
        expect(Run::query()->findOrFail($second)->flags[0])->toMatchArray(['code' => 'wall_clock', 'reel' => $reel, 'neededMs' => $atVerdict]);
    });

    it('lets a receipt through stamped just as soon as the moves allow', function () {
        $this->signIn();
        [$fixture, $runId] = longRun($this);
        $needed = checkpointNeeded($fixture['seed'], $fixture['actions'], 200);

        $receipts = [...$this->honestCheckpoints($runId, $fixture['actions']), checkpointReceipt($runId, $fixture['actions'], 200, $needed - config('quezby.plausibility.clock_tolerance_ms'))];
        $this->finishRun($runId, $fixture['actions'], $fixture['summary']['score'], $fixture['summary']['reels'], $receipts)
            ->assertJsonPath('run.status', 'ranked');
    });

    it('flags a slowed-down game', function () {
        $this->signIn();
        [$fixture, $runId] = longRun($this);
        $receipts = $this->honestCheckpoints($runId, $fixture['actions']);
        $reel = app(Checkpoint::class)->open($receipts[1])->reel;
        $needed = checkpointNeeded($fixture['seed'], $fixture['actions'], $reel);
        $limit = (int) ($needed * 1.35) + 10_000;
        $receipts[1] = checkpointReceipt($runId, $fixture['actions'], $reel, $limit + 1);

        $this->finishRun($runId, $fixture['actions'], $fixture['summary']['score'], $fixture['summary']['reels'], $receipts)
            ->assertJsonPath('run.status', 'flagged')
            ->assertJsonPath('run.flagReason', null);

        expect(Run::query()->findOrFail($runId)->flags)->toContain([
            'code' => 'slow_motion', 'reel' => $reel, 'elapsedMs' => $limit + 1, 'neededMs' => $needed, 'limitMs' => $limit, 'severity' => 'hard',
        ]);
    });

    it('holds a top score a little too slow for review, and ranks it below the top', function () {
        $this->signIn();
        [$fixture, $runId] = longRun($this);
        $receipts = $this->honestCheckpoints($runId, $fixture['actions']);
        $reel = app(Checkpoint::class)->open($receipts[2])->reel;
        $needed = checkpointNeeded($fixture['seed'], $fixture['actions'], $reel);
        $receipts[2] = checkpointReceipt($runId, $fixture['actions'], $reel, (int) ($needed * 1.2) + 6_001);

        $this->finishRun($runId, $fixture['actions'], $fixture['summary']['score'], $fixture['summary']['reels'], $receipts)
            ->assertJsonPath('run.status', 'review');
        expect(Run::query()->findOrFail($runId)->flags)->toContain([
            'code' => 'slow_timing', 'reel' => $reel, 'elapsedMs' => (int) ($needed * 1.2) + 6_001, 'neededMs' => $needed, 'limitMs' => (int) ($needed * 1.2) + 6_000, 'severity' => 'soft',
        ]);

        foreach (range(1, 10) as $i) {
            $this->recordRanked(User::factory()->withUsername("usta{$i}")->create(), 50_000_000 + $i);
        }
        [$fixture, $second] = longRun($this);
        $receipts = $this->honestCheckpoints($second, $fixture['actions']);
        $receipts[2] = checkpointReceipt($second, $fixture['actions'], $reel, (int) ($needed * 1.2) + 6_001);
        $this->finishRun($second, $fixture['actions'], $fixture['summary']['score'], $fixture['summary']['reels'], $receipts)
            ->assertJsonPath('run.status', 'ranked');
    });

    it('holds a long top run that never checked in for review', function () {
        $this->signIn();
        [$fixture, $runId] = longRun($this);

        $this->finishRun($runId, $fixture['actions'], $fixture['summary']['score'], $fixture['summary']['reels'], [])
            ->assertJsonPath('run.status', 'review');

        expect(Run::query()->findOrFail($runId)->flags)->toBe([
            ['code' => 'checkpoint_missing', 'expected' => 3, 'received' => 0, 'severity' => 'soft'],
        ]);
    });

    it('counts a receipt for one mark only, and none from before it', function (Closure $receipts, int $received) {
        $this->signIn();
        [$fixture, $runId] = longRun($this);

        $this->finishRun($runId, $fixture['actions'], $fixture['summary']['score'], $fixture['summary']['reels'], $receipts($this, $runId, $fixture))
            ->assertJsonPath('run.status', 'review');

        expect(collect(Run::query()->findOrFail($runId)->flags)->firstWhere('code', 'checkpoint_missing'))
            ->toBe(['code' => 'checkpoint_missing', 'expected' => 3, 'received' => $received, 'severity' => 'soft']);
    })->with([
        'the same receipt three times' => [fn ($test, $runId, $fixture) => array_fill(0, 3, $test->honestCheckpoints($runId, $fixture['actions'])[0]), 1],
        'three early receipts' => [fn ($test, $runId, $fixture) => array_map(
            fn (int $reel) => checkpointReceipt($runId, $fixture['actions'], $reel, checkpointNeeded($fixture['seed'], $fixture['actions'], $reel)),
            [10, 20, 30],
        ), 0],
        'only the last mark' => [fn ($test, $runId, $fixture) => [$test->honestCheckpoints($runId, $fixture['actions'])[2]], 1],
    ]);

    it('expects a receipt only for the marks a run went well past', function (int $reels, int $expected) {
        $this->signIn();
        $actions = playedLog(4242, $reels, 450, 110);
        $replay = Engine::replay(4242, $actions);
        $runId = $this->startRunFor(['seed' => 4242, 'summary' => ['activeMs' => $replay->summary->activeMs, 'reels' => $reels]]);
        $needed = app(RunClock::class)->needed($replay);
        $playedMs = end($needed) - app(RunClock::class)->countdownMs();

        $response = $this->finishRun($runId, $actions, $replay->summary->score, $replay->summary->reels, []);

        $missing = collect(Run::query()->findOrFail($runId)->flags)->firstWhere('code', 'checkpoint_missing');
        expect($missing['expected'] ?? 0)->toBe($expected)
            ->and(count(array_filter([45000, 120000, 240000], fn (int $mark) => $mark <= $playedMs - 5000)))->toBe($expected);
        $response->assertJsonPath('run.status', $expected === 0 ? 'ranked' : 'review');
    })->with([
        'half a minute' => [40, 0],
        'a minute and a half' => [120, 1],
    ]);

    it('reads the first five receipts and ignores the rest', function () {
        $this->signIn();
        [$fixture, $runId] = longRun($this);
        $honest = fn (int $reel) => checkpointReceipt($runId, $fixture['actions'], $reel, checkpointNeeded($fixture['seed'], $fixture['actions'], $reel));
        $receipts = [...$this->honestCheckpoints($runId, $fixture['actions']), $honest(300), $honest(400), 'forged.receipt'];

        $this->finishRun($runId, $fixture['actions'], $fixture['summary']['score'], $fixture['summary']['reels'], $receipts)
            ->assertJsonPath('run.status', 'ranked');
        expect(Run::query()->findOrFail($runId)->flags)->toBeNull();
    });

    it('validates the receipts envelope', function (mixed $checkpoints) {
        $this->signIn();
        $runId = $this->startRun()->json('runId');

        $this->assertApiError($this->finishRun($runId, [], 0, 0, $checkpoints), 422, 'validation_failed');
        expect(Run::query()->findOrFail($runId)->status)->toBe(RunStatus::Started);
    })->with([
        'not a list' => [['a' => 'b']],
        'a number' => [[123]],
        'a huge receipt' => [[str_repeat('a', 513)]],
        'too many' => [array_fill(0, 21, 'receipt')],
    ]);

    it('takes a finish without receipts, as older apps send it', function () {
        $this->signIn();
        $runId = $this->startRun()->json('runId');
        $this->travel(2)->seconds();

        $this->postJson("/api/v1/runs/{$runId}/finish", ['actions' => [], 'clientScore' => 0, 'clientReels' => 0])
            ->assertOk()
            ->assertJsonPath('run.status', 'ranked');
    });
});
