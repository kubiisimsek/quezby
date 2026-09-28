<?php

use App\Enums\RunStatus;
use App\Models\Run;
use App\Models\User;
use Illuminate\Support\Carbon;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-26 12:00', 'Europe/Istanbul'));
    config(['quezby.daily.epoch' => '2026-09-24']);
});

test('the history lists finished games, the newest first, each as the replay found it', function () {
    $me = $this->signIn();
    $early = Run::factory()->for($me)->ranked(3000, 150)->create(['finished_at' => now()->subDays(2)]);
    $best = $this->recordRanked($me, 9000);
    $best->forceFill(['finished_at' => now()->subDay(), 'level' => 4, 'active_ms' => 180000])->save();
    $daily = Run::factory()->for($me)->daily('2026-09-26')->ranked(5000)->create(['finished_at' => now()->subHour()]);
    Run::factory()->for($me)->ranked(8000)->create(['status' => RunStatus::Review, 'finished_at' => now()->subMinutes(30)]);
    // Not games the player finished.
    Run::factory()->for($me)->create();
    Run::factory()->for($me)->create(['status' => RunStatus::Abandoned, 'finished_at' => now()]);
    Run::factory()->for($me)->create(['status' => RunStatus::Rejected, 'finished_at' => now()]);
    Run::factory()->ranked(7000)->create();

    $response = $this->getJson('/api/v1/me/runs')->assertOk();

    $response->assertJsonPath('runs.*.status', ['review', 'ranked', 'ranked', 'ranked'])
        ->assertJsonPath('runs.*.score', [8000, 5000, 9000, 3000])
        ->assertJsonPath('runs.1.mode', 'daily')
        ->assertJsonPath('runs.1.dailyNumber', 3)
        ->assertJsonPath('runs.2.isBest', true)
        ->assertJsonPath('runs.2.level', 4)
        ->assertJsonPath('runs.2.activeMs', 180000)
        ->assertJsonPath('runs.3.isBest', false)
        ->assertJsonPath('runs.3.reels', 150)
        ->assertJsonPath('runs.3.finishedAt', '2026-09-24T09:00:00.000Z')
        ->assertJsonPath('runs.3.duel', null)
        ->assertJsonPath('nextCursor', null);
    expect($response->json('runs.1.runId'))->toBe($daily->id)
        ->and($response->json('runs.3.runId'))->toBe($early->id);
});

test('the history keeps to one mode when asked', function () {
    $me = $this->signIn();
    Run::factory()->for($me)->ranked(3000)->create(['finished_at' => now()->subHour()]);
    Run::factory()->for($me)->daily('2026-09-26')->ranked(5000)->create(['finished_at' => now()]);

    $this->getJson('/api/v1/me/runs?mode=daily')->assertJsonPath('runs.*.score', [5000]);
    $this->getJson('/api/v1/me/runs?mode=free')->assertJsonPath('runs.*.score', [3000]);
    $this->assertApiError($this->getJson('/api/v1/me/runs?mode=duel'), 422, 'validation_failed');
});

test('a VS in the history says whom it was against and how it went — never their hidden score', function () {
    Carbon::setTestNow(Carbon::parse('2026-09-24 12:00', 'Europe/Istanbul'));
    $me = $this->signIn(User::factory()->withUsername('ben')->create());
    $ekin = User::factory()->withUsername('ekin')->create();
    $this->befriend($me, $ekin);
    $duelId = $this->playFeed('vs', 60, body: ['opponent' => 'ekin'])->json('duel.id');

    $this->getJson('/api/v1/me/runs')
        ->assertJsonPath('runs.0.mode', 'vs')
        ->assertJsonPath('runs.0.status', 'played')
        ->assertJsonPath('runs.0.duel.opponent', 'ekin')
        ->assertJsonPath('runs.0.duel.turn', 'them')
        ->assertJsonPath('runs.0.duel.them', null);

    $this->signIn($ekin);
    $this->playFeed('vs', 40, body: ['duel' => $duelId]);
    $this->getJson('/api/v1/me/runs')
        ->assertJsonPath('runs.0.duel.opponent', 'ben')
        ->assertJsonPath('runs.0.duel.outcome', 'lost');
});

test('the history pages thirty at a time behind a cursor', function () {
    $me = $this->signIn();
    foreach (range(1, 35) as $i) {
        Run::factory()->for($me)->ranked(100 * $i)->create(['finished_at' => now()->subMinutes($i)]);
    }

    $first = $this->getJson('/api/v1/me/runs')->assertOk();
    expect($first->json('runs'))->toHaveCount(30);
    $second = $this->getJson('/api/v1/me/runs?cursor='.$first->json('nextCursor'))->assertOk()->assertJsonPath('nextCursor', null);

    expect([...$first->json('runs.*.score'), ...$second->json('runs.*.score')])->toBe(array_map(fn ($i) => 100 * $i, range(1, 35)));
});

test('one past game with everything its replay counted; someone else\'s is not found', function () {
    $me = $this->signIn();
    $mine = Run::factory()->for($me)->ranked(4200)->create(['finished_at' => now()]);
    $theirs = Run::factory()->ranked(9000)->create(['finished_at' => now()]);
    $open = Run::factory()->for($me)->create();

    $this->getJson("/api/v1/me/runs/{$mine->id}")
        ->assertOk()
        ->assertJsonPath('summary.runId', $mine->id)
        ->assertJsonPath('summary.score', 4200)
        ->assertJsonPath('run.runId', $mine->id)
        ->assertJsonPath('run.score', 4200)
        ->assertJsonStructure(['run' => ['breakdown' => ['bonuses'], 'stats' => ['misses']]]);
    $this->assertApiError($this->getJson("/api/v1/me/runs/{$theirs->id}"), 404, 'not_found');
    $this->assertApiError($this->getJson("/api/v1/me/runs/{$open->id}"), 404, 'not_found');
});

test('the history needs a player', function () {
    $this->assertApiError($this->getJson('/api/v1/me/runs'), 401, 'unauthenticated');
});
