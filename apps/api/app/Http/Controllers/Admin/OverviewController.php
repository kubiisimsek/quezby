<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Admin\Overview;
use Illuminate\Http\JsonResponse;

/** `GET /admin/overview` — the panel's front page. */
class OverviewController extends Controller
{
    public function __invoke(Overview $overview): JsonResponse
    {
        return response()->json($overview->build());
    }
}
