<?php

use App\Enums\AdminRole;
use App\Enums\AuditAction;
use App\Enums\RunStatus;
use App\Models\AuditEntry;
use App\Models\Run;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;

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
        ->assertJsonPath('season', 2)
        ->assertJsonPath('engineVersion', 2)
        ->assertJsonPath('timezone', 'Europe/Istanbul')
        ->assertJsonPath('tokens', ['ops' => true, 'moderation' => false])
        ->assertJsonPath('pendingMigrations', [])
        ->assertJsonPath('runs', ['open' => 2, 'stale' => 1])
        ->assertJsonPath('limits.adminTokenHours', 12);

    expect($response->getContent())->not->toContain('a-very-secret-ops-token')
        ->and($response->json('apps.ios'))->toHaveKeys(['min', 'latest']);
});

test('closes the runs left open past their time, and it is on record', function () {
    $stale = Run::factory()->create(['started_at' => now()->subHours(3)]);

    $this->postJson('/api/v1/admin/system/expire-runs')->assertOk()->assertJsonStructure(['output']);

    expect($stale->fresh()->status)->toBe(RunStatus::Expired)
        ->and(AuditEntry::query()->sole())
        ->action->toBe(AuditAction::SystemExpireRuns)
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
