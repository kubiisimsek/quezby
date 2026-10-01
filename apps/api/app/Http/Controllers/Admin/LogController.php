<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\LogsRequest;
use App\Http\Requests\Admin\LogSummaryRequest;
use App\Services\Admin\AdminLogs;
use Illuminate\Http\JsonResponse;

/** The Loglar page: failed outside calls, API errors, pushes and the phones' errors. */
class LogController extends Controller
{
    /** `GET /admin/logs` — the rows, newest first, a page at a time. */
    public function index(LogsRequest $request, AdminLogs $logs): JsonResponse
    {
        return response()->json($logs->list($request->validated(), $request->page(), $request->perPage()));
    }

    /** `GET /admin/logs/summary` — how many, by day or by month, kept for good. */
    public function summary(LogSummaryRequest $request, AdminLogs $logs): JsonResponse
    {
        return response()->json($logs->summary($request->range()));
    }
}
