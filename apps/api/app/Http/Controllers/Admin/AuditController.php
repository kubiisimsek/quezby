<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AdminRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AuditRequest;
use App\Models\Admin;
use App\Models\AuditEntry;
use App\Services\Admin\AuditLog;
use App\Services\Admin\Paginated;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;

/** `GET /admin/audit` — the audit log, newest first. Only an owner sees where each action came from. */
class AuditController extends Controller
{
    public function __invoke(AuditRequest $request, AuditLog $audit, #[CurrentUser('admin')] Admin $admin): JsonResponse
    {
        $filters = $request->validated();
        $page = AuditEntry::query()
            ->when($filters['action'] ?? null, fn ($query, $action) => $query->where('action', $action))
            ->when($filters['via'] ?? null, fn ($query, $via) => $query->where('via', $via))
            ->when($filters['admin'] ?? null, fn ($query, $id) => $query->where('admin_id', strtolower($id)))
            ->when($filters['subjectType'] ?? null, fn ($query, $type) => $query->where('subject_type', $type))
            ->when($filters['subjectId'] ?? null, fn ($query, $id) => $query->where('subject_id', strtolower($id)))
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($request->perPage(), ['*'], 'page', $request->page());

        $withIp = $admin->hasRole(AdminRole::Owner);

        return response()->json(Paginated::of($page, fn (AuditEntry $entry) => $audit->present($entry, $withIp)));
    }
}
