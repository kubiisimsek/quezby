<?php

use App\Enums\AdminRole;
use App\Enums\AuditAction;
use App\Enums\AuditVia;
use App\Models\Admin;
use App\Models\AuditEntry;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\TestResponse;

/*
| The first owner: `php artisan quezby:admin:create` where there is SSH, and
| `POST /ops/admins` behind the ops token where there is not.
*/

const ADMIN_BOOTSTRAP_OPS_TOKEN = 'a-long-random-ops-token';

/**
 * @param  array<string, mixed>  $body
 */
function adminBootstrapOps(array $body, string $token = ADMIN_BOOTSTRAP_OPS_TOKEN): TestResponse
{
    return test()->postJson('/api/v1/ops/admins', $body, ['X-Ops-Token' => $token]);
}

test('the command makes an owner with a temporary password', function () {
    $this->artisan('quezby:admin:create', ['email' => 'Kubi@Quezby.com', '--name' => 'Kubilay'])
        ->expectsOutputToContain('Temporary password:')
        ->assertSuccessful();

    $admin = Admin::query()->sole();
    expect($admin->email)->toBe('kubi@quezby.com')
        ->and($admin->name)->toBe('Kubilay')
        ->and($admin->role)->toBe(AdminRole::Owner)
        ->and($admin->must_change_password)->toBeTrue();

    $entry = AuditEntry::query()->sole();
    expect($entry->action)->toBe(AuditAction::AdminCreate)
        ->and($entry->via)->toBe(AuditVia::Cli)
        ->and($entry->actor_label)->toBe('Komut satırı')
        ->and($entry->subject_id)->toBe($admin->id)
        ->and($entry->details)->toBe(['role' => 'owner']);
});

test('the command takes a role and names the admin after their email', function () {
    $this->artisan('quezby:admin:create', ['email' => 'ekin@quezby.com', '--role' => 'moderator'])->assertSuccessful();

    expect(Admin::query()->sole())
        ->name->toBe('ekin')
        ->role->toBe(AdminRole::Moderator);
});

test('the command refuses a second account for one email unless told to reset it', function () {
    $admin = Admin::factory()->moderator()->create(['email' => 'ekin@quezby.com']);
    $admin->createToken('admin-panel', ['admin'], now()->addHour());
    $before = $admin->password;

    $this->artisan('quezby:admin:create', ['email' => 'ekin@quezby.com'])->assertFailed();
    expect($admin->fresh()->password)->toBe($before);

    $this->artisan('quezby:admin:create', ['email' => 'ekin@quezby.com', '--reset' => true])
        ->expectsOutputToContain('Temporary password:')
        ->assertSuccessful();

    $admin->refresh();
    expect($admin->password)->not->toBe($before)
        ->and($admin->must_change_password)->toBeTrue()
        ->and($admin->role)->toBe(AdminRole::Moderator)
        ->and($admin->tokens()->count())->toBe(0)
        ->and(AuditEntry::query()->sole()->action)->toBe(AuditAction::AdminResetPassword);
});

test('the command refuses an unknown role or a malformed email', function (array $arguments) {
    $this->artisan('quezby:admin:create', $arguments)->assertFailed();

    expect(Admin::query()->count())->toBe(0);
})->with([
    'an unknown role' => [['email' => 'ekin@quezby.com', '--role' => 'kral']],
    'not an email' => [['email' => 'ekin']],
]);

test('the ops route does not exist without the ops token', function () {
    config(['quezby.ops_token' => '']);

    $this->assertApiError(adminBootstrapOps(['email' => 'kubi@quezby.com'], ''), 404, 'not_found');
});

test('the ops route refuses a wrong token', function () {
    config(['quezby.ops_token' => ADMIN_BOOTSTRAP_OPS_TOKEN]);

    $this->assertApiError(adminBootstrapOps(['email' => 'kubi@quezby.com'], 'guess'), 401, 'unauthenticated');
    expect(Admin::query()->count())->toBe(0);
});

test('the ops route makes the first owner, whose temporary password signs in', function () {
    config(['quezby.ops_token' => ADMIN_BOOTSTRAP_OPS_TOKEN]);

    $response = adminBootstrapOps(['email' => 'Kubi@Quezby.com', 'name' => 'Kubilay'])
        ->assertCreated()
        ->assertJsonPath('admin.email', 'kubi@quezby.com')
        ->assertJsonPath('admin.name', 'Kubilay')
        ->assertJsonPath('admin.role', 'owner')
        ->assertJsonPath('admin.mustChangePassword', true)
        ->assertJsonPath('admin.disabledAt', null);

    $password = (string) $response->json('temporaryPassword');
    expect(strlen($password))->toBe(16)
        ->and(Hash::check($password, Admin::query()->sole()->password))->toBeTrue();

    $entry = AuditEntry::query()->sole();
    expect($entry->via)->toBe(AuditVia::Ops)
        ->and($entry->action)->toBe(AuditAction::AdminCreate)
        ->and($entry->ip)->toBe('127.0.0.1');

    $this->postJson('/api/v1/admin/auth/login', ['email' => 'kubi@quezby.com', 'password' => $password])
        ->assertOk()
        ->assertJsonPath('admin.mustChangePassword', true);
});

test('the ops route gives an admin who lost their password a new one and lets them back in', function () {
    config(['quezby.ops_token' => ADMIN_BOOTSTRAP_OPS_TOKEN]);
    $admin = Admin::factory()->moderator()->disabled()->create(['email' => 'ekin@quezby.com']);

    $password = adminBootstrapOps(['email' => 'ekin@quezby.com'])
        ->assertOk()
        ->assertJsonPath('admin.role', 'moderator')
        ->json('temporaryPassword');

    $admin->refresh();
    expect(Hash::check($password, $admin->password))->toBeTrue()
        ->and($admin->isDisabled())->toBeFalse()
        ->and($admin->must_change_password)->toBeTrue()
        ->and(AuditEntry::query()->sole()->action)->toBe(AuditAction::AdminResetPassword);
});

test('the ops route asks for an email', function () {
    config(['quezby.ops_token' => ADMIN_BOOTSTRAP_OPS_TOKEN]);

    $this->assertApiError(adminBootstrapOps(['name' => 'Kubi']), 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => ['email']]]);
});
