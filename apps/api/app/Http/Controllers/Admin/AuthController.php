<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AuditAction;
use App\Enums\ErrorCode;
use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\LoginRequest;
use App\Models\Admin;
use App\Services\Admin\AdminAccounts;
use App\Services\Admin\AuditLog;
use App\Support\Actor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * `POST /admin/auth/login` and `/logout` — the panel's sessions.
 */
class AuthController extends Controller
{
    /**
     * A bcrypt hash of nothing anyone knows: an unknown email is checked
     * against it, so a wrong address takes as long as a wrong password.
     */
    private const DECOY_HASH = '$2y$12$mns2lb6/gc.uZY9nzQUiu.F9pS2Gdkd5SPUFhu3mXODbjvhzlqWoC';

    public function __construct(
        private readonly AdminAccounts $accounts,
        private readonly AuditLog $audit,
    ) {}

    /** An unknown email, a wrong password and a disabled account all read the same. */
    public function login(LoginRequest $request): JsonResponse
    {
        $admin = Admin::query()->where('email', Str::lower($request->validated('email')))->first();
        $matches = Hash::check((string) $request->validated('password'), $admin->password ?? self::DECOY_HASH);

        if ($admin === null || ! $matches || $admin->isDisabled()) {
            throw ApiException::of(ErrorCode::InvalidCredentials);
        }

        $admin->tokens()->where('expires_at', '<', now())->delete();
        $admin->forceFill(['last_login_at' => now()])->save();
        $this->audit->record(Actor::panel($admin, $request), AuditAction::Login, $admin);

        return response()->json($this->accounts->session($admin));
    }

    public function logout(Request $request): Response
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }
}
