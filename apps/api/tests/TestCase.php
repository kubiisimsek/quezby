<?php

namespace Tests;

use App\Content\Catalog;
use App\Enums\AdminRole;
use App\Game\Checkpoint;
use App\Game\EngineError;
use App\Game\Rules;
use App\Game\Run as Engine;
use App\Models\Admin;
use App\Models\Run;
use App\Models\User;
use App\Services\LeaderboardService;
use App\Services\RunClock;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;

/**
 * Every Pest test closure is bound to this class (see `tests/Pest.php`). The
 * fixture helpers are plain functions there, as datasets need them before the
 * application boots.
 */
abstract class TestCase extends BaseTestCase
{
    /**
     * A player with a username, signed in by token.
     */
    protected function signIn(?User $user = null): User
    {
        $user ??= User::factory()->withUsername()->create();
        Sanctum::actingAs($user);

        return $user;
    }

    /**
     * A player's real token, as the app holds one: Sanctum then moves the
     * token's `last_used_at` on every request, which the presence gate reads
     * (`Sanctum::actingAs` does not). Call `forgetGuards()` between requests.
     */
    protected function tokenFor(User $user): string
    {
        return $user->createToken('ios')->plainTextToken;
    }

    /**
     * An admin of `$role` who has chosen their own password, signed in to the
     * panel by token.
     *
     * @param  array<string, mixed>  $attributes
     */
    protected function signInAdmin(AdminRole $role = AdminRole::Owner, array $attributes = []): Admin
    {
        $admin = Admin::factory()->role($role)->create($attributes);
        Sanctum::actingAs($admin, ['admin'], 'admin');

        return $admin;
    }

    /**
     * Asserts the contract's one error shape.
     */
    protected function assertApiError(TestResponse $response, int $status, string $code): TestResponse
    {
        $response->assertStatus($status)
            ->assertJsonPath('error.code', $code)
            ->assertJsonStructure(['error' => ['code', 'message']]);
        $this->assertIsString($response->json('error.message'));
        $this->assertNotSame('', $response->json('error.message'));

        return $response;
    }

    /**
     * Starts a run the way the app does: its mode, and the engine and content
     * it plays with. `$body` overrides any of them.
     *
     * @param  array<string, mixed>  $body
     */
    protected function startRun(array $body = []): TestResponse
    {
        return $this->postJson('/api/v1/runs', $body + [
            'mode' => 'free',
            'engineVersion' => Rules::ENGINE_VERSION,
            'contentVersion' => Catalog::LATEST,
        ]);
    }

    /**
     * Starts a run through the API, then gives it the fixture's seed and a
     * start time the log fits in, as if the player had just played it: the
     * countdown, every reel, and the longest pause and slide after each.
     *
     * @param  array{seed: int, summary: array{activeMs: int, reels: int}}  $fixture
     */
    public function startRunFor(array $fixture, ?int $startedSecondsAgo = null): string
    {
        $runId = $this->startRun()->assertCreated()->json('runId');
        $playedMs = 1800 + $fixture['summary']['activeMs'] + ($fixture['summary']['reels'] + 1) * 430;

        Run::query()->findOrFail($runId)->forceFill([
            'seed' => $fixture['seed'],
            'started_at' => $startedSecondsAgo === null
                ? now()->subMilliseconds($playedMs)
                : now()->subSeconds($startedSecondsAgo),
        ])->save();

        return $runId;
    }

    /**
     * Plays a run of `$mode` cleanly for `$reels` reels, like a human thumb,
     * and finishes it through the API as if it had just been played.
     */
    protected function playFeed(string $mode = 'free', int $reels = 60, int $decisionMs = 430): TestResponse
    {
        $start = $this->startRun(['mode' => $mode])->assertCreated();
        $actions = playedLog($start->json('seed'), $reels, $decisionMs, 110);
        $summary = Engine::replay($start->json('seed'), $actions)->summary;
        Run::query()->whereKey($start->json('runId'))->update(['started_at' => now()->subMinutes(10)]);

        return $this->finishRun($start->json('runId'), $actions, $summary->score, $summary->reels);
    }

    /**
     * Finishes a run through the API with the app's log and its claim — and,
     * unless `$checkpoints` says otherwise, with the receipts an honest app
     * would have collected on the way (`honestCheckpoints`).
     *
     * @param  array<mixed>  $actions
     * @param  list<string>|null  $checkpoints
     */
    protected function finishRun(string $runId, array $actions, int $clientScore, int $clientReels, ?array $checkpoints = null): TestResponse
    {
        return $this->postJson("/api/v1/runs/{$runId}/finish", [
            'actions' => $actions,
            'clientScore' => $clientScore,
            'clientReels' => $clientReels,
            'checkpoints' => $checkpoints ?? $this->honestCheckpoints($runId, $actions),
        ]);
    }

    /**
     * Finishes a run of a replay fixture honestly: its log, its score, and the
     * receipts collected on the way.
     *
     * @param  array{actions: list<array{int, int, int}>, summary: array{score: int, reels: int}}  $fixture
     */
    public function finishRunFor(string $runId, array $fixture): TestResponse
    {
        return $this->finishRun($runId, $fixture['actions'], $fixture['summary']['score'], $fixture['summary']['reels']);
    }

    /**
     * The receipts an honest app collects while it plays `$actions` on the
     * run: it checks in at the first verdict past each checkpoint mark, on
     * the app's pace from the run's start, and the API stamps each
     * `$latencyMs` later. Only those already due by now — a run said to
     * have started seconds ago has had no time for any.
     *
     * @param  array<mixed>  $actions
     * @return list<string>
     */
    public function honestCheckpoints(string $runId, array $actions, int $latencyMs = 150): array
    {
        $run = Run::query()->find($runId);
        try {
            $replay = $run === null ? null : Engine::replay($run->seed, $actions);
        } catch (EngineError) {
            $replay = null;
        }
        if ($run === null || $replay === null) {
            return [];
        }

        $clock = app(RunClock::class);
        $receipts = [];
        foreach ($clock->checkIns($replay, config('quezby.plausibility.checkpoints.marks_ms')) as ['reel' => $reel, 'atMs' => $atMs]) {
            $stampedMs = $run->started_at->getTimestampMs() + $clock->countdownMs() + $atMs + $latencyMs;
            if ($stampedMs > now()->getTimestampMs()) {
                break;
            }
            $receipts[] = app(Checkpoint::class)->sign($run->id, $reel, Checkpoint::prefixHash($actions, $reel), $stampedMs);
        }

        return $receipts;
    }

    /**
     * A ranked run of `$score` by `$player`, put on today's, this week's,
     * this month's and the season's board.
     */
    public function recordRanked(User $player, int $score): Run
    {
        $run = Run::factory()->for($player)->ranked($score)->create();
        app(LeaderboardService::class)->record($run);

        return $run;
    }
}
