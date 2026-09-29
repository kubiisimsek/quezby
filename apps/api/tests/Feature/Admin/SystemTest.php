<?php

use App\Enums\AdminRole;
use App\Enums\AuditAction;
use App\Enums\RunStatus;
use App\Game\Rules;
use App\Models\AuditEntry;
use App\Models\Run;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-25 12:00', 'Europe/Istanbul'));
    $this->signInAdmin(AdminRole::Owner);
});

test('says what the API runs with, and only whether each secret is set', function () {
    config(['quezby.ops_token' => 'a-very-secret-ops-token', 'quezby.moderation_token' => '']);
    Run::factory()->create(['started_at' => now()->subHours(3)]);
    Run::factory()->create();

    $response = $this->getJson('/api/v1/admin/system')
        ->assertOk()
        ->assertJsonPath('environment', 'testing')
        ->assertJsonPath('database', 'sqlite')
        ->assertJsonPath('season', Rules::ENGINE_VERSION)
        ->assertJsonPath('engineVersion', Rules::ENGINE_VERSION)
        ->assertJsonPath('timezone', 'Europe/Istanbul')
        ->assertJsonPath('tokens', ['ops' => true, 'moderation' => false])
        ->assertJsonPath('appKey', true)
        ->assertJsonPath('pendingMigrations', [])
        ->assertJsonPath('runs', ['open' => 2, 'stale' => 1])
        ->assertJsonPath('limits.adminTokenHours', 12);

    expect($response->getContent())->not->toContain('a-very-secret-ops-token')
        ->and($response->json('apps.ios'))->toHaveKeys(['min', 'latest']);
});

test('says when APP_KEY is missing — the panel stays open to put it right', function () {
    config(['app.key' => '']);

    $response = $this->getJson('/api/v1/admin/system')->assertOk()->assertJsonPath('appKey', false);

    expect($response->json())->not->toHaveKey('key');
});

test('closes the runs left open past their time, and it is on record', function () {
    $stale = Run::factory()->create(['started_at' => now()->subHours(3)]);

    $this->postJson('/api/v1/admin/system/expire-runs')->assertOk()->assertJsonStructure(['output']);

    expect($stale->fresh()->status)->toBe(RunStatus::Expired)
        ->and(AuditEntry::query()->sole())
        ->action->toBe(AuditAction::SystemExpireRuns)
        ->subject_type->toBe('system');
});

test('prunes old analytics, and it is on record', function () {
    $player = User::factory()->withUsername()->create();
    $old = now()->subDays(40)->utc()->format('Y-m-d H:i:s');
    DB::table('analytics_visits')->insert([
        'user_id' => $player->id, 'client_id' => str_repeat('a', 32), 'day' => '2026-08-16',
        'started_at' => $old, 'seconds' => 60, 'journey' => '[]', 'created_at' => $old,
    ]);

    $this->postJson('/api/v1/admin/system/analytics-prune')->assertOk()
        ->assertJsonPath('output', fn (string $output) => str_contains($output, 'Pruned 1 visits'));

    expect(DB::table('analytics_visits')->count())->toBe(0)
        ->and(AuditEntry::query()->sole())
        ->action->toBe(AuditAction::SystemAnalyticsPrune)
        ->subject_type->toBe('system');
});

test('rebuilds the caches', function () {
    // Really caching the config here would pin the test configuration for `php artisan serve`.
    Artisan::shouldReceive('call')->once()->with('optimize:clear', [])->andReturn(0);
    Artisan::shouldReceive('call')->once()->with('optimize', [])->andReturn(0);
    Artisan::shouldReceive('output')->twice()->andReturn("cleared\n", "cached\n");

    $this->postJson('/api/v1/admin/system/optimize')->assertOk()->assertExactJson(['output' => "cleared\ncached"]);
    expect(AuditEntry::query()->sole()->details)->toBe(['ok' => true, 'output' => "cleared\ncached"]);
});

test('says why a chore failed, and records the failure', function () {
    Artisan::shouldReceive('call')->once()->with('migrate', ['--force' => true])->andReturn(1);
    Artisan::shouldReceive('output')->once()->andReturn('SQLSTATE[HY000] [2002] Connection refused');

    $this->assertApiError($this->postJson('/api/v1/admin/system/migrate'), 500, 'server_error')
        ->assertJsonPath('error.message', 'migrate başarısız (çıkış kodu 1): SQLSTATE[HY000] [2002] Connection refused');
    expect(AuditEntry::query()->sole())
        ->action->toBe(AuditAction::SystemMigrate)
        ->details->toMatchArray(['ok' => false]);
});

test('knows no other chore', function () {
    $this->assertApiError($this->postJson('/api/v1/admin/system/db-wipe'), 404, 'not_found');
});
