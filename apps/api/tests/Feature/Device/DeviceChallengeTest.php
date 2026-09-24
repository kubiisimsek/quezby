<?php

use App\Models\User;
use App\Services\Integrity\DeviceChallenges;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/*
| `POST /device/challenge`: a one-time challenge a phone proves itself
| against — single use, for the player who asked, for five minutes.
*/

it('issues a challenge for five minutes', function () {
    $user = $this->signIn();
    Carbon::setTestNow('2026-09-24 12:00:00.250');

    $response = $this->postJson('/api/v1/device/challenge')->assertCreated();

    $challenge = $response->json('challenge');
    expect($challenge)->toMatch('/^[A-Za-z0-9_-]{43}$/')
        ->and(strlen((string) base64_decode(strtr($challenge, '-_', '+/'), true)))->toBe(32);
    $response->assertExactJson(['challenge' => $challenge, 'expiresAt' => '2026-09-24T12:05:00.000Z']);

    // Only its hash is kept, with the player it was issued to.
    $this->assertDatabaseHas('device_challenges', [
        'hash' => hash('sha256', $challenge),
        'user_id' => $user->id,
        'expires_at' => '2026-09-24 12:05:00',
        'used_at' => null,
    ]);
    expect(DB::table('device_challenges')->where('hash', $challenge)->exists())->toBeFalse();
});

it('issues a different challenge every time', function () {
    $this->signIn();

    $challenges = collect(range(1, 5))->map(fn () => $this->postJson('/api/v1/device/challenge')->assertCreated()->json('challenge'));

    expect($challenges->unique())->toHaveCount(5);
});

it('uses a challenge up once, for its own player only, before it expires', function () {
    $challenges = app(DeviceChallenges::class);
    [$player, $other] = User::factory()->withUsername()->count(2)->create();

    $first = $challenges->issue($player)['challenge'];
    expect($challenges->consume($other, $first))->toBeFalse('another player cannot use it')
        ->and($challenges->consume($player, $first))->toBeTrue()
        ->and($challenges->consume($player, $first))->toBeFalse('used')
        ->and($challenges->consume($player, 'never-issued'))->toBeFalse();

    $late = $challenges->issue($player)['challenge'];
    $this->travel(301)->seconds();
    expect($challenges->consume($player, $late))->toBeFalse('expired');
});

it('forgets challenges that expired', function () {
    $challenges = app(DeviceChallenges::class);
    $player = User::factory()->withUsername()->create();
    $old = $challenges->issue($player)['challenge'];

    $this->travel(6)->minutes();
    $fresh = $challenges->issue($player)['challenge'];

    $this->assertDatabaseMissing('device_challenges', ['hash' => hash('sha256', $old)]);
    $this->assertDatabaseHas('device_challenges', ['hash' => hash('sha256', $fresh)]);
});

it('needs a signed-in player', function () {
    $this->assertApiError($this->postJson('/api/v1/device/challenge'), 401, 'unauthenticated');
});

it('is throttled per player', function () {
    $this->signIn();
    for ($i = 0; $i < 20; $i++) {
        $this->postJson('/api/v1/device/challenge')->assertCreated();
    }

    $this->assertApiError($this->postJson('/api/v1/device/challenge'), 429, 'too_many_requests');

    // Another player has their own budget.
    $this->signIn();
    $this->postJson('/api/v1/device/challenge')->assertCreated();
});

it('goes with the account', function () {
    $player = User::factory()->withUsername()->create();
    app(DeviceChallenges::class)->issue($player);

    $player->delete();

    expect(DB::table('device_challenges')->count())->toBe(0);
});
