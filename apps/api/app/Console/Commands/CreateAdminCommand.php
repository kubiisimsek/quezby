<?php

namespace App\Console\Commands;

use App\Enums\AdminRole;
use App\Enums\AuditAction;
use App\Models\Admin;
use App\Services\Admin\AdminAccounts;
use App\Services\Admin\AuditLog;
use App\Support\Actor;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

/**
 * Makes an admin panel account — the first owner, typically — with a
 * temporary password printed once. `--reset` gives an existing one a new
 * temporary password instead and ends their sessions.
 */
final class CreateAdminCommand extends Command
{
    protected $signature = 'quezby:admin:create
                            {email : The admin\'s email, their sign-in name}
                            {--name= : How the panel and the audit log call them}
                            {--role=owner : owner, moderator or viewer}
                            {--reset : Give an existing admin a new temporary password}';

    protected $description = 'Create an admin panel account (or reset one) with a temporary password';

    public function handle(AdminAccounts $accounts, AuditLog $audit): int
    {
        $email = Str::lower(trim((string) $this->argument('email')));
        $role = AdminRole::tryFrom((string) $this->option('role'));
        if ($role === null) {
            $this->components->error('The role is owner, moderator or viewer.');

            return self::INVALID;
        }
        if (Validator::make(['email' => $email], ['email' => ['required', 'email', 'max:191']])->fails()) {
            $this->components->error("{$email} is not an email address.");

            return self::INVALID;
        }

        $existing = Admin::query()->where('email', $email)->first();
        if ($existing !== null) {
            if (! $this->option('reset')) {
                $this->components->error("{$email} already has an account. Add --reset to give it a new temporary password.");

                return self::FAILURE;
            }
            $password = $accounts->resetPassword($existing);
            $existing->forceFill(['disabled_at' => null])->save();
            $audit->record(Actor::cli(), AuditAction::AdminResetPassword, $existing);
            $this->printPassword($existing, $password);

            return self::SUCCESS;
        }

        $name = trim((string) $this->option('name')) ?: Str::before($email, '@');
        [$admin, $password] = $accounts->create(mb_substr($name, 0, 64), $email, $role);
        $audit->record(Actor::cli(), AuditAction::AdminCreate, $admin, details: ['role' => $role->value]);
        $this->printPassword($admin, $password);

        return self::SUCCESS;
    }

    private function printPassword(Admin $admin, string $password): void
    {
        $this->components->info("{$admin->email} ({$admin->role->label()}) can sign in to the admin panel.");
        $this->line("  Temporary password: <options=bold>{$password}</>");
        $this->line('  It is shown only now; the panel asks for a new one on the first sign-in.');
    }
}
