<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CalibrationRequest;
use App\Services\Admin\AdminRatings;
use App\Services\Rating\RatingCalibration;
use Illuminate\Http\JsonResponse;

/** `GET /admin/ratings` and `/admin/ratings/calibration` — the leagues by rating, and how the targets fit. */
class RatingController extends Controller
{
    public function index(AdminRatings $ratings): JsonResponse
    {
        return response()->json($ratings->overview());
    }

    public function calibration(CalibrationRequest $request, RatingCalibration $calibration): JsonResponse
    {
        return response()->json($calibration->report($request->days()));
    }
}
