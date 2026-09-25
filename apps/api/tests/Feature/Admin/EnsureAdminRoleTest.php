<?php

use App\Enums\AdminRole;
use App\Models\Admin;
use Illuminate\Support\Facades\Route;

/*
| `admin.role:*` on a route of its own, so every rule is tested once here and
| `RolesTest` only has to say which role each real route asks for.
*/

beforeEach(function () {
    Route::middleware(['auth:admin', 'admin.role:moderator'])->get('/api/v1/admin/_moderators-only', fn () => response()->json(['ok' => true]))->name('admin._moderators-only');
});

test('a role at least the one named goes through', function (AdminRole $role) {
    $this->signInAdmin($role);

    $this->getJson('/api/v1/admin/_moderators-only')->assertOk();
})->with([AdminRole::Moderator, AdminRole::Owner]);

test('a lesser role is forbidden', function () {
    $this->signInAdmin(AdminRole::Viewer);

    $this->assertApiError($this->getJson('/api/v1/admin/_moderators-only'), 403, 'forbidden')
        ->assertJsonPath('error.message', 'Bu işlem için yetkin yok.');
});

test('an admin on a temporary password reaches nothing but the password change', function () {
    $this->signInAdmin(AdminRole::Owner, ['must_change_password' => true]);

    $this->assertApiError($this->getJson('/api/v1/admin/_moderators-only'), 403, 'forbidden')
        ->assertJsonPath('error.message', 'Önce şifreni değiştir.');
    $this->getJson('/api/v1/admin/me')->assertOk()->assertJsonPath('admin.mustChangePassword', true);
});

test('a disabled admin is signed out for good', function () {
    $admin = Admin::factory()->owner()->create();
    $token = $admin->createToken('admin-panel', ['admin'], now()->addHour())->plainTextToken;
    $admin->forceFill(['disabled_at' => now()])->save();

    $this->assertApiError($this->getJson('/api/v1/admin/me', ['Authorization' => "Bearer {$token}"]), 401, 'unauthenticated');
    expect($admin->tokens()->count())->toBe(0);
});
