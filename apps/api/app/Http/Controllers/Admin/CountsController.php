<?php

namespace App\Http\Controllers\Admin;

use App\Enums\RunStatus;
use App\Http\Controllers\Controller;
use App\Models\Run;
use App\Services\Admin\AdminReports;
use Illuminate\Http\JsonResponse;

/** `GET /admin/counts` — what the panel's sidebar badges count: held runs, and players with a report open. */
class CountsController extends Controller
{
    public function __invoke(AdminReports $reports): JsonResponse
    {
        return response()->json([
            'review' => Run::query()->where('status', RunStatus::Review)->count(),
            'reports' => $reports->openPlayers(),
        ]);
    }
}
