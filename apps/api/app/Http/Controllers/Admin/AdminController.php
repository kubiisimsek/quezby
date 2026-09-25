<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AdminRole;
use App\Enums\AuditAction;
use App\Enums\ErrorCode;
use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CreateAdminRequest;
use App\Http\Requests\Admin\UpdateAdminRequest;
use App\Models\Admin;
use App\Services\Admin\AdminAccounts;
use App\Services\Admin\AuditLog;
use App\Support\Actor;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * `/admin/admins` — the panel's own accounts, for owners: add one with a
 * temporary password, change a role, switch one off, give one a new
 * password. A temporary password is in the answer once and nowhere else.
 */
class AdminController extends Controller
{
    public function __construct(
        private readonly AdminAccounts $accounts,
        private readonly AuditLog $audit,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'admins' => Admin::query()->orderBy('created_at')->orderBy('id')->get()
                ->map(fn (Admin $admin) => $this->accounts->account($admin))->values()->all(),
        ]);
    }

    public function store(CreateAdminRequest $request, #[CurrentUser('admin')] Admin $owner): JsonResponse
    {
        $role = $request->enum('role', AdminRole::class) ?? AdminRole::Viewer;
        [$admin, $password] = $this->accounts->create((string) $request->validated('name'), (string) $request->validated('email'), $role);
        $this->audit->record(Actor::panel($owner, $request), AuditAction::AdminCreate, $admin, details: ['role' => $admin->role->value]);

        return response()->json(['admin' => $this->accounts->account($admin), 'temporaryPassword' => $password], 201);
    }

    public function update(UpdateAdminRequest $request, string $admin, #[CurrentUser('admin')] Admin $owner): JsonResponse
    {
        $updated = $this->accounts->update($this->admin($admin), $request->changes(), Actor::panel($owner, $request));

        return response()->json(['admin' => $this->accounts->account($updated)]);
    }

    /** A new temporary password for someone else; your own you change on "Hesabım". */
    public function resetPassword(Request $request, string $admin, #[CurrentUser('admin')] Admin $owner): JsonResponse
    {
        $target = $this->admin($admin);
        if ($target->is($owner)) {
            throw ValidationException::withMessages(['admin' => 'Kendi şifreni Hesabım sayfasından değiştir.']);
        }

        $password = $this->accounts->resetPassword($target);
        $this->audit->record(Actor::panel($owner, $request), AuditAction::AdminResetPassword, $target);

        return response()->json(['admin' => $this->accounts->account($target->refresh()), 'temporaryPassword' => $password]);
    }

    private function admin(string $id): Admin
    {
        return Admin::query()->find(strtolower($id)) ?? throw ApiException::of(ErrorCode::NotFound);
    }
}
