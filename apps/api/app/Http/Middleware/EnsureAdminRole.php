<?php

namespace App\Http\Middleware;

use App\Enums\AdminRole;
use App\Enums\ErrorCode;
use App\Exceptions\ApiException;
use App\Models\Admin;
use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * `admin.role:moderator` — lets an admin through when their role is at least
 * the one named. A disabled admin's token dies here, and an admin who has to
 * change their password reaches nothing else until they do.
 */
class EnsureAdminRole
{
    /** What an admin with a temporary password may still do. */
    private const BEFORE_PASSWORD_CHANGE = ['admin.me', 'admin.me.password', 'admin.auth.logout'];

    public function handle(Request $request, Closure $next, string $role = 'viewer'): Response
    {
        $admin = $request->user();
        if (! $admin instanceof Admin) {
            throw ApiException::of(ErrorCode::Unauthenticated);
        }
        if ($admin->isDisabled()) {
            $token = $admin->currentAccessToken();
            if ($token instanceof PersonalAccessToken) {
                $token->delete();
            }

            throw ApiException::of(ErrorCode::Unauthenticated);
        }
        if ($admin->must_change_password && ! $request->routeIs(...self::BEFORE_PASSWORD_CHANGE)) {
            throw new ApiException(ErrorCode::Forbidden, 'Önce şifreni değiştir.');
        }
        if (! $admin->hasRole(AdminRole::from($role))) {
            throw ApiException::of(ErrorCode::Forbidden);
        }

        return $next($request);
    }
}
