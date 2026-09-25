<?php

use App\Enums\AdminRole;
use App\Enums\AuditAction;
use App\Models\Admin;
use App\Models\AuditEntry;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\TestResponse;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-25 12:00', 'Europe/Istanbul'));
});

/**
 * @param  array<string, mixed>  $changes
 */
function adminsUpdate(Admin $admin, array $changes): TestResponse
{
    return test()->putJson("/api/v1/admin/admins/{$admin->id}", $changes);
}

test('lists the panel\'s accounts, oldest first', function () {
    $owner = $this->signInAdmin(AdminRole::Owner, ['name' => 'Kubilay', 'created_at' => now()->subDay()]);
    Admin::factory()->moderator()->disabled()->create(['name' => 'Ekin']);

    $this->getJson('/api/v1/admin/admins')
        ->assertOk()
        ->assertJsonPath('admins.*.name', ['Kubilay', 'Ekin'])
        ->assertJsonPath('admins.0.id', $owner->id)
        ->assertJsonPath('admins.1.role', 'moderator')
        ->assertJsonPath('admins.1.disabledAt', '2026-09-25T09:00:00.000Z');
});

test('adds an admin with a temporary password, shown once', function () {
    $this->signInAdmin(AdminRole::Owner);

    $response = $this->postJson('/api/v1/admin/admins', ['name' => 'Ekin', 'email' => ' Ekin@Quezby.com ', 'role' => 'moderator'])
        ->assertCreated()
        ->assertJsonPath('admin.email', 'ekin@quezby.com')
        ->assertJsonPath('admin.role', 'moderator')
        ->assertJsonPath('admin.mustChangePassword', true);

    $admin = Admin::query()->where('email', 'ekin@quezby.com')->sole();
    expect(Hash::check((string) $response->json('temporaryPassword'), $admin->password))->toBeTrue()
        ->and(AuditEntry::query()->sole())
        ->action->toBe(AuditAction::AdminCreate)
        ->details->toBe(['role' => 'moderator']);

    $this->getJson('/api/v1/admin/admins')->assertJsonMissingPath('admins.1.temporaryPassword');
});

test('refuses an email already on an account, and a role it does not know', function (array $body, string $field) {
    $this->signInAdmin(AdminRole::Owner);
    Admin::factory()->create(['email' => 'ekin@quezby.com']);

    $this->assertApiError($this->postJson('/api/v1/admin/admins', $body + ['name' => 'Ekin', 'email' => 'yeni@quezby.com', 'role' => 'viewer']), 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => [$field]]]);
})->with([
    'a taken email' => [['email' => 'EKIN@quezby.com'], 'email'],
    'an unknown role' => [['role' => 'admin'], 'role'],
    'no name' => [['name' => ''], 'name'],
]);

test('changes a role and a name, and says what changed', function () {
    $this->signInAdmin(AdminRole::Owner);
    $admin = Admin::factory()->viewer()->create(['name' => 'Ekin']);

    adminsUpdate($admin, ['role' => 'moderator', 'name' => 'Ekin Aydın'])
        ->assertOk()
        ->assertJsonPath('admin.role', 'moderator')
        ->assertJsonPath('admin.name', 'Ekin Aydın');

    expect(AuditEntry::query()->sole())
        ->action->toBe(AuditAction::AdminUpdate)
        ->details->toBe(['from' => ['name' => 'Ekin', 'role' => 'viewer'], 'to' => ['name' => 'Ekin Aydın', 'role' => 'moderator']]);
});

test('switching an admin off ends their sessions, and on lets them back', function () {
    $this->signInAdmin(AdminRole::Owner);
    $admin = Admin::factory()->moderator()->create();
    $admin->createToken('admin-panel', ['admin'], now()->addHour());

    adminsUpdate($admin, ['disabled' => true])->assertOk()->assertJsonPath('admin.disabledAt', '2026-09-25T09:00:00.000Z');
    expect($admin->tokens()->count())->toBe(0);

    adminsUpdate($admin, ['disabled' => false])->assertOk()->assertJsonPath('admin.disabledAt', null);
});

test('nobody changes their own role or switches themselves off', function (array $changes, string $field) {
    $owner = $this->signInAdmin(AdminRole::Owner);
    Admin::factory()->owner()->create();

    $this->assertApiError(adminsUpdate($owner, $changes), 422, 'validation_failed')->assertJsonStructure(['error' => ['fields' => [$field]]]);
    expect($owner->fresh()->role)->toBe(AdminRole::Owner);
})->with([
    [['role' => 'viewer'], 'role'],
    [['disabled' => true], 'disabled'],
]);

test('the panel always keeps an owner who can sign in', function () {
    $this->signInAdmin(AdminRole::Owner);
    $other = Admin::factory()->owner()->create();
    Admin::query()->whereKeyNot($other->id)->update(['disabled_at' => now()]);

    $this->assertApiError(adminsUpdate($other, ['role' => 'moderator']), 422, 'validation_failed')
        ->assertJsonPath('error.fields.role.0', 'Panelde en az bir etkin Sahip kalmalı.');
    $this->assertApiError(adminsUpdate($other, ['disabled' => true]), 422, 'validation_failed');
});

test('gives another admin a new temporary password and ends their sessions', function () {
    $owner = $this->signInAdmin(AdminRole::Owner);
    $admin = Admin::factory()->moderator()->create();
    $admin->createToken('admin-panel', ['admin'], now()->addHour());

    $password = $this->postJson("/api/v1/admin/admins/{$admin->id}/reset-password")
        ->assertOk()
        ->assertJsonPath('admin.mustChangePassword', true)
        ->json('temporaryPassword');

    expect(Hash::check($password, $admin->fresh()->password))->toBeTrue()
        ->and($admin->tokens()->count())->toBe(0)
        ->and(AuditEntry::query()->sole()->action)->toBe(AuditAction::AdminResetPassword);

    $this->assertApiError($this->postJson("/api/v1/admin/admins/{$owner->id}/reset-password"), 422, 'validation_failed');
});

test('an unknown admin is not found', function () {
    $this->signInAdmin(AdminRole::Owner);

    $this->assertApiError($this->putJson('/api/v1/admin/admins/01jzzzzzzzzzzzzzzzzzzzzzzz', ['role' => 'viewer']), 404, 'not_found');
});
