<?php

namespace Tests;

use App\Content\Catalog;
use App\Game\Rules;
use App\Game\Run as Engine;
use App\Models\Run;
use App\Models\User;
use App\Services\LeaderboardService;
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
    protected function startRunFor(array $fixture, ?int $startedSecondsAgo = null): string
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
     * Finishes a run through the API with the app's log and its claim.
     *
     * @param  array<mixed>  $actions
     */
    protected function finishRun(string $runId, array $actions, int $clientScore, int $clientReels): TestResponse
    {
        return $this->postJson("/api/v1/runs/{$runId}/finish", [
            'actions' => $actions,
            'clientScore' => $clientScore,
            'clientReels' => $clientReels,
        ]);
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
