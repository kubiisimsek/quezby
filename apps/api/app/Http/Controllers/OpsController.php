<?php

namespace App\Http\Controllers;

use App\Enums\AdminRole;
use App\Enums\AuditAction;
use App\Enums\ErrorCode;
use App\Exceptions\ErrorResponse;
use App\Http\Requests\Admin\OpsAdminRequest;
use App\Models\Admin;
use App\Services\Admin\AdminAccounts;
use App\Services\Admin\AuditLog;
use App\Services\OpsChores;
use App\Support\Actor;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Deploy chores for hosts without SSH, behind `X-Ops-Token`. Their failures are
 * spelled out — only whoever holds the token can see them.
 */
class OpsController extends Controller
{
    public function migrate(OpsChores $chores): JsonResponse
    {
        return $this->run(fn () => $chores->migrate());
    }

    /** Clears and rebuilds the config, route, event and view caches. */
    public function optimize(OpsChores $chores): JsonResponse
    {
        return $this->run(fn () => $chores->optimize());
    }

    /**
     * The admin panel's first owner — or a new temporary password for an
     * admin who lost theirs, keeping their role — on hosts without SSH. The
     * password is in the answer once, and nowhere else.
     */
    public function admins(OpsAdminRequest $request, AdminAccounts $accounts, AuditLog $audit): JsonResponse
    {
        $email = Str::lower((string) $request->validated('email'));
        $actor = Actor::ops($request);

        $admin = Admin::query()->where('email', $email)->first();
        if ($admin !== null) {
            $password = $accounts->resetPassword($admin);
            $admin->forceFill(['disabled_at' => null])->save();
            $audit->record($actor, AuditAction::AdminResetPassword, $admin);

            return response()->json(['admin' => $accounts->account($admin), 'temporaryPassword' => $password]);
        }

        $name = trim((string) $request->validated('name')) ?: Str::before($email, '@');
        [$admin, $password] = $accounts->create($name, $email, AdminRole::Owner);
        $audit->record($actor, AuditAction::AdminCreate, $admin, details: ['role' => AdminRole::Owner->value]);

        return response()->json(['admin' => $accounts->account($admin), 'temporaryPassword' => $password], 201);
    }

    /**
     * @param  Closure(): string  $chore
     */
    private function run(Closure $chore): JsonResponse
    {
        try {
            return response()->json(['status' => 'ok', 'output' => $chore()]);
        } catch (RuntimeException $e) {
            return ErrorResponse::make(ErrorCode::ServerError, $e->getMessage());
        }
    }
}
