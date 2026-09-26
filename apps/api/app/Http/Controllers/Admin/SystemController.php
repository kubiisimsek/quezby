<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AuditAction;
use App\Enums\ErrorCode;
use App\Exceptions\ApiException;
use App\Exceptions\ErrorResponse;
use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Services\Admin\AuditLog;
use App\Services\Admin\SystemStatus;
use App\Services\OpsChores;
use App\Support\Actor;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

/**
 * `/admin/system` — what the API runs with, for owners, and the chores a
 * host without SSH needs: run the new migrations, rebuild the caches, close
 * runs left open, prune old analytics. Each one is on record with what it printed.
 */
class SystemController extends Controller
{
    public function show(SystemStatus $status): JsonResponse
    {
        return response()->json($status->read());
    }

    public function run(Request $request, string $action, OpsChores $chores, AuditLog $audit, #[CurrentUser('admin')] Admin $owner): JsonResponse
    {
        [$chore, $record] = match ($action) {
            'migrate' => [fn () => $chores->migrate(), AuditAction::SystemMigrate],
            'optimize' => [fn () => $chores->optimize(), AuditAction::SystemOptimize],
            'expire-runs' => [fn () => $chores->expireRuns(), AuditAction::SystemExpireRuns],
            'analytics-prune' => [fn () => $chores->pruneAnalytics(), AuditAction::SystemAnalyticsPrune],
            default => throw ApiException::of(ErrorCode::NotFound),
        };
        $actor = Actor::panel($owner, $request);

        try {
            $output = $chore();
        } catch (RuntimeException $e) {
            $audit->record($actor, $record, details: ['ok' => false, 'output' => mb_substr($e->getMessage(), 0, 2000)]);

            return ErrorResponse::make(ErrorCode::ServerError, $e->getMessage());
        }

        $audit->record($actor, $record, details: ['ok' => true, 'output' => mb_substr($output, 0, 2000)]);

        return response()->json(['output' => $output]);
    }
}
