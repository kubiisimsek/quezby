<?php

namespace App\Services\Admin;

use App\Enums\AdminRole;
use App\Enums\AuditAction;
use App\Models\Admin;
use App\Support\Actor;
use App\Support\Timestamp;
use Illuminate\Container\Attributes\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Admin accounts: made with a temporary password that has to be changed on
 * the first sign-in, and panel sessions that end after a few hours whatever
 * happens — `quezby.admin.token_hours`.
 */
final class AdminAccounts
{
    public function __construct(
        #[Config('quezby.admin.token_hours')]
        private readonly int $tokenHours,
        private readonly AuditLog $audit,
    ) {}

    /**
     * Changes an admin's name, role or whether they can sign in. Nobody
     * changes their own role or switches themselves off, and the panel always
     * keeps one owner who can sign in. Switching an admin off ends their
     * sessions at once.
     *
     * @param  array{name?: string, role?: AdminRole, disabled?: bool}  $changes
     *
     * @throws ValidationException
     */
    public function update(Admin $admin, array $changes, Actor $actor): Admin
    {
        $self = $actor->admin?->is($admin) ?? false;
        if ($self && isset($changes['role']) && $changes['role'] !== $admin->role) {
            throw ValidationException::withMessages(['role' => 'Kendi rolünü değiştiremezsin.']);
        }
        if ($self && ($changes['disabled'] ?? false)) {
            throw ValidationException::withMessages(['disabled' => 'Kendini devre dışı bırakamazsın.']);
        }

        $losesOwner = $admin->role === AdminRole::Owner && ! $admin->isDisabled()
            && ((isset($changes['role']) && $changes['role'] !== AdminRole::Owner) || ($changes['disabled'] ?? false));
        if ($losesOwner && $this->activeOwners() <= 1) {
            throw ValidationException::withMessages([isset($changes['role']) ? 'role' : 'disabled' => 'Panelde en az bir etkin Sahip kalmalı.']);
        }

        return DB::transaction(function () use ($admin, $changes, $actor) {
            $before = ['name' => $admin->name, 'role' => $admin->role->value, 'disabled' => $admin->isDisabled()];
            if (isset($changes['name'])) {
                $admin->name = $changes['name'];
            }
            if (isset($changes['role'])) {
                $admin->role = $changes['role'];
            }
            if (array_key_exists('disabled', $changes)) {
                $admin->disabled_at = $changes['disabled'] ? ($admin->disabled_at ?? now()) : null;
            }
            $admin->save();
            if ($admin->isDisabled()) {
                $admin->tokens()->delete();
            }

            $after = ['name' => $admin->name, 'role' => $admin->role->value, 'disabled' => $admin->isDisabled()];
            $changed = array_filter($after, fn ($value, $key) => $before[$key] !== $value, ARRAY_FILTER_USE_BOTH);
            if ($changed !== []) {
                $this->audit->record($actor, AuditAction::AdminUpdate, $admin, details: [
                    'from' => array_intersect_key($before, $changed),
                    'to' => $changed,
                ]);
            }

            return $admin;
        });
    }

    /** How many owners can sign in right now. */
    public function activeOwners(): int
    {
        return Admin::query()->where('role', AdminRole::Owner)->whereNull('disabled_at')->count();
    }

    /**
     * @return array{0: Admin, 1: string} The admin, and the temporary password — shown once.
     */
    public function create(string $name, string $email, AdminRole $role): array
    {
        $password = $this->temporaryPassword();
        $admin = Admin::query()->create([
            'name' => $name,
            'email' => Str::lower($email),
            'password' => $password,
            'role' => $role,
            'must_change_password' => true,
        ]);

        return [$admin, $password];
    }

    /** A new temporary password, to change on the next sign-in; every session of the admin ends. */
    public function resetPassword(Admin $admin): string
    {
        $password = $this->temporaryPassword();
        DB::transaction(function () use ($admin, $password) {
            $admin->forceFill(['password' => $password, 'must_change_password' => true])->save();
            $admin->tokens()->delete();
        });

        return $password;
    }

    /**
     * `AdminSession` in `packages/types`: a token that stops working after
     * `token_hours`, however busy the admin is.
     *
     * @return array{token: string, expiresAt: string|null, admin: array<string, mixed>}
     */
    public function session(Admin $admin): array
    {
        $expiresAt = now()->addHours($this->tokenHours);

        return [
            'token' => $admin->createToken('admin-panel', ['admin'], $expiresAt)->plainTextToken,
            'expiresAt' => Timestamp::iso($expiresAt),
            'admin' => $this->present($admin),
        ];
    }

    /**
     * `AdminMe` in `packages/types`.
     *
     * @return array<string, mixed>
     */
    public function present(Admin $admin): array
    {
        return [
            'id' => $admin->id,
            'name' => $admin->name,
            'email' => $admin->email,
            'role' => $admin->role->value,
            'mustChangePassword' => $admin->must_change_password,
            'lastLoginAt' => Timestamp::iso($admin->last_login_at),
        ];
    }

    /**
     * `AdminAccount` in `packages/types`.
     *
     * @return array<string, mixed>
     */
    public function account(Admin $admin): array
    {
        return $this->present($admin) + [
            'disabledAt' => Timestamp::iso($admin->disabled_at),
            'createdAt' => Timestamp::iso($admin->created_at),
        ];
    }

    private function temporaryPassword(): string
    {
        return Str::password(16, symbols: false);
    }
}
