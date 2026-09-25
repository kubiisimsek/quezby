<?php

use App\Enums\AdminRole;
use App\Enums\AuditAction;
use App\Enums\AuditVia;
use App\Models\Admin;
use App\Models\AuditEntry;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-25 10:00:00', 'UTC'));
});

/**
 * @param  array<string, mixed>  $body
 */
function adminAuthLogin(array $body): TestResponse
{
    return test()->postJson('/api/v1/admin/auth/login', $body);
}

/** A fresh request with the bearer token, as the panel sends it — guards forget the last request's admin. */
function adminAuthGet(string $uri, string $token): TestResponse
{
    app('auth')->forgetGuards();

    return test()->getJson($uri, ['Authorization' => "Bearer {$token}"]);
}

test('an admin signs in and gets a session that ends in twelve hours', function () {
    $admin = Admin::factory()->moderator()->create(['email' => 'ekin@quezby.com', 'name' => 'Ekin']);

    $response = adminAuthLogin(['email' => 'ekin@quezby.com', 'password' => 'password'])
        ->assertOk()
        ->assertJsonPath('expiresAt', '2026-09-25T22:00:00.000Z')
        ->assertJsonPath('admin.id', $admin->id)
        ->assertJsonPath('admin.name', 'Ekin')
        ->assertJsonPath('admin.role', 'moderator')
        ->assertJsonPath('admin.mustChangePassword', false)
        ->assertJsonPath('admin.lastLoginAt', '2026-09-25T10:00:00.000Z');

    expect($response->json('token'))->toBeString()->not->toBe('')
        ->and($admin->fresh()->last_login_at?->toIso8601String())->toBe('2026-09-25T10:00:00+00:00');

    $entry = AuditEntry::query()->sole();
    expect($entry->action)->toBe(AuditAction::Login)
        ->and($entry->via)->toBe(AuditVia::Panel)
        ->and($entry->admin_id)->toBe($admin->id)
        ->and($entry->subject_type)->toBe('admin')
        ->and($entry->ip)->toBe('127.0.0.1');
});

test('the email is not case sensitive', function () {
    Admin::factory()->create(['email' => 'ekin@quezby.com']);

    adminAuthLogin(['email' => 'Ekin@Quezby.COM', 'password' => 'password'])->assertOk();
});

test('a wrong password, an unknown email and a disabled account read the same', function (array $body) {
    Admin::factory()->create(['email' => 'ekin@quezby.com']);
    Admin::factory()->disabled()->create(['email' => 'eski@quezby.com']);

    $this->assertApiError(adminAuthLogin($body), 422, 'invalid_credentials')
        ->assertJsonPath('error.message', 'E-posta ya da şifre hatalı.');
    expect(AuditEntry::query()->count())->toBe(0);
})->with([
    'a wrong password' => [['email' => 'ekin@quezby.com', 'password' => 'yanlis-sifre']],
    'an unknown email' => [['email' => 'kimse@quezby.com', 'password' => 'password']],
    'a disabled account' => [['email' => 'eski@quezby.com', 'password' => 'password']],
]);

test('the login asks for an email and a password', function (array $body, string $field) {
    $this->assertApiError(adminAuthLogin($body), 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => [$field]]]);
})->with([
    'no email' => [['password' => 'password'], 'email'],
    'not an email' => [['email' => 'ekin', 'password' => 'password'], 'email'],
    'no password' => [['email' => 'ekin@quezby.com'], 'password'],
]);

test('guessing passwords is throttled', function () {
    Admin::factory()->create(['email' => 'ekin@quezby.com']);
    for ($i = 0; $i < 5; $i++) {
        adminAuthLogin(['email' => 'ekin@quezby.com', 'password' => "tahmin-{$i}"])->assertStatus(422);
    }

    $this->assertApiError(adminAuthLogin(['email' => 'ekin@quezby.com', 'password' => 'password']), 429, 'too_many_requests');
});

test('a panel token stops working after twelve hours', function () {
    Admin::factory()->create(['email' => 'ekin@quezby.com']);
    $token = adminAuthLogin(['email' => 'ekin@quezby.com', 'password' => 'password'])->json('token');

    Carbon::setTestNow(now()->addHours(12)->subSecond());
    adminAuthGet('/api/v1/admin/me', $token)->assertOk();

    Carbon::setTestNow(now()->addSeconds(2));
    $this->assertApiError(adminAuthGet('/api/v1/admin/me', $token), 401, 'unauthenticated');
});

test('signing in clears the admin\'s expired tokens', function () {
    $admin = Admin::factory()->create(['email' => 'ekin@quezby.com']);
    $admin->createToken('admin-panel', ['admin'], now()->subMinute());
    $admin->createToken('admin-panel', ['admin'], now()->addHour());

    adminAuthLogin(['email' => 'ekin@quezby.com', 'password' => 'password'])->assertOk();

    expect($admin->tokens()->count())->toBe(2);
});

test('signing out ends only this session', function () {
    Admin::factory()->create(['email' => 'ekin@quezby.com']);
    $first = adminAuthLogin(['email' => 'ekin@quezby.com', 'password' => 'password'])->json('token');
    $second = adminAuthLogin(['email' => 'ekin@quezby.com', 'password' => 'password'])->json('token');

    app('auth')->forgetGuards();
    $this->postJson('/api/v1/admin/auth/logout', [], ['Authorization' => "Bearer {$first}"])->assertNoContent();

    $this->assertApiError(adminAuthGet('/api/v1/admin/me', $first), 401, 'unauthenticated');
    adminAuthGet('/api/v1/admin/me', $second)->assertOk();
});

test('me says who is signed in', function () {
    $admin = $this->signInAdmin(AdminRole::Viewer, ['name' => 'Deniz', 'email' => 'deniz@quezby.com']);

    $this->getJson('/api/v1/admin/me')
        ->assertOk()
        ->assertExactJson(['admin' => [
            'id' => $admin->id,
            'name' => 'Deniz',
            'email' => 'deniz@quezby.com',
            'role' => 'viewer',
            'mustChangePassword' => false,
            'lastLoginAt' => null,
        ]]);
});

test('a new password ends every other session', function () {
    $admin = Admin::factory()->mustChangePassword()->create(['email' => 'ekin@quezby.com']);
    $current = adminAuthLogin(['email' => 'ekin@quezby.com', 'password' => 'password'])->json('token');
    $other = adminAuthLogin(['email' => 'ekin@quezby.com', 'password' => 'password'])->json('token');

    app('auth')->forgetGuards();
    $this->putJson('/api/v1/admin/me/password', [
        'currentPassword' => 'password',
        'password' => 'yeni-ve-uzun-sifre',
        'passwordConfirmation' => 'yeni-ve-uzun-sifre',
    ], ['Authorization' => "Bearer {$current}"])->assertNoContent();

    expect($admin->fresh()->must_change_password)->toBeFalse();
    adminAuthGet('/api/v1/admin/me', $current)->assertOk()->assertJsonPath('admin.mustChangePassword', false);
    $this->assertApiError(adminAuthGet('/api/v1/admin/me', $other), 401, 'unauthenticated');

    app('auth')->forgetGuards();
    adminAuthLogin(['email' => 'ekin@quezby.com', 'password' => 'yeni-ve-uzun-sifre'])->assertOk();
    expect(AuditEntry::query()->where('action', AuditAction::PasswordChanged)->count())->toBe(1);
});

test('the current password has to be right', function () {
    $this->signInAdmin();

    $this->assertApiError($this->putJson('/api/v1/admin/me/password', [
        'currentPassword' => 'yanlis',
        'password' => 'yeni-ve-uzun-sifre',
        'passwordConfirmation' => 'yeni-ve-uzun-sifre',
    ]), 422, 'validation_failed')
        ->assertJsonPath('error.fields.currentPassword.0', 'Şu anki şifren doğru değil.');
});

test('a new password is long, confirmed and new', function (array $body, string $field) {
    $this->signInAdmin();

    $this->assertApiError($this->putJson('/api/v1/admin/me/password', $body + [
        'currentPassword' => 'password',
        'password' => 'yeni-ve-uzun-sifre',
        'passwordConfirmation' => 'yeni-ve-uzun-sifre',
    ]), 422, 'validation_failed')
        ->assertJsonStructure(['error' => ['fields' => [$field]]]);
})->with([
    'too short' => [['password' => 'kisa-sifre', 'passwordConfirmation' => 'kisa-sifre'], 'password'],
    'not confirmed' => [['passwordConfirmation' => 'baska-bir-sifre'], 'passwordConfirmation'],
    'the same as now' => [['currentPassword' => 'yeni-ve-uzun-sifre'], 'password'],
]);

test('a player cannot sign in to the panel with their own account', function () {
    User::factory()->withUsername('kerem.35')->linked('kerem@quezby.com')->create();

    $this->assertApiError(adminAuthLogin(['email' => 'kerem@quezby.com', 'password' => 'password']), 422, 'invalid_credentials');
});
