<?php

use App\Models\LeaderboardEntry;
use App\Models\Run;
use App\Models\User;
use App\Services\LeaderboardService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

test('me shows the player and their ranks', function () {
    Carbon::setTestNow(Carbon::parse('2026-09-23 12:00', 'Europe/Istanbul'));
    $me = User::factory()->withUsername('kubi')->create();
    $rival = User::factory()->withUsername('rival')->create();
    $leaderboards = app(LeaderboardService::class);
    $leaderboards->record(Run::factory()->for($rival)->ranked(9000)->create());
    $leaderboards->record(Run::factory()->for($me)->ranked(5000, 80)->create());
    $this->signIn($me);

    $this->getJson('/api/v1/me')
        ->assertOk()
        ->assertJsonPath('user.username', 'kubi')
        ->assertJsonPath('user.identities', [])
        ->assertJsonPath('user.locale', 'tr')
        ->assertJsonPath('user.best', ['score' => 5000, 'reels' => 80, 'achievedAt' => '2026-09-23T09:00:00.000Z'])
        ->assertJsonPath('ranks', ['weekly' => 2, 'monthly' => 2, 'all' => 2]);

    // The week turns over on Monday; the month and the season remain.
    Carbon::setTestNow(Carbon::parse('2026-09-28 12:00', 'Europe/Istanbul'));
    $this->getJson('/api/v1/me')->assertJsonPath('ranks', ['weekly' => null, 'monthly' => 2, 'all' => 2]);
});

test('settings update known keys and ignore the rest', function () {
    $user = $this->signIn();

    $this->putJson('/api/v1/me/settings', ['haptics' => false, 'theme' => 'dark'])
        ->assertOk()
        ->assertExactJson(['settings' => ['haptics' => false, 'analytics' => false, 'pushFriends' => true, 'pushVs' => true, 'pushMessages' => true]]);
    $this->assertSame(['haptics' => false, 'pushFriends' => true, 'pushVs' => true, 'pushMessages' => true], $user->fresh()->settings);

    $this->putJson('/api/v1/me/settings', ['theme' => 'light'])
        ->assertOk()
        ->assertExactJson(['settings' => ['haptics' => false, 'analytics' => false, 'pushFriends' => true, 'pushVs' => true, 'pushMessages' => true]]);
    $this->getJson('/api/v1/me')->assertJsonPath('user.settings', ['haptics' => false, 'analytics' => false, 'pushFriends' => true, 'pushVs' => true, 'pushMessages' => true]);

    // Which news pushes tell the phone about.
    $this->putJson('/api/v1/me/settings', ['pushVs' => false])
        ->assertOk()
        ->assertJsonPath('settings.pushVs', false)
        ->assertJsonPath('settings.pushFriends', true);
});

test('a setting must be a JSON boolean', function () {
    $this->signIn();

    foreach (['yes', 1, null] as $value) {
        $this->assertApiError($this->putJson('/api/v1/me/settings', ['haptics' => $value]), 422, 'validation_failed')
            ->assertJsonStructure(['error' => ['fields' => ['haptics']]]);
    }
});

test('a guest links an email and can then log in with it', function () {
    $this->signIn(User::factory()->create());

    $this->postJson('/api/v1/me/credentials', ['email' => 'Kubi@Example.com', 'password' => 'long-enough'])
        ->assertOk()
        ->assertJsonPath('user.email', 'kubi@example.com')
        ->assertJsonPath('user.isGuest', false);

    $this->postJson('/api/v1/auth/login', ['email' => 'kubi@example.com', 'password' => 'long-enough'])->assertOk();
});

test('an email another account uses is taken', function () {
    User::factory()->linked('kubi@example.com')->create();
    $this->signIn(User::factory()->create());

    $this->assertApiError(
        $this->postJson('/api/v1/me/credentials', ['email' => 'KUBI@example.com', 'password' => 'long-enough']),
        409,
        'email_taken',
    );
});

test('an account links only once', function () {
    $this->signIn(User::factory()->linked('kubi@example.com')->create());

    $this->assertApiError(
        $this->postJson('/api/v1/me/credentials', ['email' => 'new@example.com', 'password' => 'long-enough']),
        409,
        'already_linked',
    );
});

test('credentials need a valid email and eight characters', function () {
    $this->signIn(User::factory()->create());

    $response = $this->postJson('/api/v1/me/credentials', ['email' => 'not-an-email', 'password' => 'short']);

    $this->assertApiError($response, 422, 'validation_failed')
        ->assertJsonPath('error.fields.password', ['Şifre en az 8 karakter olmalı.'])
        ->assertJsonPath('error.fields.email', ['E-posta geçerli bir e-posta adresi olmalı.']);
});

test('deleting the account removes its runs, rows and tokens', function () {
    $user = User::factory()->withUsername()->create();
    $other = User::factory()->withUsername()->create();
    $token = $user->createToken('ios')->plainTextToken;
    $other->createToken('ios');
    $leaderboards = app(LeaderboardService::class);
    $leaderboards->record(Run::factory()->for($user)->ranked(1000)->create());
    $leaderboards->record(Run::factory()->for($other)->ranked(2000)->create());
    Run::factory()->for($user)->create();

    $this->withToken($token)->deleteJson('/api/v1/me')->assertNoContent();

    $this->assertModelMissing($user);
    $this->assertSame(0, Run::query()->where('user_id', $user->id)->count());
    $this->assertSame(0, LeaderboardEntry::query()->where('user_id', $user->id)->count());
    $this->assertDatabaseMissing('personal_access_tokens', ['tokenable_id' => $user->id]);

    $this->assertSame(1, Run::query()->where('user_id', $other->id)->count());
    $this->assertSame(4, LeaderboardEntry::query()->where('user_id', $other->id)->count());
    $this->assertDatabaseHas('personal_access_tokens', ['tokenable_id' => $other->id]);

    $this->app['auth']->forgetGuards();
    $this->assertApiError($this->withToken($token)->getJson('/api/v1/me'), 401, 'unauthenticated');
});

test('deleting the account takes its analytics and its phones along, not the anonymous totals', function () {
    Carbon::setTestNow(Carbon::parse('2026-09-26 12:00', 'Europe/Istanbul'));
    $user = User::factory()->withUsername()->consenting()->create();
    $token = $user->createToken('ios')->plainTextToken;
    $this->withToken($token)->withHeaders(['X-Device' => deviceHeaderOf()])
        ->postJson('/api/v1/analytics/visits', analyticsBatch(analyticsVisit(['journey' => [['tutorial_done', 1]], 'counts' => ['tutorial_done' => 1]])))
        ->assertExactJson(['record' => true]);
    $totals = analyticsTotals('2026-09-26');
    expect(DB::table('player_devices')->count())->toBe(1)
        ->and(DB::table('analytics_milestones')->count())->toBe(1);

    app('auth')->forgetGuards();
    $this->withToken($token)->deleteJson('/api/v1/me')->assertNoContent();

    foreach (['analytics_visits', 'analytics_player_days', 'analytics_milestones', 'player_devices'] as $table) {
        expect(DB::table($table)->where('user_id', $user->id)->count())->toBe(0);
    }
    expect(analyticsTotals('2026-09-26'))->toBe($totals);
});

test('the database cascades a deleted user', function () {
    $user = User::factory()->withUsername()->create();
    app(LeaderboardService::class)->record(Run::factory()->for($user)->ranked(1000)->create());

    $user->delete();

    $this->assertSame(0, Run::query()->count());
    $this->assertSame(0, LeaderboardEntry::query()->count());
});
