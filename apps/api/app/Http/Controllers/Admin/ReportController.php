<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReportsRequest;
use App\Services\Admin\AdminReports;
use Illuminate\Http\JsonResponse;

/** `GET /admin/reports` — what players reported, a row per reported player. */
class ReportController extends Controller
{
    public function index(ReportsRequest $request, AdminReports $reports): JsonResponse
    {
        return response()->json($reports->list($request->status(), $request->page(), $request->perPage()));
    }
}
