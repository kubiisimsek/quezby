<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AnalyticsRequest;
use App\Services\Admin\AdminAnalytics;
use Illuminate\Http\JsonResponse;

/** `GET /admin/analytics` — how the game is used, over 30 or 90 days. */
class AnalyticsController extends Controller
{
    public function __invoke(AnalyticsRequest $request, AdminAnalytics $analytics): JsonResponse
    {
        return response()->json($analytics->build($request->days()));
    }
}
