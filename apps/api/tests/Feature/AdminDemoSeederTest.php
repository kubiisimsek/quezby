<?php

use App\Enums\AdminRole;
use App\Enums\AuditAction;
use App\Enums\RunStatus;
use App\Models\Admin;
use App\Models\AuditEntry;
use App\Models\Run;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;

test('the admin demo seeder refuses to run outside local', function (string $environment) {
    $this->app['env'] = $environment;

    expect(fn () => Artisan::call('db:seed', ['--class' => 'AdminDemoSeeder', '--force' => true]))
        ->toThrow(RuntimeException::class, 'AdminDemoSeeder only runs locally');
    expect(Admin::query()->count())->toBe(0);
})->with(['testing', 'staging', 'production']);

test('locally it makes an admin of each role and something for each of them to look at', function () {
    $this->app['env'] = 'local';
    Carbon::setTestNow(Carbon::parse('2026-09-25 12:00', 'Europe/Istanbul'));

    Artisan::call('db:seed', ['--class' => 'AdminDemoSeeder']);

    expect(Artisan::output())->toContain('owner@quezby.test');
    foreach (['owner@quezby.test' => AdminRole::Owner, 'moderator@quezby.test' => AdminRole::Moderator, 'viewer@quezby.test' => AdminRole::Viewer] as $email => $role) {
        $admin = Admin::query()->where('email', $email)->sole();
        expect($admin->role)->toBe($role)
            ->and(Hash::check('password', $admin->password))->toBeTrue()
            ->and($admin->must_change_password)->toBeFalse();
    }

    expect(Run::query()->where('status', RunStatus::Flagged)->count())->toBeGreaterThanOrEqual(8)
        ->and(Run::query()->whereNotNull('flag_codes')->count())->toBeGreaterThan(0)
        ->and(User::query()->where('username', 'yasakli.hesap')->sole()->isBanned())->toBeTrue()
        ->and(User::query()->where('username', 'root.telefon')->sole()->deviceChecks()->where('verdict', 'fail')->count())->toBe(3)
        ->and(AuditEntry::query()->pluck('action')->all())->toEqualCanonicalizing([AuditAction::RunReject, AuditAction::PlayerBan]);

    $this->signInAdmin(AdminRole::Viewer);
    $this->getJson('/api/v1/admin/suspects')->assertOk()->assertJsonPath('items.0.player.username', 'bot.hizli');

    Artisan::call('db:seed', ['--class' => 'AdminDemoSeeder']);
    expect(Artisan::output())->toContain('already here')
        ->and(Admin::query()->count())->toBe(4);
});
