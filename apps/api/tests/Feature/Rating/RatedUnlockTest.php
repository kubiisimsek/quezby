<?php

use App\Enums\RunMode;
use App\Enums\RunStatus;
use App\Models\PlayerRating;
use App\Models\Run;
use App\Services\Rating\RatingService;
use Illuminate\Support\Carbon;

/*
| Dereceli — and with it Elo and the weekly groups — opens after twenty
| counted free and daily runs: ranked, and scoring (`rating.unlock_runs`).
| The first-launch practice run never reaches the API, and a VS never
| ranks. Once a player has played a rated run, it stays open to them.
*/

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-10-01 12:00', 'Europe/Istanbul'));
    pinRatingTargets();
});

test('Dereceli opens after twenty counted free and daily runs, and says so on the run that opens it', function () {
    $user = $this->signIn();
    $this->getJson('/api/v1/rating')->assertOk()->assertJsonPath('unlock', ['required' => 20, 'remaining' => 20, 'placement' => 3]);
    $this->assertApiError($this->startRun(['mode' => 'rated']), 409, 'rated_locked');

    $this->playFeed()->assertOk()->assertJsonPath('leagueUnlock', ['required' => 20, 'remaining' => 19, 'placement' => 3]);
    Run::factory()->for($user)->ranked(100)->count(16)->create();
    Run::factory()->for($user)->daily('2026-09-30')->ranked(100)->create();
    $this->playFeed()->assertOk()->assertJsonPath('leagueUnlock', ['required' => 20, 'remaining' => 1, 'placement' => 3]);

    $this->playFeed()->assertOk()->assertJsonPath('leagueUnlock', ['required' => 20, 'remaining' => 0, 'placement' => 3]);

    $this->getJson('/api/v1/rating')->assertJsonPath('unlock', null)->assertJsonPath('placement', ['played' => 0, 'required' => 3]);
    $this->playFeed()->assertOk()->assertJsonPath('leagueUnlock', null);
    $this->playFeed('rated')->assertOk()
        ->assertJsonPath('leagueUnlock', null)
        ->assertJsonPath('rating.placement', ['played' => 1, 'required' => 3]);
});

test('runs that scored nothing, were flagged, are held, still open, a VS or rated do not count', function () {
    $user = $this->signIn();
    Run::factory()->for($user)->ranked(0)->create();
    Run::factory()->for($user)->ranked(5000)->create(['status' => RunStatus::Flagged]);
    Run::factory()->for($user)->ranked(5000)->create(['status' => RunStatus::Review]);
    Run::factory()->for($user)->create();
    Run::factory()->for($user)->ranked(5000)->create(['mode' => RunMode::Vs, 'status' => RunStatus::Played]);
    Run::factory()->for($user)->rated()->ranked(5000)->create();

    $this->getJson('/api/v1/rating')->assertJsonPath('unlock', ['required' => 20, 'remaining' => 20, 'placement' => 3]);

    Run::factory()->for($user)->ranked(10)->create();
    $this->getJson('/api/v1/rating')->assertJsonPath('unlock', ['required' => 20, 'remaining' => 19, 'placement' => 3]);
});

test('only the player\'s own runs count', function () {
    $user = $this->signIn();
    Run::factory()->ranked(5000)->count(3)->create();

    expect(app(RatingService::class)->unlock($user))->toBe(['required' => 20, 'remaining' => 20, 'placement' => 3]);
});

test('a player who has played a rated run never finds it closed again', function () {
    $user = $this->signIn();
    PlayerRating::query()->create(['user_id' => $user->id, 'placement_scores' => [1000]]);

    $this->getJson('/api/v1/rating')->assertJsonPath('unlock', null);
    $this->startRun(['mode' => 'rated'])->assertCreated();
});

test('how many runs open Dereceli is read from config', function () {
    config(['quezby.rating.unlock_runs' => 5]);
    $user = $this->signIn();
    Run::factory()->for($user)->ranked(100)->create();

    $this->getJson('/api/v1/rating')->assertJsonPath('unlock', ['required' => 5, 'remaining' => 4, 'placement' => 3]);
});
