<?php

use App\Enums\AdminRole;
use App\Enums\AuditAction;
use App\Enums\DuelStatus;
use App\Enums\RunMode;
use App\Enums\RunStatus;
use App\Game\Difficulty;
use App\Game\Rules;
use App\Game\Run as Engine;
use App\Models\Duel;
use App\Models\Run;
use App\Models\User;
use App\Services\Admin\AuditLog;
use App\Support\Actor;
use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-25 12:00', 'Europe/Istanbul'));
    $this->signInAdmin(AdminRole::Viewer);
});

function adminRunDetail(Run $run): TestResponse
{
    return test()->getJson("/api/v1/admin/runs/{$run->id}");
}

/** A finished run of `$reels` posts, played cleanly, with its log. */
function adminRunDetailPlayed(int $reels = 80, int $seed = 4242): Run
{
    $actions = playedLog($seed, $reels, 420, 90);
    $summary = Engine::replay($seed, $actions)->summary;

    return Run::factory()->ranked($summary->score, $summary->reels)->create([
        'seed' => $seed,
        'actions' => $actions,
        'client_score' => $summary->score,
        'client_reels' => $summary->reels,
        'stats' => ['swipes' => 10],
    ]);
}

test('replays a finished run post by post, and the posts add up to its score', function () {
    $run = adminRunDetailPlayed();

    $response = adminRunDetail($run)->assertOk()->assertJsonPath('timelineUnavailable', null);
    $timeline = collect($response->json('timeline'));

    expect($timeline)->toHaveCount($run->reels)
        ->and($timeline->sum('points') + $timeline->sum('bonusPoints'))->toBe($run->score)
        ->and($timeline->first())->toHaveKeys(['index', 'kind', 'level', 'window', 'gesture', 't', 'd', 'verdict', 'points', 'bonusPoints', 'combo', 'meter'])
        ->and($timeline->pluck('index')->all())->toBe(range(0, $run->reels - 1))
        ->and($timeline->pluck('gesture')->unique()->diff(['none', 'up', 'like', 'hold', 'touch'])->all())->toBe([]);

    $response
        ->assertJsonPath('run.seed', 4242)
        ->assertJsonPath('run.clientScore', $run->score)
        ->assertJsonPath('run.stats', ['swipes' => 10]);
});

test('replays a rated run at the difficulty it was handed, and says which', function () {
    $actions = playedLog(4242, 80, 420, 90, 12);
    $summary = Engine::replay(4242, $actions, 12)->summary;
    $run = Run::factory()->rated(12)->ranked($summary->score, $summary->reels)->create([
        'seed' => 4242,
        'actions' => $actions,
        'client_score' => $summary->score,
        'client_reels' => $summary->reels,
    ]);

    $response = adminRunDetail($run)->assertOk()
        ->assertJsonPath('timelineUnavailable', null)
        ->assertJsonPath('run.difficulty', 12)
        ->assertJsonPath('run.difficultyVersion', Difficulty::VERSION);
    $timeline = collect($response->json('timeline'));
    expect($timeline->sum('points') + $timeline->sum('bonusPoints'))->toBe($run->score);

    adminRunDetail(adminRunDetailPlayed())->assertJsonPath('run.difficulty', 0)->assertJsonPath('run.difficultyVersion', null);
});

test('says why there is no timeline', function (Closure $make, string $why) {
    adminRunDetail($make())->assertOk()->assertJsonPath('timeline', null)->assertJsonPath('timelineUnavailable', $why);
})->with([
    'a run that never finished' => [fn () => Run::factory()->create(), 'no_log'],
    'another season\'s rules' => [fn () => Run::factory()->ranked(100)->create(['engine_version' => 1, 'actions' => [[1, 400, 0]]]), 'other_engine'],
    'a log the engine refuses' => [fn () => Run::factory()->create(['status' => RunStatus::Rejected, 'actions' => [[9, 100, 0]]]), 'engine_error'],
]);

test('shows what was done about the run', function () {
    $run = Run::factory()->for(User::factory()->withUsername('hileci'))->ranked(100)->create();
    app(AuditLog::class)->record(Actor::cli(), AuditAction::RunReject, $run->load('user'), 'Bot gibi');

    adminRunDetail($run)
        ->assertJsonPath('audit.0.action', 'run.reject')
        ->assertJsonPath('audit.0.subject.label', 'hileci')
        ->assertJsonPath('audit.0.ip', null);
});

test('names both sides of a VS run and how the VS stands; any other run has none', function () {
    $ben = User::factory()->withUsername('ben')->create();
    $ekin = User::factory()->withUsername('ekin')->create();
    $duel = Duel::query()->create([
        'challenger_id' => $ben->id,
        'opponent_id' => $ekin->id,
        'seed' => 4242,
        'engine_version' => Rules::ENGINE_VERSION,
        'content_version' => 1,
        'status' => DuelStatus::Finished,
        'challenger_score' => 12_450,
        'opponent_score' => 9_800,
        'challenger_valid' => true,
        'opponent_valid' => true,
        'winner_id' => $ben->id,
        'sent_at' => now(),
        'finished_at' => now(),
    ]);
    $run = Run::factory()->create([
        'user_id' => $ekin->id,
        'mode' => RunMode::Vs,
        'status' => RunStatus::Played,
        'duel_id' => $duel->id,
    ]);

    adminRunDetail($run)
        ->assertOk()
        ->assertJsonPath('run.mode', 'vs')
        ->assertJsonPath('run.status', 'played')
        ->assertJsonPath('run.duel', [
            'id' => $duel->id,
            'status' => 'finished',
            'challenger' => ['id' => $ben->id, 'username' => 'ben', 'bannedAt' => null],
            'opponent' => ['id' => $ekin->id, 'username' => 'ekin', 'bannedAt' => null],
            'challengerScore' => 12_450,
            'opponentScore' => 9_800,
            'winnerId' => $ben->id,
        ]);
    adminRunDetail(adminRunDetailPlayed())->assertJsonPath('run.duel', null);
});

test('an unknown run is not found', function () {
    $this->assertApiError($this->getJson('/api/v1/admin/runs/01jzzzzzzzzzzzzzzzzzzzzzzz'), 404, 'not_found');
});
