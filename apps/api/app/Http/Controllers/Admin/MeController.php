<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AuditAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ChangePasswordRequest;
use App\Models\Admin;
use App\Services\Admin\AdminAccounts;
use App\Services\Admin\AuditLog;
use App\Support\Actor;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * `GET /admin/me` and `PUT /admin/me/password`.
 */
class MeController extends Controller
{
    public function __construct(
        private readonly AdminAccounts $accounts,
        private readonly AuditLog $audit,
    ) {}

    public function show(#[CurrentUser('admin')] Admin $admin): JsonResponse
    {
        return response()->json(['admin' => $this->accounts->present($admin)]);
    }

    /** A new password ends every other session of the admin. */
    public function password(ChangePasswordRequest $request, #[CurrentUser('admin')] Admin $admin): Response
    {
        if (! Hash::check((string) $request->validated('currentPassword'), $admin->password)) {
            throw ValidationException::withMessages(['currentPassword' => 'Şu anki şifren doğru değil.']);
        }

        DB::transaction(function () use ($request, $admin) {
            $admin->forceFill([
                'password' => (string) $request->validated('password'),
                'must_change_password' => false,
            ])->save();
            $current = $admin->currentAccessToken();
            $admin->tokens()
                ->when($current instanceof PersonalAccessToken, fn (Builder $query) => $query->whereKeyNot($current->getKey()))
                ->delete();
            $this->audit->record(Actor::panel($admin, $request), AuditAction::PasswordChanged, $admin);
        });

        return response()->noContent();
    }
}
