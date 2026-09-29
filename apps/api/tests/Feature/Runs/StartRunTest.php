<?php

use App\Content\Catalog;
use App\Enums\RunStatus;
use App\Game\Rules;
use App\Models\Run;
use App\Models\User;

test('a run needs a username', function () {
    $this->signIn(User::factory()->create());

    $this->assertApiError($this->startRun(), 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => ['username']]]);
    expect(Run::query()->count())->toBe(0);
});

test('a free run hands out a random seed and opens the player\'s one run', function () {
    $user = $this->signIn();

    $response = $this->withHeader('X-App-Version', '2.0.0')->startRun()->assertCreated();

    $seed = $response->json('seed');
    expect($seed)->toBeInt()->toBeGreaterThanOrEqual(1)->toBeLessThanOrEqual(4294967295);
    $response->assertJsonPath('engineVersion', Rules::ENGINE_VERSION)
        ->assertJsonPath('contentVersion', Catalog::LATEST)
        ->assertJsonPath('difficulty', 0)
        ->assertJsonPath('mode', 'free')
        ->assertJsonPath('dayKey', null);
    expect($response->json('startedAt'))->toMatch('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/');
    $this->assertDatabaseHas('runs', [
        'id' => $response->json('runId'),
        'user_id' => $user->id,
        'seed' => $seed,
        'status' => 'started',
        'mode' => 'free',
        'open_user_id' => $user->id,
        'app_version' => '2.0.0',
    ]);
});

test('an app on another engine or catalog is told to update before a run opens', function (array $body) {
    $this->signIn();

    $this->assertApiError($this->postJson('/api/v1/runs', $body), 422, 'engine_outdated');
    expect(Run::query()->count())->toBe(0);
})->with([
    'the v1 app, which sends nothing' => [[]],
    'an older engine' => [['mode' => 'free', 'engineVersion' => 1, 'contentVersion' => 1]],
    'a newer engine' => [['mode' => 'free', 'engineVersion' => 99, 'contentVersion' => 1]],
    'an unknown catalog' => [['mode' => 'free', 'engineVersion' => Rules::ENGINE_VERSION, 'contentVersion' => 99]],
]);

test('a mode must be one the game has', function () {
    $this->signIn();

    $this->assertApiError($this->startRun(['mode' => 'duel']), 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => ['mode']]]);
});

test('starting another run abandons the open one', function () {
    $user = $this->signIn();
    $first = $this->startRun()->json('runId');

    $second = $this->startRun()->assertCreated()->json('runId');

    $abandoned = Run::query()->findOrFail($first);
    expect($abandoned->status)->toBe(RunStatus::Abandoned)
        ->and($abandoned->open_user_id)->toBeNull()
        ->and(Run::query()->findOrFail($second)->open_user_id)->toBe($user->id)
        ->and(Run::query()->where('open_user_id', $user->id)->count())->toBe(1);
    $this->assertApiError($this->finishRun($first, [], 0, 0), 409, 'run_already_finished');
});

test('a run left open past its time expires when the next one starts', function () {
    $this->signIn();
    $stale = $this->startRun()->json('runId');

    $this->travel(121)->minutes();
    $this->startRun()->assertCreated();

    expect(Run::query()->findOrFail($stale)->status)->toBe(RunStatus::Expired);
});

test('starting runs is throttled', function () {
    $this->signIn();
    for ($i = 0; $i < 30; $i++) {
        $this->startRun()->assertCreated();
    }

    $this->assertApiError($this->startRun(), 429, 'too_many_requests');
});
